import http from 'node:http';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'web/public');
const jobs = path.join(root, 'data/web-jobs');
const MAX_BODY = 1024 * 1024;
const token = randomBytes(24).toString('hex');
let busy = false;
const decode = text => JSON.parse(text.replace(/^\uFEFF/, ''));
const exists = p => access(p).then(() => true, () => false);

export function validatePayload(data) {
  if (!data || typeof data !== 'object') throw new Error('Envie os dados da análise.');
  for (const key of ['participant', 'kata']) {
    if (typeof data[key] !== 'string' || !/^[\p{L}\p{N} _-]{1,60}$/u.test(data[key]) || !data[key].trim()) {
      throw new Error('Participante e kata devem ter até 60 letras, números, espaços, hífens ou sublinhados.');
    }
  }
  if (!['COM_IA', 'SEM_IA'].includes(data.treatment)) throw new Error('Selecione o tratamento.');
  if (!Array.isArray(data.files) || !data.files.length || data.files.length > 20) throw new Error('Envie de 1 a 20 arquivos Java.');
  const names = new Set();
  for (const f of data.files) {
    if (!f || typeof f.name !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]*\.java$/.test(f.name)) throw new Error('Use nomes Java válidos, sem pastas, como MinhaClasse.java.');
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])\.java$/i.test(f.name)) throw new Error('Esse nome de arquivo é reservado pelo Windows.');
    if (names.has(f.name.toLowerCase())) throw new Error('Há nomes de arquivos repetidos.');
    names.add(f.name.toLowerCase());
    if (typeof f.content !== 'string' || !f.content.trim() || Buffer.byteLength(f.content) > 100000 || f.content.includes('\0')) throw new Error('Cada arquivo deve conter código UTF-8 e ter no máximo 100 KB.');
    if (/CPD-(?:OFF|ON|START|END)/.test(f.content)) throw new Error('Remova as marcações de supressão CPD dos fontes antes do experimento.');
  }
  return {participant:data.participant.trim(), kata:data.kata.trim(), treatment:data.treatment, files:data.files};
}

async function body(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('O envio excede 1 MB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function run(directory) {
  return new Promise((resolve, reject) => {
    const env = {...process.env};
    // PowerShell 7's inherited module path can hide Windows PowerShell cmdlets.
    for (const key of Object.keys(env)) if (key.toLowerCase() === 'psmodulepath') delete env[key];
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'web/run-analysis.ps1'), '-JobDirectory', directory], {cwd:root, windowsHide:true, shell:false, env});
    let output = ''; let timedOut = false;
    const capture = chunk => { output = (output + chunk.toString()).slice(-50000); };
    child.stdout.on('data', capture); child.stderr.on('data', capture);
    const timer = setTimeout(() => {
      timedOut = true;
      // Terminate only this analysis process and its compiler/analyzer children.
      const stop = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {windowsHide:true, shell:false});
      stop.on('error', () => child.kill());
    }, 90000);
    child.on('error', error => {clearTimeout(timer); reject(error);});
    child.on('close', async code => {
      clearTimeout(timer);
      try {
        await writeFile(path.join(directory, 'execution.log'), output);
        if (timedOut) throw new Error('A análise excedeu 90 segundos. Os registros foram preservados.');
        if (code !== 0) {
          const error = await readFile(path.join(directory, 'error.json'), 'utf8').then(decode).catch(() => null);
          throw new Error(error?.error || 'A análise falhou. Verifique se Java e as ferramentas estão instalados.');
        }
        resolve(decode(await readFile(path.join(directory, 'result.json'), 'utf8')));
      } catch (error) { reject(error); }
    });
  });
}

export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const json = (status, value) => {res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(value));};
    try {
      const expectedHost = `127.0.0.1:${req.socket.localPort}`;
      if (req.headers.host !== expectedHost && req.headers.host !== `localhost:${req.socket.localPort}`) return json(403, {error:'Host não permitido.'});
      const origin = req.headers.origin;
      if (origin && origin !== `http://${req.headers.host}`) return json(403, {error:'Origem não permitida.'});
      const url = new URL(req.url, `http://${expectedHost}`);
      if (req.method === 'GET' && url.pathname === '/api/config') {
        const ready = (await Promise.all([exists(path.join(root,'tools/ck/ck-0.7.0-jar-with-dependencies.jar')), exists(path.join(root,'tools/pmd/pmd-bin-7.26.0/bin/pmd.bat'))])).every(Boolean);
        return json(200, {token, ready});
      }
      if (req.method === 'GET' && url.pathname === '/api/example') {
        return json(200, {name:'MetricsFixture.java', content:await readFile(path.join(root,'examples/metrics-fixture/src/main/java/br/ufc/lab02/MetricsFixture.java'),'utf8')});
      }
      if (req.method === 'POST' && url.pathname === '/api/analyze') {
        if (req.headers['x-lab-token'] !== token) return json(403, {error:'Atualize a página e tente novamente.'});
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415, {error:'Envie JSON.'});
        if (busy) return json(409, {error:'Há uma análise em andamento. Aguarde a conclusão.'});
        let payload;
        try {payload=validatePayload(await body(req));} catch(error) {return json(400, {error:error.message});}
        // Recheck after the asynchronous request body to serialize all analyses.
        if (busy) return json(409, {error:'Há uma análise em andamento. Tente novamente em instantes.'});
        busy = true;
        const id = randomUUID(); const directory = path.join(jobs,id);
        try {
          await mkdir(path.join(directory,'source'), {recursive:true});
          await writeFile(path.join(directory,'request.json'), JSON.stringify(payload));
          for (const f of payload.files) await writeFile(path.join(directory,'source',f.name), f.content, 'utf8');
          const result = await run(directory);
          return json(200, {id, ...result});
        } catch (error) {return json(422, {id, error:error.message});}
        finally {busy=false;}
      }
      const download = /^\/api\/jobs\/([a-f0-9-]{36})\/(metrics\.csv|result\.json|execution\.log)$/.exec(url.pathname);
      if (req.method === 'GET' && download) {
        const file = path.join(jobs,download[1],download[2]);
        if (!await exists(file)) return json(404, {error:'Arquivo não encontrado.'});
        res.writeHead(200, {'Content-Type':download[2].endsWith('.csv')?'text/csv; charset=utf-8':'text/plain; charset=utf-8', 'Content-Disposition':`attachment; filename="${download[2]}"`});
        return res.end(await readFile(file));
      }
      const staticFiles = {'/':['index.html','text/html'], '/app.js':['app.js','text/javascript'], '/style.css':['style.css','text/css']};
      if (req.method === 'GET' && staticFiles[url.pathname]) {
        const [file,type] = staticFiles[url.pathname];
        res.writeHead(200, {'Content-Type':`${type}; charset=utf-8`}); return res.end(await readFile(path.join(assets,file)));
      }
      json(404, {error:'Página não encontrada.'});
    } catch (error) {if (!res.headersSent) json(500, {error:'Não foi possível concluir a solicitação.'}); else res.end();}
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3010);
  const server = createServer();
  server.on('error', error => {console.error(`Não foi possível abrir o app: ${error.message}`); process.exitCode=1;});
  server.listen(port, '127.0.0.1', () => console.log(`LAB02 · http://127.0.0.1:${port}`));
}
