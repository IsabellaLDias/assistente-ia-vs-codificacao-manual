import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer, validatePayload } from './server.mjs';
import { validateTrial } from './database.mjs';

const sample = { participant:'fixture_web', kata:'validacao', treatment:'COM_IA', files:[{name:'A.java', content:'public class A {}'}] };
test('A.R.S.E.N.A.L: base path, proxy authentication and public origin', async t => {
  const server = createServer({basePath:'/lab02', proxyToken:'test-proxy', publicOrigin:'https://arsenal.dev.br'});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => {server.closeAllConnections();server.close(resolve);}));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = {'x-arsenal-proxy-token':'test-proxy', Origin:'https://arsenal.dev.br'};
  assert.equal((await fetch(`${base}/lab02/`)).status,403);
  const redirect = await fetch(`${base}/lab02`, {headers, redirect:'manual'});
  assert.equal(redirect.status,308);
  assert.equal(redirect.headers.get('location'),'/lab02/');
  const home = await fetch(`${base}/lab02/`, {headers});
  assert.equal(home.status,200);
  const policy = home.headers.get('content-security-policy');
  assert.match(policy, /script-src 'self' https:\/\/static\.cloudflareinsights\.com;/);
  assert.match(policy, /connect-src 'self' https:\/\/cloudflareinsights\.com;/);
  assert.match(policy, /style-src 'self';/);
  const timer = await fetch(`${base}/lab02/cronometro/`, {headers});
  assert.doesNotMatch(await timer.text(), /\sstyle\s*=/i);
  assert.match(await home.text(), /src="\/lab02\/metricas\/"/);
  for (const route of ['metricas/', 'cronometro/', 'shell.js', 'app.js', 'api/config']) {
    assert.equal((await fetch(`${base}/lab02/${route}`, {headers})).status,200,route);
  }
  assert.equal((await fetch(`${base}/lab02/api/config`, {headers:{...headers,Origin:'https://evil.example'}})).status,403);
  const {token} = await (await fetch(`${base}/lab02/api/config`, {headers})).json();
  const invalid = await fetch(`${base}/lab02/api/analyze`, {method:'POST', headers:{...headers,'Content-Type':'application/json','X-Lab-Token':token},body:'{}'});
  assert.equal(invalid.status,400);
});
test('upload validation accepts Java, rejects paths, duplicates, oversized files and shell metadata', () => {
  assert.equal(validatePayload(sample).files.length, 1);
  for (const bad of [
    {...sample,participant:'$(whoami)'}, {...sample,treatment:'OTHER'}, {...sample,files:[]},
    {...sample,files:[{name:'../A.java',content:'a'}]}, {...sample,files:[{name:'CON.java',content:'a'}]},
    {...sample,files:[sample.files[0],sample.files[0]]},
    {...sample,files:[{name:'A.java',content:'a'.repeat(100001)}]},
    {...sample,files:[{name:'A.java',content:'// CPD-OFF'}]},
  ]) assert.throws(()=>validatePayload(bad));
});

test('trial validation accepts an experimental result and rejects malformed data', () => {
  const trial = {participant:'Leandro', kata:'kata01', treatment:'COM_IA', elapsedTime:'12:34', startedAt:'2026-09-13T10:00:00.000Z', endedAt:'2026-09-13T10:12:34.000Z', timedOut:false, notes:'Testes aprovados'};
  assert.equal(validateTrial(trial).elapsedSeconds, 754);
  assert.equal(validateTrial({...trial, sourceFiles:[{name:'Solucao.java',content:'public class Solucao {}'}]}).sourceFiles.length, 1);
  assert.equal(validateTrial({...trial, sourceFiles:[{name:'texto-do-trial.txt',content:'Testes do trial'}]}).sourceFiles.length, 1);
  assert.throws(() => validateTrial({...trial, sourceFiles:Array.from({length:21}, (_, i) => ({name:`texto-${i}.txt`,content:'texto'}))}));
  assert.throws(() => validateTrial({...trial, elapsedTime:'36:00'}));
  assert.throws(() => validateTrial({...trial, treatment:'true'}));
  assert.throws(() => validateTrial({...trial, sourceFiles:[{name:'../Solucao.java',content:'class X {}'}]}));
});

