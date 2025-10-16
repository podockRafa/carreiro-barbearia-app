// js/agenda.js
// VERSÃO FINAL: Exibe a lista de agendamentos e ativa a funcionalidade de edição de horários via modal.

(function() {
    // Serviços do Firebase
    const db = firebase.firestore();
    const funcionariosCollection = db.collection("funcionarios");
    const agendamentosCollection = db.collection("agendamentos");
    const configCollection = db.collection("agenda_config");

    // --- Helpers de data ---
    const pad2 = n => String(n).padStart(2, '0');
    const toYMD = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const toLocalDateInputValue = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const dow1to7 = date => { const js = (new Date(date)).getDay(); return js === 0 ? 7 : js; }; // Seg=1, Dom=7
    const DOW_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // --- Referências do DOM ---
    const agendaData = document.getElementById('agendaData');
    const filtroProf = document.getElementById('filtroProf');
    const grid = document.getElementById('agendaGrid');
    const btnHoje = document.getElementById('btnHoje');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    
    // <<-- ADICIONADO: Referências do Modal -->>
    const modal = document.getElementById('modalConfig');
    const configTitle = document.getElementById('configTitle');
    const dayStrip = document.getElementById('dayStrip');
    const weekMatrix = document.getElementById('weekMatrix');
    const dayMonth = document.getElementById('dayMonth');
    const saveConfigBtn = document.getElementById('saveConfig');

    // --- Estado da Aplicação ---
    let EMPs = [], AGENDs = [], CFG = {};
    let currentDate = new Date();
    // <<-- ADICIONADO: Estado do Modal -->>
    let selectedEmp = null, workingCopy = null, editingDateYMD = null;
    
    const TIMES = Array.from({ length: (20 - 10) * 2 }, (_, i) => {
        const hour = 10 + Math.floor(i / 2);
        const minute = (i % 2) * 30;
        return `${pad2(hour)}:${pad2(minute)}`;
    });
    
    // --- FUNÇÕES DE INICIALIZAÇÃO E CARREGAMENTO ---

    async function init() {
        setupEventListeners();
        await carregarFuncionarios();
        await carregarDadosDaAgenda();
    }

    function setupEventListeners() {
        agendaData.addEventListener('change', () => {
            const [year, month, day] = agendaData.value.split('-').map(Number);
            currentDate = new Date(year, month - 1, day);
            carregarDadosDaAgenda();
        });
        filtroProf.addEventListener('change', renderGrid);
        btnHoje.addEventListener('click', () => {
            currentDate = new Date();
            carregarDadosDaAgenda();
        });
        btnPrev.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() - 1);
            carregarDadosDaAgenda();
        });
        btnNext.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() + 1);
            carregarDadosDaAgenda();
        });
        
        // <<-- ADICIONADO: Listeners (Ouvintes) de Eventos do Modal -->>
        document.getElementById('closeConfig')?.addEventListener('click', closeModal);
        document.getElementById('cancelConfig')?.addEventListener('click', closeModal);
        saveConfigBtn?.addEventListener('click', salvarConfiguracao);
        grid.addEventListener('click', (e) => {
            const gearButton = e.target.closest('.btn-gear');
            if (gearButton) {
                const empId = gearButton.dataset.empId;
                const emp = EMPs.find(e => e.id === empId);
                if (emp) openConfig(emp);
            }
        });
    }

    async function carregarFuncionarios() {
        try {
            const snapshot = await funcionariosCollection.orderBy("nome").get();
            EMPs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filtroProf.innerHTML = '<option value="*">Todos</option>';
            EMPs.forEach(e => {
                filtroProf.innerHTML += `<option value="${e.id}">${e.nome}</option>`;
            });
        } catch (error) {
            console.error("Erro ao carregar funcionários:", error);
        }
    }

    async function carregarDadosDaAgenda() {
        agendaData.value = toLocalDateInputValue(currentDate);
        try {
            const configSnapshot = await configCollection.get();
            CFG = {};
            configSnapshot.forEach(doc => { CFG[doc.id] = doc.data(); });

            const inicioDoDia = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).toISOString();
            const fimDoDia = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999).toISOString();

            const agendSnapshot = await agendamentosCollection
                .where('inicioISO', '>=', inicioDoDia)
                .where('inicioISO', '<=', fimDoDia).get();
            
            AGENDs = agendSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderGrid();
        } catch (error) {
            console.error("Erro ao carregar dados da agenda:", error);
            grid.innerHTML = `<p style="padding:20px; text-align:center;">Erro ao carregar dados. Verifique o console (F12) para criar um índice no Firestore.</p>`;
        }
    }
    
    // --- RENDERIZAÇÃO DA GRADE PRINCIPAL ---

    function renderGrid() {
        if (!grid) return;
        grid.innerHTML = '';
        const selectedProfId = filtroProf.value;
        const funcionariosParaRenderizar = EMPs.filter(e => selectedProfId === '*' || e.id === selectedProfId);

        if (funcionariosParaRenderizar.length === 0) {
            grid.innerHTML = "<p style='text-align:center; padding: 20px;'>Nenhum funcionário encontrado.</p>";
            return;
        }
        
        funcionariosParaRenderizar.forEach(emp => {
            const row = document.createElement('div');
            row.className = 'ag-row';
            row.innerHTML = `
                <div class="ag-left">
                    <div class="ag-avatar">${emp.nome ? emp.nome.charAt(0) : '?'}</div>
                    <div class="ag-name">
                        ${emp.nome}
                        <button class="btn-gear" data-emp-id="${emp.id}" title="Configurar agenda">⚙️</button>
                    </div>
                </div>`;
            
            const rightDiv = document.createElement('div');
            rightDiv.className = 'ag-right';
            const agendamentosDoFuncionario = AGENDs.filter(a => a.profissionalId === emp.id).sort((a,b) => new Date(a.inicioISO) - new Date(b.inicioISO));

            if (agendamentosDoFuncionario.length > 0) {
                const list = document.createElement('ul');
                list.className = 'scheduled-list';
                agendamentosDoFuncionario.forEach(ag => {
                    const hora = new Date(ag.inicioISO).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    list.innerHTML += `<li><strong>${hora}</strong> - ${ag.clienteNome} <span>(${ag.servicoNome})</span></li>`;
                });
                rightDiv.appendChild(list);
            } else {
                rightDiv.innerHTML = `<p class="muted no-appointments">Nenhum horário agendado para hoje.</p>`;
            }
            row.appendChild(rightDiv);
            grid.appendChild(row);
        });
    }
    
    // --- ADICIONADO: LÓGICA DO MODAL DE CONFIGURAÇÃO ---

    function openConfig(emp) {
        selectedEmp = emp;
        if (configTitle) configTitle.textContent = `Configurar agenda de ${emp.nome}`;
        workingCopy = JSON.parse(JSON.stringify(CFG[emp.id] || { _overrides: {} }));
        buildDayStripInModal();
        selectDayForEdit(toYMD(currentDate));
        if (modal) modal.classList.add('show');
    }

    function closeModal() {
        if (modal) modal.classList.remove('show');
        selectedEmp = null;
        workingCopy = null;
    }
    
    async function salvarConfiguracao() {
        if (!selectedEmp || !workingCopy) return alert("Nenhum funcionário selecionado.");
        try {
            await configCollection.doc(selectedEmp.id).set(workingCopy);
            alert(`Agenda de ${selectedEmp.nome} salva com sucesso!`);
            closeModal();
            await carregarDadosDaAgenda();
        } catch (error) {
            console.error("Erro ao salvar configuração:", error);
            alert("Falha ao salvar a configuração.");
        }
    }
    
    function buildDayStripInModal() {
        if (!dayStrip) return;
        dayStrip.innerHTML = '';
        const base = new Date();
        for (let i = 0; i < 30; i++) {
            const d = addDays(base, i);
            const ymd = toYMD(d);
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'day-pill';
            pill.dataset.ymd = ymd;
            pill.innerHTML = `<span class="dow">${DOW_PT[d.getDay()]}</span><span class="d">${d.getDate()}</span>`;
            if (toYMD(new Date()) === ymd) pill.classList.add('today');
            pill.addEventListener('click', () => selectDayForEdit(ymd));
            dayStrip.appendChild(pill);
        }
    }

    function selectDayForEdit(ymd) {
        editingDateYMD = ymd;
        document.querySelectorAll('#modalConfig .day-pill').forEach(p => p.classList.toggle('active', p.dataset.ymd === ymd));
        const d = new Date(`${ymd}T12:00:00`);
        if (dayMonth) dayMonth.textContent = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        buildDayTableForEdit();
    }

    function buildDayTableForEdit() {
        if (!weekMatrix) return;
        const d = new Date(`${editingDateYMD}T12:00:00`);
        const dow = dow1to7(d);
        const baseDayConfig = workingCopy[dow] || {};
        const overrideConfig = workingCopy._overrides?.[editingDateYMD] || {};
        let tableHTML = `<table class="week-table"><thead><tr><th class="week-time"></th><th>${d.toLocaleDateString('pt-BR')}</th></tr></thead><tbody>`;
        for (const time of TIMES) {
            const isAvailable = overrideConfig.hasOwnProperty(time) ? overrideConfig[time] : (baseDayConfig[time] === true);
            tableHTML += `<tr><th class="week-time">${time}</th><td class="cell ${isAvailable ? 'active' : ''}" data-time="${time}">${isAvailable ? 'Disponível' : 'Bloqueado'}</td></tr>`;
        }
        tableHTML += `</tbody></table>`;
        weekMatrix.innerHTML = tableHTML;
        weekMatrix.querySelectorAll('.cell').forEach(cell => cell.addEventListener('click', toggleCellAvailability));
    }

    function toggleCellAvailability(e) {
        const td = e.target.closest('.cell');
        if (!td) return;
        const time = td.dataset.time;
        if (!workingCopy._overrides) workingCopy._overrides = {};
        if (!workingCopy._overrides[editingDateYMD]) workingCopy._overrides[editingDateYMD] = {};
        const newStatus = !td.classList.contains('active');
        workingCopy._overrides[editingDateYMD][time] = newStatus;
        td.classList.toggle('active', newStatus);
        td.textContent = newStatus ? 'Disponível' : 'Bloqueado';
    }

    // --- INICIALIZAÇÃO ---
    document.addEventListener('DOMContentLoaded', init);
})();