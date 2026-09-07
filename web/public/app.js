const $ = id => document.getElementById(id);
let files = []; let config; let running = false; let latestResult = null;
const format = value => value === null || value === '' || value === undefined ? '—' : Number(value).toLocaleString('pt-BR', {maximumFractionDigits:2});
function notice(message, loading=false) { $('notice').textContent=message; $('notice').hidden=!message; $('notice').className=loading?'notice loading':'notice'; }
function refreshFiles() {
  $('file-list').replaceChildren();
  files.forEach((file,index) => {const li=document.createElement('li'); const name=document.createElement('span'); name.textContent=file.name; const remove=document.createElement('button'); remove.type='button'; remove.textContent='×'; remove.setAttribute('aria-label',`Remover ${file.name}`); remove.addEventListener('click',()=>{files.splice(index,1);refreshFiles();}); li.append(name,remove);$('file-list').append(li);});
  $('file-count').textContent=files.length?`${files.length} arquivo${files.length>1?'s':''} selecionado${files.length>1?'s':''}`:'Nenhum arquivo selecionado';
  $('analyze').disabled=!files.length || !config?.ready || running;
}
async function addFiles(selection) {
  if (running) return;
  const incoming=Array.from(selection);
  if (files.length+incoming.length>20) return notice('Envie no máximo 20 arquivos por análise.');
  try {
    const added=[];
    for (const f of incoming) {
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*\.java$/.test(f.name) || f.size>100000) throw new Error('Selecione arquivos .java com nomes válidos e até 100 KB cada.');
      if ([...files,...added].some(existing=>existing.name.toLowerCase()===f.name.toLowerCase())) throw new Error(`O arquivo ${f.name} já foi adicionado.`);
      const content=new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer());
      added.push({name:f.name,content});
    }
    files.push(...added);notice('');refreshFiles();
  } catch(error) {notice(error.message);}
  $('files').value='';
}
$('files').addEventListener('change',e=>addFiles(e.target.files));
for (const name of ['dragover','dragleave','drop']) $('drop-zone').addEventListener(name,event=>{event.preventDefault();$('drop-zone').classList.toggle('dragover',name==='dragover');if(name==='drop')addFiles(event.dataTransfer.files);});
$('example').addEventListener('click',async()=>{try{const response=await fetch('/api/example');if(!response.ok)throw new Error('Exemplo indisponível.');files=[await response.json()];$('participant').value='Demo';$('kata').value='validacao';notice('Exemplo com duplicação intencional para validar as ferramentas. Não é um trial oficial.');refreshFiles();}catch(e){notice(e.message);}});

function showResult(result) {
  latestResult = result;
  const m=result.metrics;
  $('loc').textContent=format(m.loc_physical);$('complexity').textContent=format(m.ck_wmc_mean);$('duplication').textContent=format(m.cpd_duplication_pct_physical)+'%';
  $('result-status').textContent='Análise concluída';$('result-status').className='status-tag success';
  $('summary').textContent=`${m.participante} · ${m.kata} · ${m.tratamento==='COM_IA'?'Com IA':'Sem IA'} — ${m.source_java_files} arquivo(s), ${m.cpd_duplicated_lines_unique} linhas em trechos duplicados.`;
  $('download-csv').href=`/api/jobs/${result.id}/metrics.csv`;$('download-json').href=`/api/jobs/${result.id}/result.json`;
  $('empty-result').hidden=true;$('result-content').hidden=false;$('method-count').textContent=`${m.ck_method_count} métodos`;
  $('method-rows').replaceChildren();
  for (const method of result.methods) {
    const row=document.createElement('tr');const name=document.createElement('td');name.textContent=method.metodo;const cls=document.createElement('small');cls.textContent=method.classe;name.append(cls);const cc=document.createElement('td');cc.textContent=format(method.complexidade);const loc=document.createElement('td');loc.textContent=format(method.loc);row.append(name,cc,loc);$('method-rows').append(row);
  }
  if (!result.methods.length) {const row=document.createElement('tr');const cell=document.createElement('td');cell.colSpan=3;cell.textContent='Nenhum método elegível. Complexidade média indisponível.';row.append(cell);$('method-rows').append(row);}
}
$('analysis-form').addEventListener('submit',async event=>{
  event.preventDefault();if(running||!files.length)return;
  const treatment=new FormData(event.currentTarget).get('treatment');
  running=true;$('inputs').disabled=true;$('result-content').hidden=true;$('empty-result').hidden=false;
  latestResult=null;
  for(const id of ['loc','complexity','duplication'])$(id).textContent='—';
  $('result-status').textContent='Analisando…';$('result-status').className='status-tag';$('analyze').textContent='Analisando…';notice('Verificando os fontes e calculando as métricas. Aguarde alguns segundos.',true);
  try {
    const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json','X-Lab-Token':config.token},body:JSON.stringify({participant:$('participant').value,kata:$('kata').value,treatment,files})});
    const result=await response.json();
    if(!response.ok){notice(result.error||'A análise não foi concluída.');if(result.id){const link=document.createElement('a');link.href=`/api/jobs/${result.id}/execution.log`;link.textContent='Baixar registro da execução';$('notice').append(link);}$('result-status').textContent='Análise não concluída';return;}
    showResult(result);notice('');
  } catch(error){notice('Não foi possível conectar ao app. Verifique se o servidor está aberto.');$('result-status').textContent='Falha de conexão';}
  finally {running=false;$('inputs').disabled=false;$('analyze').textContent='Analisar código →';refreshFiles();}
});
fetch('/api/config').then(async response=>{if(!response.ok)throw new Error();config=await response.json();$('connection').textContent=config.ready?'Ambiente pronto':'Ambiente incompleto';$('connection').classList.toggle('ready',config.ready);if(!config.ready)notice('Prepare as ferramentas executando scripts/setup-metrics.ps1 na pasta do projeto.');refreshFiles();}).catch(()=>{$('connection').textContent='Sem conexão';notice('Não foi possível verificar o ambiente. Atualize a página.');});

// Optional browser agent access to the same result currently visible on screen.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({
      name:'read_static_analysis',
      description:'Read the completed Java static-analysis result currently displayed, including the CSV download path. Does not start an analysis.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:true},
      execute(input) {
        if (input && Object.keys(input).length) throw new Error('This tool takes no parameters.');
        return latestResult ? {metrics:latestResult.metrics,methods:latestResult.methods,csv:`/api/jobs/${latestResult.id}/metrics.csv`} : {status:running?'running':'no_result'};
      }
    },{signal:lifecycle.signal})).catch(()=>{});
  } catch {}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
