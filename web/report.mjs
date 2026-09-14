import PDFDocument from 'pdfkit';

const time = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const plain = value => String(value ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim();

export function createTrialPdf(trial) {
  const document = new PDFDocument({size:'A4', margins:{top:54, right:54, bottom:80, left:54}, bufferPages:true, info:{Title:`LAB02 - ${plain(trial.kata)}`, Author:'LAB02'}});
  const chunks = []; document.on('data', chunk => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {document.on('end', () => resolve(Buffer.concat(chunks))); document.on('error', reject);});
  document.fillColor('#4f46e5').fontSize(11).text('LAB02 - EXPERIMENTACAO DE SOFTWARE');
  document.fillColor('#1e293b').fontSize(24).text('Relatorio do trial', {paragraphGap:16});
  document.strokeColor('#cbd5e1').moveTo(54, document.y).lineTo(541, document.y).stroke(); document.moveDown();
  const fields = [['Participante', trial.participant], ['Kata', trial.kata], ['Tratamento', trial.treatment === 'COM_IA' ? 'Com assistente de IA' : 'Sem assistente de IA'], ['Tempo final', time(trial.elapsed_seconds)], ['Tempo esgotado', trial.timed_out ? 'Sim' : 'Nao'], ['Inicio', new Date(trial.started_at).toLocaleString('pt-BR')], ['Fim', new Date(trial.ended_at).toLocaleString('pt-BR')]];
  for (const [label, value] of fields) { document.fillColor('#64748b').fontSize(9).text(label.toUpperCase()); document.fillColor('#1e293b').fontSize(12).text(plain(value), {paragraphGap:10}); }
  document.moveDown(0.5).fillColor('#64748b').fontSize(9).text('RESULTADO E OBSERVACOES'); document.fillColor('#1e293b').fontSize(11).text(plain(trial.notes) || 'Nao informado.', {paragraphGap:14});
  const files = Array.isArray(trial.source_files) ? trial.source_files : [];
  document.fillColor('#64748b').fontSize(9).text('ARQUIVOS ANEXADOS'); document.fillColor('#1e293b').fontSize(11).text(files.length ? `${files.length} arquivo(s) de codigo ou texto anexado(s) ao trial.` : 'Nenhum arquivo de codigo ou texto foi anexado.', {paragraphGap:7});
  for (const file of files) { const lines = String(file.content || '').split(/\r?\n/).length; document.fontSize(10).text(`- ${plain(file.name)} (${lines} linhas)`); }
  for (const file of files) {
    document.addPage();
    document.font('Helvetica-Bold').fillColor('#4f46e5').fontSize(14).text(plain(file.name));
    document.moveDown().font('Courier').fillColor('#1e293b').fontSize(9);
    // Code is plain PDF text, not HTML: preserve comparison operators and whitespace.
    const content = String(file.content ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
    document.text(content, {lineGap:2});
  }
  const pages = document.bufferedPageRange();
  for (let index = pages.start; index < pages.start + pages.count; index++) {
    document.switchToPage(index);
    const bottomMargin = document.page.margins.bottom;
    document.page.margins.bottom = 0;
    document.font('Helvetica').fillColor('#64748b').fontSize(8)
      .text(`Pagina ${index + 1} de ${pages.count}`, 54, 766, {align:'center', width:487, lineBreak:false})
      .text(`Registro ${trial.id}`, 54, 780, {align:'center', width:487, lineBreak:false});
    document.page.margins.bottom = bottomMargin;
  }
  document.end(); return done;
}