test('HTTP: saves, edits and lists timer trials through the configured database', async t => {
  const stored = []; const database = {enabled:true, async listTrials(){return stored;}, async getTrial(id){return stored.find(row=>row.id===id) ?? null;}, async saveTrial(id, trial){const value={id, participant:trial.participant, kata:trial.kata, treatment:trial.treatment, elapsed_seconds:trial.elapsedSeconds, timed_out:trial.timedOut, notes:trial.notes, started_at:trial.startedAt, ended_at:trial.endedAt, source_files:trial.sourceFiles};stored.unshift(value);return value;}, async updateTrial(id, trial){const value=stored.find(row=>row.id===id);if(!value)throw new Error('Trial não encontrado.');Object.assign(value,{participant:trial.participant,kata:trial.kata,treatment:trial.treatment,elapsed_seconds:trial.elapsedSeconds,timed_out:trial.timedOut,notes:trial.notes});return value;}};
  const server = createServer({database});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const base = `http://127.0.0.1:${server.address().port}`;
  const trial = {participant:'Leandro', kata:'kata01', treatment:'SEM_IA', elapsedTime:'01:05', startedAt:'2026-09-13T10:00:00.000Z', endedAt:'2026-09-13T10:01:05.000Z', timedOut:false, notes:'ok', sourceFiles:[{name:'Solucao.java',content:'public class Solucao {}'}]};
  const created = await fetch(`${base}/api/trials`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(trial)});
  assert.equal(created.status,201);const createdTrial=(await created.json()).trial;assert.equal(createdTrial.elapsed_seconds,65);
  const textFiles = [{name:'texto-do-trial.txt',content:'Solução digitada no textarea'}];
  const textResult = await fetch(`${base}/api/trials`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...trial,sourceFiles:textFiles})});
  assert.equal(textResult.status,201);
  assert.deepEqual((await textResult.json()).trial.source_files,textFiles);
  const updated = await fetch(`${base}/api/trials/${createdTrial.id}`, {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...trial,kata:'kata02',elapsedTime:'02:00',endedAt:'2026-09-13T10:02:00.000Z',notes:'corrigido'})});
  assert.equal(updated.status,200);assert.equal((await updated.json()).trial.elapsed_seconds,120);
  const pdf = await fetch(`${base}/api/trials/${createdTrial.id}/report.pdf`); assert.equal(pdf.status,200); assert.equal(pdf.headers.get('content-type'),'application/pdf'); assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,4).toString(), '%PDF');
  const list = await fetch(`${base}/api/trials`); assert.equal(list.status,200);assert.equal((await list.json()).trials.length,2);
});

test('HTTP: real analysis, downloads, invalid compilation and origin protections', {timeout:90000}, async t => {
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const base=`http://127.0.0.1:${server.address().port}`;
  const home = await fetch(base);
  assert.equal(home.status,200);
  assert.match(await home.text(), /href="#cronometro"/);
  for (const route of ['/shell.js', '/shell.css', '/metricas/', '/cronometro/', '/cronometro/script.js', '/cronometro/style.css']) {
    const page = await fetch(`${base}${route}`);
    assert.equal(page.status, 200, route);
    assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'self'/);
  }
  assert.equal((await fetch(`${base}/cronometro/missing.js`)).status, 404);
  const {token,ready}=await (await fetch(`${base}/api/config`)).json();
  assert.equal(ready,true,'Run setup-metrics.ps1 before integration tests');
  const headers={'Content-Type':'application/json','X-Lab-Token':token};
  assert.equal((await fetch(`${base}/api/analyze`,{method:'POST',body:JSON.stringify(sample),headers:{'Content-Type':'application/json'}})).status,403);
  assert.equal((await fetch(`${base}/api/analyze`,{method:'POST',body:JSON.stringify(sample),headers:{...headers,Origin:'https://example.com'}})).status,403);
  const content=await readFile(new URL('../examples/metrics-fixture/src/main/java/br/ufc/lab02/MetricsFixture.java',import.meta.url),'utf8');
  const response=await fetch(`${base}/api/analyze`,{method:'POST',headers,body:JSON.stringify({...sample,files:[{name:'MetricsFixture.java',content}]})});
  const result=await response.json();
  assert.equal(response.status,200,JSON.stringify(result));
  assert.equal(result.metrics.ck_method_count,3);
  assert.equal(Number(result.metrics.ck_wmc_sum),11);
  assert.equal(result.metrics.loc_physical,49);
  assert.equal(result.metrics.cpd_duplication_groups,1);
  assert.equal(result.methods.length,3);
  const csv=await fetch(`${base}/api/jobs/${result.id}/metrics.csv`);
  assert.equal(csv.status,200);assert.match(await csv.text(),/ck_wmc_mean/);
  const broken=await fetch(`${base}/api/analyze`,{method:'POST',headers,body:JSON.stringify({...sample,files:[{name:'A.java',content:'public class A { invalid !!! }'}]})});
  const error=await broken.json();
  assert.equal(broken.status,422);assert.match(error.error,/compilam/);
  assert.equal((await fetch(`${base}/api/jobs/${error.id}/metrics.csv`)).status,404);
  assert.equal((await fetch(`${base}/api/jobs/${error.id}/execution.log`)).status,200);
});
