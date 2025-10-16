// js/perfil-funcionario.js
// VERSÃO FINAL: Usa 100% o usuário logado e estruturado corretamente.

document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.firestore();
    const auth = firebase.auth();
    const configCollection = db.collection("agenda_config");

    // --- Helpers de data ---
    const pad2 = n => String(n).padStart(2, '0');
    const toYMD = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const dow1to7 = date => { const js = (new Date(date)).getDay(); return js === 0 ? 7 : js; };
    const DOW_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    // --- Referências do DOM ---
    const employeeNameBadge = document.getElementById('employeeName');
    const weekMatrix = document.getElementById('weekMatrix');
    const dayStrip = document.getElementById('dayStrip');
    const dayMonth = document.getElementById('dayMonth');
    const saveConfigBtn = document.getElementById('saveConfig');
    const prevDaysBtn = document.getElementById('prevDaysBtn');
    const nextDaysBtn = document.getElementById('nextDaysBtn');
    
    // --- Estado da Aplicação ---
    let currentUser = null;
    let workingCopy = null;
    let editingDateYMD = null;
    let allDayPills = [];
    let dayStripStartIndex = 0;
    const VISIBLE_DAYS = 5;
    const TOTAL_DAYS_TO_SHOW = 30;

    const TIMES = Array.from({ length: (20 - 10) * 2 }, (_, i) => {
        const hour = 10 + Math.floor(i / 2);
        const minute = (i % 2) * 30;
        return `${pad2(hour)}:${pad2(minute)}`;
    });

    // --- LÓGICA PRINCIPAL ---
    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUser = user;
            await initPage();
        } else {
            window.location.href = "../../index.html";
        }
    });

    async function initPage() {
        if (!currentUser) return;
        try {
            const userProfile = await db.collection("funcionarios").doc(currentUser.uid).get();
            const userName = userProfile.exists && userProfile.data().nome ? userProfile.data().nome : currentUser.email;

            if (employeeNameBadge) {
                employeeNameBadge.textContent = userName;
            }

            const configDoc = await configCollection.doc(currentUser.uid).get();
            workingCopy = configDoc.exists ? configDoc.data() : { _overrides: {} };
            
            setupEventListeners();
            generateAllDayPills();
            updateDayStripView();
            updateMonthHeader();
            selectDayForEdit(toYMD(new Date()));
        } catch (error) {
            console.error("Erro ao iniciar a página:", error);
            alert("Não foi possível carregar suas configurações de agenda.");
        }
    }
    
    function setupEventListeners() {
        prevDaysBtn.addEventListener('click', () => {
            dayStripStartIndex = Math.max(0, dayStripStartIndex - 1);
            updateDayStripView();
            updateMonthHeader();
        });
        nextDaysBtn.addEventListener('click', () => {
            dayStripStartIndex = Math.min(TOTAL_DAYS_TO_SHOW - VISIBLE_DAYS, dayStripStartIndex + 1);
            updateDayStripView();
            updateMonthHeader();
        });
        saveConfigBtn.addEventListener('click', salvarConfiguracao);
    }

    async function salvarConfiguracao() {
        if (!currentUser || !workingCopy) {
            return alert("Erro: Usuário não identificado.");
        }
        try {
            await configCollection.doc(currentUser.uid).set(workingCopy);
            
            const userProfile = await db.collection("funcionarios").doc(currentUser.uid).get();
            const userName = userProfile.exists && userProfile.data().nome ? userProfile.data().nome : currentUser.email;
            alert(`Disponibilidade de ${userName} salva com sucesso!`);
        } catch (error) {
            console.error("Erro ao salvar configuração:", error);
            alert("Falha ao salvar a configuração.");
        }
    }

    function generateAllDayPills() {
        allDayPills = [];
        const base = new Date();
        for (let i = 0; i < TOTAL_DAYS_TO_SHOW; i++) {
            const d = addDays(base, i);
            const ymd = toYMD(d);
            const pill = document.createElement('button');
            pill.className = 'day-pill';
            pill.dataset.ymd = ymd;
            pill.innerHTML = `<span class="dow">${DOW_PT[d.getDay()]}</span><span class="d">${d.getDate()}</span>`;
            if (toYMD(new Date()) === ymd) pill.classList.add('today');
            pill.addEventListener('click', () => selectDayForEdit(ymd));
            allDayPills.push(pill);
        }
    }

    function updateDayStripView() {
        if(!dayStrip || !prevDaysBtn || !nextDaysBtn) return;
        dayStrip.innerHTML = '';
        const visiblePills = allDayPills.slice(dayStripStartIndex, dayStripStartIndex + VISIBLE_DAYS);
        visiblePills.forEach(pill => dayStrip.appendChild(pill));
        prevDaysBtn.disabled = dayStripStartIndex === 0;
        nextDaysBtn.disabled = dayStripStartIndex >= TOTAL_DAYS_TO_SHOW - VISIBLE_DAYS;
    }

    function updateMonthHeader() {
        if (!dayMonth || allDayPills.length === 0) return;
        const firstVisibleDayYMD = allDayPills[dayStripStartIndex].dataset.ymd;
        const lastVisibleIndex = Math.min(dayStripStartIndex + VISIBLE_DAYS - 1, allDayPills.length - 1);
        const lastVisibleDayYMD = allDayPills[lastVisibleIndex].dataset.ymd;
        const startDate = new Date(`${firstVisibleDayYMD}T12:00:00`);
        const endDate = new Date(`${lastVisibleDayYMD}T12:00:00`);
        const m1 = startDate.toLocaleString('pt-BR', { month: 'long' });
        const y1 = startDate.getFullYear();
        const m2 = endDate.toLocaleString('pt-BR', { month: 'long' });
        const y2 = endDate.getFullYear();
        const cap = str => str.charAt(0).toUpperCase() + str.slice(1);
        let label = "";
        if (y1 === y2) {
            if (m1 === m2) { label = `${cap(m1)} de ${y1}`; } 
            else { label = `${cap(m1)} / ${cap(m2)} de ${y1}`; }
        } else {
            label = `${cap(m1)} de ${y1} / ${cap(m2)} de ${y2}`;
        }
        dayMonth.textContent = label;
    }

    function selectDayForEdit(ymd) {
        editingDateYMD = ymd;
        allDayPills.forEach(p => p.classList.toggle('active', p.dataset.ymd === ymd));
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
});