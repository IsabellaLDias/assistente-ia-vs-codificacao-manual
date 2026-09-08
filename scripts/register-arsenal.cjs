// Register this checkout using A.R.S.E.N.A.L's own validation and persistence.
const path = require('node:path');
const fs = require('node:fs');
const [arsenalSource, configPath] = process.argv.slice(2);
if (!arsenalSource || !configPath) throw new Error('Informe a pasta do A.R.S.E.N.A.L e o caminho de arsenal.json. Feche o painel antes de executar.');
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
  env: {...previous?.env, LAB_PUBLIC_ORIGIN: new URL(store.getSnapshot().settings.publicUrl).origin},
});
console.log(`LAB02 cadastrado em ${store.getSnapshot().settings.publicUrl}/lab02/ (porta ${saved.port}). Backup preservado.`);
