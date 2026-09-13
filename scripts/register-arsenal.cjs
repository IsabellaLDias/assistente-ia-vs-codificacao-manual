// Register this checkout using A.R.S.E.N.A.L's own validation and persistence.
const path = require('node:path');
const fs = require('node:fs');
const [arsenalSource, configPath, controlPlusEnvPath] = process.argv.slice(2);
if (!arsenalSource || !configPath || !controlPlusEnvPath) throw new Error('Informe a pasta do A.R.S.E.N.A.L, arsenal.json e o .env do ControlPlus. Feche o painel antes de executar.');
function readEnv(file) {
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
    const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
  }));
}
const controlPlus = readEnv(path.resolve(controlPlusEnvPath));
if (!controlPlus.DB_URL || !controlPlus.DB_USERNAME || !controlPlus.DB_PASSWORD) throw new Error('O .env do ControlPlus não possui as credenciais PostgreSQL necessárias.');
const databaseUrl = new URL(controlPlus.DB_URL.replace(/^jdbc:/, ''));
databaseUrl.username = controlPlus.DB_USERNAME;
databaseUrl.password = controlPlus.DB_PASSWORD;
const { ConfigStore } = require(path.join(path.resolve(arsenalSource), 'electron/store.cjs'));
const store = new ConfigStore(path.resolve(configPath));
const previous = store.getSnapshot().apps.find(app => app.slug === 'lab02');
const cwd = path.resolve(__dirname, '..');
if (previous && previous.cwd !== cwd) throw new Error('A rota lab02 já pertence a outro diretório.');
if (fs.existsSync(configPath)) fs.copyFileSync(configPath, `${configPath}.lab02-${Date.now()}.bak`, fs.constants.COPYFILE_EXCL);
const saved = store.saveApp({
  ...previous,
  name: 'LAB02 · IA vs. codificação manual',
  description: 'Cronômetro de trials e análise de métricas Java: LOC, complexidade e duplicação.',
  slug: 'lab02', cwd, command: 'npm start', port: previous?.port || 4115,
  pathMode: 'keep', autoStart: true, visibleInHub: true,
  env: {...previous?.env, HOST: '127.0.0.1', LAB_PUBLIC_ORIGIN: new URL(store.getSnapshot().settings.publicUrl).origin, LAB_DATABASE_URL: databaseUrl.toString()},
});
console.log(`LAB02 cadastrado em ${store.getSnapshot().settings.publicUrl}/lab02/ (porta ${saved.port}); PostgreSQL configurado. Backup preservado.`);
