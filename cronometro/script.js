document.addEventListener('DOMContentLoaded', () => {
    const appBase = location.pathname.replace(/\/cronometro\/?$/, '');
    const setupSection = document.getElementById('setup-section');
    const confirmationSection = document.getElementById('confirmation-section');
    const timerSection = document.getElementById('timer-section');
    const resultSection = document.getElementById('result-section');
    
    const participantInput = document.getElementById('participant');
    const kataInput = document.getElementById('kata');
    const treatmentRadios = document.getElementsByName('treatment');
    
    const btnPrepare = document.getElementById('btn-prepare');
    const confirmInput = document.getElementById('confirm-input');
    
    const timerDisplay = document.getElementById('timer-display');
    const infoParticipant = document.getElementById('info-participant');
    const infoKata = document.getElementById('info-kata');
    const infoTreatment = document.getElementById('info-treatment');
    
    const resultTitle = document.getElementById('result-title');
    const finalTimeDisplay = document.getElementById('final-time-display');
    const resultData = document.getElementById('result-data');
    const btnSave = document.getElementById('btn-save');
    const btnReset = document.getElementById('btn-reset');
    
    const resultsTbody = document.getElementById('results-tbody');
    const btnClearData = document.getElementById('btn-clear-data');

    const btnOpenResults = document.getElementById('btn-open-results');
    const btnCloseResults = document.getElementById('btn-close-results');
    const resultsModal = document.getElementById('results-modal');

    let timerInterval = null;
    let secondsElapsed = 0;
    let startedAt = 0;
    const MAX_TIME_SECONDS = 35 * 60; // 35 minutos
    
    let currentSession = {
        id: null,
        participant: '',
        kata: '',
        treatment: true,
        startTime: null,
        endTime: null,
        timeElapsedFormatted: '',
        timeOut: false,
        resultNotes: ''
    };
    
    let savedResults = [];
    let databaseReady = false;

    loadResults();

    function openModal() {
        resultsModal.classList.remove('hidden');
        setTimeout(() => {
            resultsModal.classList.add('active');
        }, 10);
    }

    function closeModal() {
        resultsModal.classList.remove('active');
        setTimeout(() => {
            resultsModal.classList.add('hidden');
        }, 300);
    }

    btnOpenResults.addEventListener('click', openModal);
    btnCloseResults.addEventListener('click', closeModal);
    
    resultsModal.addEventListener('click', (e) => {
        if (e.target === resultsModal) {
            closeModal();
        }
    });

    async function loadResults() {
        try {
            const response = await fetch(`${appBase}/api/trials`);
            if (!response.ok) throw new Error();
            savedResults = (await response.json()).trials;
            databaseReady = true;
            renderTable();
        } catch {
            databaseReady = false;
            resultsTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger);">Não foi possível acessar o banco de dados.</td></tr>';
        }
    }

    async function saveResults() {
        const response = await fetch(`${appBase}/api/trials`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({participant:currentSession.participant, kata:currentSession.kata,
                treatment:currentSession.treatment ? 'COM_IA' : 'SEM_IA', startedAt:currentSession.startTime,
                endedAt:currentSession.endTime, elapsedTime:currentSession.timeElapsedFormatted,
                timedOut:currentSession.timeOut, notes:currentSession.resultNotes})
        });
        if (!response.ok) throw new Error('Não foi possível salvar o resultado no banco de dados.');
        await loadResults();
    }

    function renderTable() {
        resultsTbody.innerHTML = '';
        
        if (savedResults.length === 0) {
            resultsTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Nenhum resultado salvo ainda.</td></tr>';
            return;
        }

        savedResults.forEach((res) => {
            const tr = document.createElement('tr');
            const field = value => { const cell = document.createElement('td'); cell.textContent = value; return cell; };
            const badge = (label, className) => { const cell = document.createElement('td'); const tag = document.createElement('span'); tag.className = `badge ${className}`; tag.textContent = label; cell.append(tag); return cell; };
            const elapsed = field(`${String(Math.floor(res.elapsed_seconds / 60)).padStart(2,'0')}:${String(res.elapsed_seconds % 60).padStart(2,'0')}`);
            elapsed.style.fontFamily = "'Fira Code', monospace"; elapsed.style.fontWeight = 'bold';
            const notes = field(res.notes || '-'); notes.className = 'notes-cell'; notes.title = res.notes || '';
            tr.append(field(res.participant), field(res.kata), badge(res.treatment === 'COM_IA' ? 'Com IA' : 'Sem IA', res.treatment === 'COM_IA' ? 'badge-ai' : 'badge-noai'), elapsed, badge(res.timed_out ? 'Sim' : 'Não', res.timed_out ? 'badge-yes' : 'badge-no'), notes, field('Registro permanente'));
            resultsTbody.appendChild(tr);
        });
    }

    function switchSection(hideElement, showElement) {
        hideElement.classList.remove('active');
        hideElement.classList.add('hidden');
        showElement.classList.remove('hidden');
        showElement.classList.add('active');
    }

    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        timerDisplay.textContent = formatTime(secondsElapsed);
        if (MAX_TIME_SECONDS - secondsElapsed <= 60) {
            timerDisplay.classList.add('danger');
        } else {
            timerDisplay.classList.remove('danger');
        }
    }

    function startTimer() {
        currentSession.id = Date.now().toString();
        currentSession.startTime = new Date().toISOString();
        secondsElapsed = 0;
        startedAt = Date.now();
        updateTimerDisplay();
        
        timerInterval = setInterval(() => {
            secondsElapsed = Math.min(MAX_TIME_SECONDS, Math.floor((Date.now() - startedAt) / 1000));
            updateTimerDisplay();
            
            if (secondsElapsed >= MAX_TIME_SECONDS) {
                stopTimer(true);
            }
        }, 1000);
        
        document.addEventListener('keydown', handleTimerStopKey);
    }

    function stopTimer(isTimeout = false) {
        secondsElapsed = Math.min(MAX_TIME_SECONDS, Math.floor((Date.now() - startedAt) / 1000));
        isTimeout = isTimeout || secondsElapsed >= MAX_TIME_SECONDS;
        clearInterval(timerInterval);
        document.removeEventListener('keydown', handleTimerStopKey);
        
        currentSession.endTime = new Date().toISOString();
        currentSession.timeElapsedFormatted = formatTime(secondsElapsed);
        currentSession.timeOut = isTimeout;
        
        finalTimeDisplay.textContent = currentSession.timeElapsedFormatted;
        
        if (isTimeout) {
            resultTitle.textContent = "Tempo Esgotado!";
            resultTitle.style.color = "var(--danger)";
            resultData.placeholder = "Tempo esgotado. Descreva quantos testes estavam passando e outros resultados...";
        } else {
            resultTitle.textContent = "Cronômetro Parado";
            resultTitle.style.color = "var(--text-main)";
        }
        
        switchSection(timerSection, resultSection);
        resultData.focus();
    }

    function handleTimerStopKey(e) {
        if (e.key === 'Enter') {
            stopTimer(false);
        }
    }

    document.getElementById('btn-stop').addEventListener('click', () => stopTimer(false));

    btnPrepare.addEventListener('click', () => {
        const participant = participantInput.value.trim();
        const kata = kataInput.value.trim();
        let treatment = true;
        
        for (const radio of treatmentRadios) {
            if (radio.checked) {
                treatment = radio.value === 'true';
                break;
            }
        }
        
        if (!participant || !kata) {
            alert('Por favor, preencha o participante e a Kata.');
            return;
        }
        
        currentSession.participant = participant;
        currentSession.kata = kata;
        currentSession.treatment = treatment;
        
        infoParticipant.textContent = participant;
        infoKata.textContent = kata;
        infoTreatment.textContent = treatment ? 'Com IA' : 'Sem IA';
        
        switchSection(setupSection, confirmationSection);
        confirmInput.value = '';
        confirmInput.focus();
    });

    confirmInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (confirmInput.value.toUpperCase() === 'S') {
                switchSection(confirmationSection, timerSection);
                startTimer();
            } else {
                alert("Digite 'S' e pressione Enter para começar.");
                confirmInput.value = '';
            }
        }
    });

    btnSave.addEventListener('click', async () => {
        currentSession.resultNotes = resultData.value.trim();
        if (!databaseReady) { alert('O banco de dados não está disponível. O resultado não foi salvo.'); return; }
        btnSave.disabled = true;
        try { await saveResults(); }
        catch (error) { alert(error.message); return; }
        finally { btnSave.disabled = false; }

        participantInput.value = '';
        kataInput.value = '';
        treatmentRadios[0].checked = true;
        resultData.value = '';
        confirmInput.value = '';
        
        switchSection(resultSection, setupSection);
    });

    btnReset.addEventListener('click', () => {
        if (confirm('Deseja descartar este resultado e criar um novo?')) {
            // Reset everything
            participantInput.value = '';
            kataInput.value = '';
            treatmentRadios[0].checked = true;
            resultData.value = '';
            confirmInput.value = '';
            
            switchSection(resultSection, setupSection);
        }
    });
    
    btnClearData.addEventListener('click', () => {
        alert('Os resultados são registros permanentes do experimento e não podem ser apagados por esta tela.');
    });
});
