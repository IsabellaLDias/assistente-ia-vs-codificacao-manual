import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer, validatePayload } from './server.mjs';

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
