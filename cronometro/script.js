document.addEventListener('DOMContentLoaded', () => {
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

    function loadResults() {
        const stored = localStorage.getItem('lab02_results');
        if (stored) {
            savedResults = JSON.parse(stored);
            renderTable();
        }
    }

    function saveResults() {
        localStorage.setItem('lab02_results', JSON.stringify(savedResults));
        renderTable();
    }

    function renderTable() {
        resultsTbody.innerHTML = '';
        
        if (savedResults.length === 0) {
            resultsTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Nenhum resultado salvo ainda.</td></tr>';
            return;
        }

        savedResults.forEach((res, index) => {
            const tr = document.createElement('tr');
            
            const badgeIA = res.treatment 
                ? '<span class="badge badge-ai">Com IA</span>' 
                : '<span class="badge badge-noai">Sem IA</span>';
                
            const badgeTimeout = res.timeOut 
                ? '<span class="badge badge-yes">Sim</span>' 
                : '<span class="badge badge-no">Não</span>';

            tr.innerHTML = `
                <td>${res.participant}</td>
                <td>${res.kata}</td>
                <td>${badgeIA}</td>
                <td style="font-family: 'Fira Code', monospace; font-weight: bold;">${res.timeElapsedFormatted}</td>
                <td>${badgeTimeout}</td>
                <td class="notes-cell" title="${res.resultNotes}">${res.resultNotes || '-'}</td>
                <td><button class="secondary btn-small btn-danger" data-index="${index}" style="margin: 0;">Excluir</button></td>
            `;
            resultsTbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-danger[data-index]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (confirm('Tem certeza que deseja excluir este resultado?')) {
                    savedResults.splice(idx, 1);
                    saveResults();
                }
            });
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
        updateTimerDisplay();
        
        timerInterval = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
            
            if (secondsElapsed >= MAX_TIME_SECONDS) {
                stopTimer(true);
            }
        }, 1000);
        
        document.addEventListener('keydown', handleTimerStopKey);
    }

    function stopTimer(isTimeout = false) {
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

    btnSave.addEventListener('click', () => {
        currentSession.resultNotes = resultData.value.trim();

        savedResults.push({...currentSession});

        saveResults();

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
        if (savedResults.length === 0) return;
        
        if (confirm('CUIDADO: Tem certeza que deseja apagar TODOS os resultados salvos nesta máquina? Isso não pode ser desfeito.')) {
            savedResults = [];
            saveResults();
            closeModal();
        }
    });
});
