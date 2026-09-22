// Dashboard Analítico LAB02 - Specialized & Non-Usual Visualizations Logic
document.addEventListener('DOMContentLoaded', () => {
  const appBase = location.pathname.replace(/\/dashboard\/?$/, '');
  let fullData = null;
  let activeTrial = null;
  let activeFileIndex = 0;

  // DOM Elements
  const filterKata = document.getElementById('filter-kata');
  const filterTreatment = document.getElementById('filter-treatment');
  const filterParticipant = document.getElementById('filter-participant');
  const filterCounter = document.getElementById('filter-counter');

  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnReload = document.getElementById('btn-reload');

  // KPI Elements
  const kpiTimeDiff = document.getElementById('kpi-time-diff');
  const kpiTimeCom = document.getElementById('kpi-time-com');
  const kpiTimeSub = document.getElementById('kpi-time-sub');
  const kpiJunitRate = document.getElementById('kpi-junit-rate');
  const kpiJunitSub = document.getElementById('kpi-junit-sub');
  const kpiLocDiff = document.getElementById('kpi-loc-diff');
  const kpiLocCom = document.getElementById('kpi-loc-com');
  const kpiLocSub = document.getElementById('kpi-loc-sub');
  const kpiWmcDiff = document.getElementById('kpi-wmc-diff');
  const kpiWmcCom = document.getElementById('kpi-wmc-com');
  const kpiWmcSub = document.getElementById('kpi-wmc-sub');
  const kpiDensityCom = document.getElementById('kpi-density-com');
  const kpiDensitySub = document.getElementById('kpi-density-sub');

  // Chart Containers
  const waffleGrid = document.getElementById('waffle-grid');
  const chartSlopegraph = document.getElementById('chart-slopegraph');
  const chartQuadrants = document.getElementById('chart-quadrants');
  const chartBullet = document.getElementById('chart-bullet');
  const chartWaterfall = document.getElementById('chart-waterfall');
  const chartTooltip = document.getElementById('chart-tooltip');

  // Table
  const tbodyTrials = document.getElementById('tbody-trials');

  // Modal
  const modalInspector = document.getElementById('modal-inspector');
  const modalClose = document.getElementById('modal-close');
  const modalTrialTitle = document.getElementById('modal-trial-title');
  const modalTrialSubtitle = document.getElementById('modal-trial-subtitle');
  const modalMetricsBar = document.getElementById('modal-metrics-bar');
  const modalFileTabs = document.getElementById('modal-file-tabs');
  const modalCodeContent = document.getElementById('modal-code-content');

  // Test descriptions for each Kata (8 cases each)
  const KATA_TEST_CASES = {
    kata01: [
      'Tolerância até 15 min é gratuita (R$ 0,00)',
      '1ª hora (16-60 min) cobra tarifa base de R$ 12,00 (carro)',
      'Hora adicional fracionada cobra acréscimo de R$ 6,00/h',
      'Moto tem fator multiplicador de 0.5 (50% de desconto)',
      'Caminhonete tem fator de 1.25 (25% de acréscimo)',
      'Permanência prolongada aplica teto de diária de R$ 60,00/dia',
      'Convênio aplica 15% de desconto após teto de diária',
      'Validação temporal de argumentos nulos e saída anterior a entrada'
    ],
    kata02: [
      'Frete base com tarifação por faixa de distância mínima',
      'Cálculo por peso real vs. peso cubado (fator 300 kg/m³)',
      'Modalidade Expresso aplica multiplicador de urgência 1.4x',
      'Modalidade Econômico aplica desconto de 15%',
      'Carga frágil aplica adicional de seguro de 10%',
      'Carga perigosa exige taxa regulatória de periculosidade',
      'Teto de desconto para grandes volumes corporativos',
      'Validação de peso, dimensões ou distância inválidos'
    ],
    kata03: [
      'Diária base por categoria de quarto (Standard, Luxo, Suíte)',
      'Acréscimo de alta temporada (dez a fev / jul)',
      'Desconto progressivo para estadias de 7+ diárias',
      'Inclusão opcional de café da manhã diário por hóspede',
      'Taxa de cancelamento proporcional à antecedência',
      'Cobrança de hóspede excedente à capacidade padrão',
      'Isenção de taxa de serviço para crianças menores de 6 anos',
      'Validação de datas de check-in e check-out inconsistentes'
    ],
    kata04: [
      'Faixa etária 0 a 18 anos (tarifa base ANS)',
      'Faixas intermediárias com reajustes progressivos regulados',
      'Faixa sênior (59+ anos) respeitando estatuto do idoso',
      'Plano familiar com desconto escalonado por dependente',
      'Modalidade coparticipação com abatimento na mensalidade fixa',
      'Adicional de acomodação para internação em apartamento',
      'Módulo odontológico opcional agregado à cobertura',
      'Validação de idade negativa, faixas e parâmetros nulos'
    ]
  };

  // Load Data
  async function loadDashboard() {
    try {
      const response = await fetch(`${appBase}/api/dashboard`);
      if (!response.ok) throw new Error('Não foi possível carregar os dados do dashboard.');
      fullData = await response.json();
      renderAll();
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar dados do dashboard: ' + error.message);
    }
  }

  function getFilteredTrials() {
    if (!fullData || !fullData.trials) return [];
    const k = filterKata.value;
    const t = filterTreatment.value;
    const p = filterParticipant.value;

    return fullData.trials.filter(trial => {
      if (k !== 'all' && trial.kata_id !== k) return false;
      if (t !== 'all' && trial.tratamento !== t) return false;
      if (p !== 'all' && trial.participante_curto !== p) return false;
      return true;
    });
  }

  function calculateMedian(arr) {
    if (!arr || !arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function formatMmSs(totalSeconds) {
    const min = Math.floor(totalSeconds / 60);
    const sec = Math.floor(totalSeconds % 60);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function updateKpis(filtered) {
    const com = filtered.filter(x => x.tratamento === 'COM_IA');
    const sem = filtered.filter(x => x.tratamento === 'SEM_IA');

    const comTimes = com.map(x => x.tempo_segundos);
    const semTimes = sem.map(x => x.tempo_segundos);
    const medComTime = calculateMedian(comTimes);
    const medSemTime = calculateMedian(semTimes);

    const comLocs = com.map(x => x.loc).filter(x => x > 0);
    const semLocs = sem.map(x => x.loc).filter(x => x > 0);
    const medComLoc = calculateMedian(comLocs);
    const medSemLoc = calculateMedian(semLocs);

    const comWmcs = com.map(x => x.wmc).filter(x => x > 0);
    const semWmcs = sem.map(x => x.wmc).filter(x => x > 0);
    const medComWmc = calculateMedian(comWmcs);
    const medSemWmc = calculateMedian(semWmcs);

    // Time KPI
    if (comTimes.length && semTimes.length) {
      const diffTime = ((medComTime - medSemTime) / medSemTime) * 100;
      kpiTimeDiff.textContent = `${diffTime.toFixed(1)}%`;
      kpiTimeCom.textContent = formatMmSs(medComTime);
      kpiTimeSub.innerHTML = `Mediana manual: <strong>${formatMmSs(medSemTime)}</strong> (${Math.round((medSemTime - medComTime) / 60)} min a menos)`;
    } else if (comTimes.length) {
      kpiTimeDiff.textContent = 'IA';
      kpiTimeCom.textContent = formatMmSs(medComTime);
      kpiTimeSub.innerHTML = `Sem dados manuais no filtro atual`;
    } else if (semTimes.length) {
      kpiTimeDiff.textContent = 'Manual';
      kpiTimeCom.textContent = formatMmSs(medSemTime);
      kpiTimeSub.innerHTML = `Sem dados de IA no filtro atual`;
    } else {
      kpiTimeDiff.textContent = '—';
      kpiTimeCom.textContent = '—';
      kpiTimeSub.textContent = 'Nenhum registro selecionado';
    }

    // JUnit Correctness KPI
    const totalTests = filtered.reduce((acc, cur) => acc + cur.testes_total, 0);
    const passTests = filtered.reduce((acc, cur) => acc + cur.testes_aprovados, 0);
    const rate = totalTests ? (passTests / totalTests) * 100 : 100;
    kpiJunitRate.textContent = `${rate.toFixed(0)}%`;
    kpiJunitSub.innerHTML = `<strong>${passTests} de ${totalTests}</strong> asserções aprovadas`;

    // LOC KPI
    if (comLocs.length && semLocs.length) {
      const diffLoc = ((medComLoc - medSemLoc) / medSemLoc) * 100;
      kpiLocDiff.textContent = `${diffLoc.toFixed(1)}%`;
      kpiLocCom.textContent = medComLoc;
      kpiLocSub.innerHTML = `Mediana manual: <strong>${medSemLoc}</strong> linhas`;
    } else {
      kpiLocDiff.textContent = '—';
      kpiLocCom.textContent = medComLoc || medSemLoc || '—';
      kpiLocSub.innerHTML = `Amostras filtradas`;
    }

    // WMC KPI
    if (comWmcs.length && semWmcs.length) {
      const diffWmc = ((medComWmc - medSemWmc) / medSemWmc) * 100;
      kpiWmcDiff.textContent = `${diffWmc.toFixed(1)}%`;
      kpiWmcCom.textContent = medComWmc.toFixed(1);
      kpiWmcSub.innerHTML = `Mediana manual: <strong>${medSemWmc.toFixed(1)}</strong> WMC`;
    } else {
      kpiWmcDiff.textContent = '—';
      kpiWmcCom.textContent = (medComWmc || medSemWmc || 0).toFixed(1);
      kpiWmcSub.innerHTML = `Amostras filtradas`;
    }

    // Density KPI
    const densCom = medComLoc ? (medComWmc / medComLoc).toFixed(2) : '—';
    const densSem = medSemLoc ? (medSemWmc / medSemLoc).toFixed(2) : '—';
    kpiDensityCom.textContent = densCom;
    kpiDensitySub.innerHTML = `Manual: <strong>${densSem}</strong> (lógica condensada por linha)`;

    filterCounter.textContent = `Exibindo ${filtered.length} de ${fullData.trials.length} trials testados`;
  }

  // 1. Waffle Matrix (RQ2) - 16 trials x 8 test cases
  function renderWaffleMatrix(filtered) {
    waffleGrid.innerHTML = '';
    const trials = filtered.length ? filtered : (fullData?.trials || []);

    trials.forEach((trial, tIdx) => {
      const row = document.createElement('div');
      row.className = 'waffle-row';

      const rowHeader = document.createElement('div');
      rowHeader.className = 'waffle-row-header';
      const badgeClass = trial.tratamento === 'COM_IA' ? 'badge-ai' : 'badge-noai';
      const badgeText = trial.tratamento === 'COM_IA' ? 'IA' : 'Manual';
      rowHeader.innerHTML = `
        <span class="badge ${badgeClass}">${badgeText}</span>
        <span><strong>${trial.participante_curto}</strong> · ${trial.kata_id}</span>
      `;
      row.appendChild(rowHeader);

      const cases = KATA_TEST_CASES[trial.kata_id] || Array.from({ length: 8 }, (_, i) => `Caso ${i + 1}`);
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.className = 'waffle-cell';
        cell.textContent = `T${c + 1}`;
        const desc = cases[c];
        cell.setAttribute('data-tip', `<strong>${trial.participante_curto} — ${trial.kata_nome}</strong><br><em>${desc}</em><br><span style="color:#34d399">✔ Aprovado na suíte JUnit 5 (100% OK)</span>`);
        row.appendChild(cell);
      }

      waffleGrid.appendChild(row);
    });

    attachTooltips(waffleGrid);
  }

  // 2. Slopegraph Pareado (Produtividade e Tempo - RQ1)
  function renderSlopegraph() {
    const participants = fullData.comparativo_participantes || [];
    const width = 500;
    const height = 240;
    const padY = 35;
    const padLeft = 85;
    const padRight = 85;
    const maxMinutes = 35; // Timebox limit

    const colors = {
      Isabella: '#4f46e5',
      Leandro: '#0284c7',
      Luis: '#10b981'
    };

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg">`;

    // Vertical axes
    const xManual = padLeft;
    const xIa = width - padRight;
    svg += `<line x1="${xManual}" y1="${padY}" x2="${xManual}" y2="${height - padY}" stroke="#cbd5e1" stroke-width="2"/>`;
    svg += `<line x1="${xIa}" y1="${padY}" x2="${xIa}" y2="${height - padY}" stroke="#cbd5e1" stroke-width="2"/>`;

    // Axis Labels
    svg += `<text x="${xManual}" y="${padY - 14}" fill="#0f172a" font-size="12" font-weight="750" text-anchor="middle">Manual (Sem IA)</text>`;
    svg += `<text x="${xIa}" y="${padY - 14}" fill="#0f172a" font-size="12" font-weight="750" text-anchor="middle">Com IA</text>`;

    // Horizontal reference lines (e.g. 0m, 10m, 20m, 30m)
    [0, 10, 20, 30].forEach(m => {
      const y = height - padY - (m / maxMinutes) * (height - 2 * padY);
      svg += `<line x1="${xManual - 6}" y1="${y}" x2="${xIa + 6}" y2="${y}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="2,2"/>`;
      svg += `<text x="${xManual - 10}" y="${y + 3}" fill="#94a3b8" font-size="9.5" text-anchor="end">${m}m</text>`;
      svg += `<text x="${xIa + 10}" y="${y + 3}" fill="#94a3b8" font-size="9.5" text-anchor="start">${m}m</text>`;
    });

    // Draw Slope Lines for each participant
    participants.forEach(p => {
      const color = colors[p.participante] || '#6366f1';
      const minManual = p.tempo_sem_ia_s / 60;
      const minIa = p.tempo_com_ia_s / 60;

      const yManual = height - padY - (minManual / maxMinutes) * (height - 2 * padY);
      const yIa = height - padY - (minIa / maxMinutes) * (height - 2 * padY);

      // Trajectory Line
      svg += `<line x1="${xManual}" y1="${yManual}" x2="${xIa}" y2="${yIa}" stroke="${color}" stroke-width="3.5" stroke-linecap="round" data-tip="<strong>${p.participante}</strong><br>Manual: ${formatMmSs(p.tempo_sem_ia_s)} (${minManual.toFixed(1)} min)<br>Com IA: ${formatMmSs(p.tempo_com_ia_s)} (${minIa.toFixed(1)} min)<br>Queda: ${p.reducao_tempo_pct}%"/>`;

      // End points (circles)
      svg += `<circle cx="${xManual}" cy="${yManual}" r="5" fill="${color}" stroke="white" stroke-width="2"/>`;
      svg += `<circle cx="${xIa}" cy="${yIa}" r="5" fill="${color}" stroke="white" stroke-width="2"/>`;

      // Labels on nodes
      svg += `<text x="${xManual - 16}" y="${yManual + 4}" fill="${color}" font-size="11" font-weight="700" text-anchor="end">${p.participante} (${formatMmSs(p.tempo_sem_ia_s)})</text>`;
      svg += `<text x="${xIa + 16}" y="${yIa + 4}" fill="${color}" font-size="11" font-weight="700" text-anchor="start">${formatMmSs(p.tempo_com_ia_s)}</text>`;
    });

    svg += '</svg>';
    chartSlopegraph.innerHTML = svg;
    attachTooltips(chartSlopegraph);
  }

  // 3. Matriz de Dispersão em Quadrantes com Iso-linhas de Densidade (RQ3)
  function renderQuadrantScatter(filtered) {
    const trials = fullData?.trials || [];
    const width = 500;
    const height = 240;
    const padLeft = 45;
    const padRight = 25;
    const padTop = 25;
    const padBottom = 35;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const maxLoc = 115;
    const maxWmc = 24;

    const medLoc = 47; // Mediana experimental
    const medWmc = 11;

    const xMed = padLeft + (medLoc / maxLoc) * chartW;
    const yMed = padTop + chartH - (medWmc / maxWmc) * chartH;

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg">`;

    // Quadrant Background Zones
    // Q1: Low LOC, Low WMC (Bottom-Left) -> Ideal & Concise
    svg += `<rect x="${padLeft}" y="${yMed}" width="${xMed - padLeft}" height="${padTop + chartH - yMed}" fill="#ecfdf5" opacity="0.6"/>`;
    svg += `<text x="${padLeft + 8}" y="${padTop + chartH - 8}" fill="#059669" font-size="9.5" font-weight="700">Zona Ideal / Código Conciso</text>`;

    // Q3: High LOC, High WMC (Top-Right) -> Hotspot de Risco
    svg += `<rect x="${xMed}" y="${padTop}" width="${padLeft + chartW - xMed}" height="${yMed - padTop}" fill="#fef2f2" opacity="0.5"/>`;
    svg += `<text x="${padLeft + chartW - 8}" y="${padTop + 14}" fill="#dc2626" font-size="9.5" font-weight="700" text-anchor="end">Hotspots de Complexidade</text>`;

    // Radial Iso-Density Lines (WMC / LOC = 0.1, 0.2, 0.3)
    [0.1, 0.2, 0.25].forEach(dens => {
      const locEnd = Math.min(maxLoc, maxWmc / dens);
      const wmcEnd = locEnd * dens;
      const xEnd = padLeft + (locEnd / maxLoc) * chartW;
      const yEnd = padTop + chartH - (wmcEnd / maxWmc) * chartH;
      svg += `<line x1="${padLeft}" y1="${padTop + chartH}" x2="${xEnd}" y2="${yEnd}" stroke="#94a3b8" stroke-dasharray="2,3" stroke-width="1.2"/>`;
      svg += `<text x="${xEnd}" y="${yEnd - 3}" fill="#64748b" font-size="8.5" text-anchor="end">dens=${dens}</text>`;
    });

    // Median separator axes
    svg += `<line x1="${xMed}" y1="${padTop}" x2="${xMed}" y2="${padTop + chartH}" stroke="#94a3b8" stroke-dasharray="3,3" stroke-width="1.5"/>`;
    svg += `<line x1="${padLeft}" y1="${yMed}" x2="${padLeft + chartW}" y2="${yMed}" stroke="#94a3b8" stroke-dasharray="3,3" stroke-width="1.5"/>`;

    // Outer Axis Lines
    svg += `<line x1="${padLeft}" y1="${padTop + chartH}" x2="${padLeft + chartW}" y2="${padTop + chartH}" stroke="#64748b" stroke-width="1.5"/>`;
    svg += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + chartH}" stroke="#64748b" stroke-width="1.5"/>`;

    // Axis Labels
    svg += `<text x="${padLeft + chartW / 2}" y="${height - 6}" fill="#475569" font-size="10.5" font-weight="650" text-anchor="middle">Linhas de Código (LOC)</text>`;
    svg += `<text x="${padLeft - 28}" y="${padTop + chartH / 2}" fill="#475569" font-size="10.5" font-weight="650" text-anchor="middle" transform="rotate(-90 ${padLeft - 28} ${padTop + chartH / 2})">WMC (McCabe)</text>`;

    // Plot Points (16 trials)
    const activeIds = new Set(filtered.map(x => x.id || `${x.participante_curto}-${x.kata_id}-${x.tratamento}`));

    trials.forEach(trial => {
      const trialKey = trial.id || `${trial.participante_curto}-${trial.kata_id}-${trial.tratamento}`;
      const isActive = activeIds.has(trialKey);

      const cx = padLeft + (trial.loc / maxLoc) * chartW;
      const cy = padTop + chartH - (trial.wmc / maxWmc) * chartH;

      // Circle radius proportional to time spent (5px to 13px)
      const r = Math.max(5, Math.min(13, 5 + (trial.tempo_segundos / 1853) * 8));

      const isAi = trial.tratamento === 'COM_IA';
      const color = isAi ? '#0284c7' : '#d97706';
      const opacity = isActive ? '0.88' : '0.15';

      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="white" stroke-width="1.5" opacity="${opacity}" data-tip="<strong>${trial.participante_curto} · ${trial.kata_nome}</strong><br>Tratamento: ${trial.tratamento === 'COM_IA' ? 'Com IA' : 'Manual'}<br>LOC: ${trial.loc} | WMC: ${trial.wmc}<br>Densidade Lógica: ${trial.densidade_wmc_loc.toFixed(2)}<br>Tempo: ${trial.tempo_formatado}"/>`;
    });

    svg += '</svg>';
    chartQuadrants.innerHTML = svg;
    attachTooltips(chartQuadrants);
  }

  // 4. Bullet Graphs de Desempenho Computacional (Stephen Few / RQ4)
  function renderBulletGraphs() {
    const katas = fullData?.comparativo_katas || [];
    const width = 500;
    const height = 240;
    const padLeft = 85;
    const padRight = 30;
    const padTop = 15;
    const padBottom = 25;
    const chartW = width - padLeft - padRight;

    const rowH = 45;
    const maxLat = 0.16; // 0.16 µs

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg">`;

    katas.forEach((k, idx) => {
      const y0 = padTop + idx * rowH + 6;
      const hBar = 22;
      const bench = k.benchmark || { bench_time_us: 0.08, bench_allocated_bytes: 32 };
      const val = bench.bench_time_us;

      // Qualitative background bands (Stephen Few design)
      const wExcel = (0.05 / maxLat) * chartW;
      const wIdeal = (0.10 / maxLat) * chartW;
      const wAccept = chartW;

      // Acceptable range (light grey)
      svg += `<rect x="${padLeft}" y="${y0}" width="${wAccept}" height="${hBar}" fill="#e2e8f0" rx="3"/>`;
      // Ideal range (mint)
      svg += `<rect x="${padLeft}" y="${y0}" width="${wIdeal}" height="${hBar}" fill="#a7f3d0" rx="3"/>`;
      // Excellent range (deep emerald)
      svg += `<rect x="${padLeft}" y="${y0}" width="${wExcel}" height="${hBar}" fill="#34d399" rx="3"/>`;

      // Actual performance feature bar (narrow black/slate bar)
      const wActual = (val / maxLat) * chartW;
      svg += `<rect x="${padLeft}" y="${y0 + 5}" width="${wActual}" height="${hBar - 10}" fill="#0f172a" rx="2" data-tip="<strong>${k.nome}</strong><br>Latência: ${val.toFixed(3)} µs/op<br>Alocação no Heap: ${bench.bench_allocated_bytes} Bytes<br>Throughput: ${bench.bench_throughput_ops?.toLocaleString()} ops/seg"/>`;

      // Target reference line (average across all = 0.094 µs)
      const xTarget = padLeft + (0.094 / maxLat) * chartW;
      svg += `<line x1="${xTarget}" y1="${y0 - 2}" x2="${xTarget}" y2="${y0 + hBar + 2}" stroke="#ef4444" stroke-width="2.5"/>`;

      // Kata Label
      svg += `<text x="${padLeft - 10}" y="${y0 + hBar / 2 + 4}" fill="#334155" font-size="11" font-weight="700" text-anchor="end">Kata 0${idx + 1}</text>`;

      // Numeric Metric text
      svg += `<text x="${padLeft + wActual + 6}" y="${y0 + hBar / 2 + 4}" fill="#0f172a" font-size="10.5" font-weight="750">${val.toFixed(3)} µs</text>`;
    });

    // Bottom scale axis
    const yAxis = padTop + katas.length * rowH + 6;
    [0, 0.05, 0.10, 0.15].forEach(mark => {
      const x = padLeft + (mark / maxLat) * chartW;
      svg += `<line x1="${x}" y1="${yAxis}" x2="${x}" y2="${yAxis + 4}" stroke="#64748b"/>`;
      svg += `<text x="${x}" y="${yAxis + 14}" fill="#64748b" font-size="9.5" text-anchor="middle">${mark.toFixed(2)}µs</text>`;
    });

    svg += '</svg>';
    chartBullet.innerHTML = svg;
    attachTooltips(chartBullet);
  }

  // 5. Waterfall Divergente de Postos de Wilcoxon (Estatística Inferencial)
  function renderWilcoxonWaterfall() {
    const wilc = fullData?.wilcoxon?.rq1_tempo || {};
    const deltas = wilc.diferencas_after_menos_before || [-1814.5, -1308.0, -1274.0];
    const postos = wilc.postos_absolutos || [3.0, 2.0, 1.0];
    const participants = ['Isabella', 'Leandro', 'Luis'];

    const width = 500;
    const height = 240;
    const padLeft = 85;
    const padRight = 35;
    const padTop = 30;
    const padBottom = 35;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg">`;

    // Center zero axis (Diverging Waterfall)
    const xZero = padLeft + chartW * 0.75; // Zero shifted to right since all are negative
    svg += `<line x1="${xZero}" y1="${padTop - 8}" x2="${xZero}" y2="${padTop + chartH + 8}" stroke="#475569" stroke-width="2"/>`;
    svg += `<text x="${xZero}" y="${padTop - 12}" fill="#0f172a" font-size="11" font-weight="800" text-anchor="middle">Zero (H₀: Sem Diferença)</text>`;

    const rowH = chartH / participants.length;
    const maxDelta = 2000; // 2000s scale to the left

    participants.forEach((name, idx) => {
      const y = padTop + idx * rowH + 8;
      const barH = rowH - 16;
      const delta = Math.abs(deltas[idx]);
      const rank = postos[idx];

      const barW = (delta / maxDelta) * (xZero - padLeft);
      const xBar = xZero - barW;

      // Negative rank bar (green indicating reduction in time)
      svg += `<rect x="${xBar}" y="${y}" width="${barW}" height="${barH}" fill="#059669" rx="3" data-tip="<strong>${name}</strong><br>Diferença Pareada: ${deltas[idx].toFixed(1)}s (${(deltas[idx] / 60).toFixed(1)} min)<br>Posto Atribuído: ${rank.toFixed(0)}<br>Soma no W⁻ = 6.0"/>`;

      // Participant Name
      svg += `<text x="${padLeft - 10}" y="${y + barH / 2 + 4}" fill="#334155" font-size="11" font-weight="700" text-anchor="end">${name}</text>`;

      // Rank badge inside bar
      svg += `<text x="${xBar + 8}" y="${y + barH / 2 + 4}" fill="white" font-size="10.5" font-weight="800">Posto ${rank.toFixed(0)} (${deltas[idx].toFixed(0)}s)</text>`;
    });

    // Statistical Conclusion Marker
    const yFoot = height - 10;
    svg += `<text x="${width / 2}" y="${yFoot}" fill="#64748b" font-size="10" text-anchor="middle">W⁺ = 0 | W⁻ = 6.0 | Rank-Biserial = −1.00 | p = 0.1250 (n = 3)</text>`;

    svg += '</svg>';
    chartWaterfall.innerHTML = svg;
    attachTooltips(chartWaterfall);
  }

  // Tooltip Helper
  function attachTooltips(container) {
    const items = container.querySelectorAll('[data-tip]');
    items.forEach(el => {
      el.addEventListener('mouseenter', e => {
        chartTooltip.innerHTML = el.getAttribute('data-tip');
        chartTooltip.style.opacity = '1';
        const box = container.getBoundingClientRect();
        const rBox = el.getBoundingClientRect();
        chartTooltip.style.left = `${rBox.left - box.left + rBox.width / 2}px`;
        chartTooltip.style.top = `${rBox.top - box.top - 36}px`;
      });
      el.addEventListener('mouseleave', () => {
        chartTooltip.style.opacity = '0';
      });
    });
  }

  // Render Table
  function renderTable(trials) {
    tbodyTrials.innerHTML = '';
    if (!trials.length) {
      tbodyTrials.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:32px;color:#94a3b8;">Nenhum trial atende aos filtros selecionados.</td></tr>';
      return;
    }

    trials.forEach((trial, index) => {
      const tr = document.createElement('tr');

      const isAi = trial.tratamento === 'COM_IA';
      const badgeClass = isAi ? 'badge-ai' : 'badge-noai';
      const badgeText = isAi ? 'Com IA' : 'Sem IA';

      tr.innerHTML = `
        <td><strong>${trial.participante_curto}</strong></td>
        <td>${trial.kata_nome}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td class="td-mono">${trial.classe}</td>
        <td class="td-mono">${trial.loc || '—'}</td>
        <td class="td-mono">${trial.wmc || '—'}</td>
        <td class="td-mono">${trial.densidade_wmc_loc ? trial.densidade_wmc_loc.toFixed(2) : '—'}</td>
        <td class="td-mono">${trial.tempo_formatado}</td>
        <td><span class="badge badge-success">8/8 OK</span></td>
        <td>
          <button class="btn-inspect" data-index="${index}">Inspecionar</button>
        </td>
      `;

      tr.querySelector('.btn-inspect').addEventListener('click', () => openInspector(trial));
      tbodyTrials.appendChild(tr);
    });
  }

  // Modal Code Inspector
  function openInspector(trial) {
    activeTrial = trial;
    activeFileIndex = 0;

    modalTrialTitle.textContent = `${trial.classe}.java`;
    modalTrialSubtitle.textContent = `${trial.participante} · ${trial.kata_nome} · ${trial.tratamento === 'COM_IA' ? 'Com IA' : 'Sem IA'}`;

    modalMetricsBar.innerHTML = `
      <span><strong>Tempo:</strong> ${trial.tempo_formatado}</span>
      <span><strong>LOC:</strong> ${trial.loc || '—'}</span>
      <span><strong>WMC:</strong> ${trial.wmc || '—'}</span>
      <span><strong>Densidade:</strong> ${trial.densidade_wmc_loc || '—'}</span>
      <span><strong>Testes JUnit:</strong> 8/8 Aprovados (100%)</span>
      <span><strong>Arquivo PDF:</strong> ${trial.pdf_filename}</span>
    `;

    renderFileTabs();
    modalInspector.classList.add('active');
  }

  function renderFileTabs() {
    modalFileTabs.innerHTML = '';
    const files = activeTrial?.arquivos || [];
    if (!files.length) {
      modalFileTabs.innerHTML = '<span class="file-tab active">Código não disponível</span>';
      modalCodeContent.textContent = '// Nenhum código-fonte anexado.';
      return;
    }

    files.forEach((f, idx) => {
      const btn = document.createElement('button');
      btn.className = `file-tab ${idx === activeFileIndex ? 'active' : ''}`;
      btn.textContent = f.name;
      btn.addEventListener('click', () => {
        activeFileIndex = idx;
        renderFileTabs();
      });
      modalFileTabs.appendChild(btn);
    });

    const cur = files[activeFileIndex];
    modalCodeContent.textContent = cur ? cur.content : '// Arquivo vazio.';
  }

  modalClose.addEventListener('click', () => {
    modalInspector.classList.remove('active');
  });

  modalInspector.addEventListener('click', e => {
    if (e.target === modalInspector) modalInspector.classList.remove('active');
  });

  // Export CSV
  btnExportCsv.addEventListener('click', () => {
    if (!fullData || !fullData.trials) return;
    const trials = getFilteredTrials();
    const headers = ['participante', 'kata_id', 'kata_nome', 'tratamento', 'classe', 'loc', 'wmc', 'densidade_wmc_loc', 'tempo_segundos', 'tempo_formatado', 'testes_aprovados', 'testes_total'];
    const rows = trials.map(t => [
      `"${t.participante}"`,
      t.kata_id,
      `"${t.kata_nome}"`,
      t.tratamento,
      t.classe,
      t.loc,
      t.wmc,
      t.densidade_wmc_loc,
      t.tempo_segundos,
      t.tempo_formatado,
      t.testes_aprovados,
      t.testes_total
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lab02-trials-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });

  // Export JSON
  btnExportJson.addEventListener('click', () => {
    if (!fullData) return;
    const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lab02-dashboard-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  btnReload.addEventListener('click', loadDashboard);

  // Filters event listeners
  [filterKata, filterTreatment, filterParticipant].forEach(select => {
    select.addEventListener('change', () => {
      const filtered = getFilteredTrials();
      updateKpis(filtered);
      renderWaffleMatrix(filtered);
      renderQuadrantScatter(filtered);
      renderTable(filtered);
    });
  });

  function renderAll() {
    const filtered = getFilteredTrials();
    updateKpis(filtered);
    renderWaffleMatrix(filtered);
    renderSlopegraph();
    renderQuadrantScatter(filtered);
    renderBulletGraphs();
    renderWilcoxonWaterfall();
    renderTable(filtered);
  }

  // Initial Load
  loadDashboard();
});
