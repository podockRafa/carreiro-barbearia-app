// =================================================================
//      VERSÃO FINAL E COMPLETA - js/agendamento.js
// =================================================================
(function() {
    const BOOKING_KEY = "booking";
    let Services = [];
    let Pros = [];

    function saveBooking(patch) {
        const cur = JSON.parse(sessionStorage.getItem(BOOKING_KEY) || "{}");
        sessionStorage.setItem(BOOKING_KEY, JSON.stringify({ ...cur, ...patch }));
    }
    function getBooking() { return JSON.parse(sessionStorage.getItem(BOOKING_KEY) || "{}"); }
    function clearBooking() { sessionStorage.removeItem(BOOKING_KEY); }
    function fmtMoney(v) { return "R$ " + Number(v).toFixed(2).replace(".", ","); }
    function fmtDate(d) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }
    function weekdayPT(d) { return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()]; }
    function monthLabel(d) {
        const m1 = d.toLocaleString("pt-BR", { month: "long" });
        const next = new Date(d); next.setDate(d.getDate() + 4);
        const m2 = next.toLocaleString("pt-BR", { month: "long" });
        const y = next.getFullYear();
        return (m1 === m2 ? m1 : `${m1}/${m2}`) + " " + y;
    }

    async function initStep1() {
        const db = firebase.firestore();
        const ul = document.getElementById("serviceList");
        if (!ul) return;
        ul.innerHTML = '<li>Carregando serviços...</li>';
        try {
            const snapshot = await db.collection("servicos").orderBy("nome").get();
            Services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            ul.innerHTML = Services.map(s => `
                <li class="select-item">
                    <div class="thumb">${s.foto ? `<img src="${s.foto}" alt="" />` : 'FOTO'}</div>
                    <div class="item-main">
                        <div class="title">${s.nome} ${s.obs ? `<span class="meta">- ${s.obs}</span>` : ''}</div>
                        <div class="price">${fmtMoney(s.preco)}</div>
                        <div class="meta">${s.duracao} min</div>
                    </div>
                    <label>
                        <input type="radio" name="service" class="pick" value="${s.id}">
                        <span class="check"></span>
                    </label>
                </li>`).join("");
        } catch (error) {
            console.error("Erro ao carregar serviços:", error);
            ul.innerHTML = '<li>Ocorreu um erro ao carregar os serviços. Tente novamente.</li>';
        }
        ul.addEventListener("change", (e) => {
            if (e.target && e.target.matches("input.pick")) {
                const s = Services.find(x => x.id === e.target.value);
                saveBooking({ serviceId: s.id, serviceTitle: s.nome, servicePrice: s.preco, serviceMins: s.duracao });
            }
        });
        document.getElementById("goNext").addEventListener("click", () => {
            const b = getBooking();
            if (!b.serviceId) { alert("Selecione um serviço."); return; }
            window.location.href = "agendar-profissional.html";
        });
        document.getElementById("goBack").addEventListener("click", () => window.location.href = "home.html");
    }

    async function initStep2() {
        const db = firebase.firestore();
        const ul = document.getElementById("proList");
        if (!ul) return;
        ul.innerHTML = '<li>Carregando profissionais...</li>';
        try {
            const snapshot = await db.collection("funcionarios").orderBy("nome").get();
            Pros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            ul.innerHTML = Pros.map(p => `
                <li class="select-item">
                    <div class="avatar">${p.foto ? `<img src="${p.foto}" alt="" />` : 'FOTO'}</div>
                    <div class="item-main"><div class="title">${p.nome}</div></div>
                    <label>
                        <input type="radio" name="pro" class="pick" value="${p.id}">
                        <span class="check"></span>
                    </label>
                </li>`).join("");
        } catch (error) {
            console.error("Erro ao carregar profissionais:", error);
            ul.innerHTML = '<li>Ocorreu um erro ao carregar os profissionais. Tente novamente.</li>';
        }
        ul.addEventListener("change", (e) => {
            if (e.target && e.target.matches("input.pick")) {
                const p = Pros.find(x => x.id === e.target.value);
                saveBooking({ proId: p.id, proName: p.nome });
            }
        });
        document.getElementById("goNext").addEventListener("click", () => {
            const b = getBooking();
            if (!b.proId) { alert("Selecione um profissional."); return; }
            window.location.href = "agendar-horario.html";
        });
        document.getElementById("goBack").addEventListener("click", () => history.back());
    }

    async function initStep3() {
        const db = firebase.firestore();
        const b = getBooking();
        if (!b.proId) {
            alert("Profissional não selecionado. Voltando...");
            window.location.href = "agendar-profissional.html";
            return;
        }
        const monthEl = document.getElementById("monthLabel");
        const bar = document.getElementById("daysBar");
        const manhaCt = document.getElementById("slotsMorning");
        const tardeCt = document.getElementById("slotsAfternoon");
        let activeDay = new Date();
        activeDay.setHours(0, 0, 0, 0);
        const toYMD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dow1to7 = date => { const js = (new Date(date)).getDay(); return js === 0 ? 7 : js; };
        let agendaConfig = {};
        let agendamentosDoProf = [];
        try {
            const [configDoc, agendSnapshot] = await Promise.all([
                db.collection("agenda_config").doc(b.proId).get(),
                db.collection("agendamentos").where("profissionalId", "==", b.proId).get()
            ]);
            agendaConfig = configDoc.exists ? configDoc.data() : { _overrides: {} };
            agendamentosDoProf = agendSnapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error("Erro ao buscar disponibilidade:", error);
            const slotsEl = document.querySelector(".slots");
            if (slotsEl) slotsEl.innerHTML = "<p>Não foi possível carregar os horários. Verifique as permissões do Firestore.</p>";
            return;
        }
        function renderSlots() {
            const ymd = toYMD(activeDay);
            const dow = dow1to7(activeDay);
            const baseDayConfig = agendaConfig[dow] || {};
            const overrideConfig = agendaConfig._overrides?.[ymd] || {};
            const agendamentosDoDia = agendamentosDoProf.filter(a => a.inicioISO && a.inicioISO.startsWith(ymd)).map(a => new Date(a.inicioISO).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            const horarios = Array.from({ length: (20 - 10) * 2 }, (_, i) => {
                const hour = 10 + Math.floor(i / 2);
                const minute = (i % 2) * 30;
                return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            });
            const slots = horarios.map(time => {
                const isAvailableInConfig = overrideConfig.hasOwnProperty(time) ? overrideConfig[time] : (baseDayConfig[time] === true);
                const isBooked = agendamentosDoDia.includes(time);
                const d = new Date(`${ymd}T${time}:00`);
                return { label: time, disabled: !isAvailableInConfig || isBooked, date: d };
            });
            const morning = slots.filter(s => parseInt(s.label.split(':')[0]) < 12);
            const afternoon = slots.filter(s => parseInt(s.label.split(':')[0]) >= 12);
            const draw = (ct, arr) => {
                ct.innerHTML = "";
                arr.forEach(s => {
                    const div = document.createElement("div");
                    div.className = "slot" + (s.disabled ? " disabled" : "");
                    div.textContent = s.label;
                    if (!s.disabled) {
                        div.addEventListener("click", () => {
                            [...document.querySelectorAll('.slot')].forEach(x => x.classList.remove("active"));
                            div.classList.add("active");
                            saveBooking({ dateISO: s.date.toISOString(), timeLabel: s.label, weekday: weekdayPT(s.date), dateLabel: fmtDate(s.date) });
                        });
                    }
                    ct.appendChild(div);
                });
            };
            document.getElementById("morningCount").textContent = morning.filter(x => !x.disabled).length + " horários";
            document.getElementById("afternoonCount").textContent = afternoon.filter(x => !x.disabled).length + " horários";
            draw(manhaCt, morning);
            draw(tardeCt, afternoon);
        }
        function renderBar(base) {
            monthEl.textContent = monthLabel(base);
            bar.innerHTML = "";
            for (let i = 0; i < 5; i++) {
                const d = new Date(base);
                d.setDate(base.getDate() + i);
                const btn = document.createElement("button");
                btn.className = "day-btn" + (i === 0 ? " active" : "");
                btn.innerHTML = `<div class="dw">${weekdayPT(d)}</div><div class="dd">${String(d.getDate()).padStart(2, "0")}</div>`;
                btn.addEventListener("click", () => {
                    [...bar.children].forEach(x => x.classList.remove("active"));
                    btn.classList.add("active");
                    activeDay = d;
                    renderSlots();
                });
                bar.appendChild(btn);
            }
        }
        renderBar(activeDay);
        renderSlots();
        document.getElementById("goNext").addEventListener("click", () => {
            const b = getBooking();
            if (!b.dateISO) { alert("Selecione um dia e um horário."); return; }
            window.location.href = "agendar-confirmar.html";
        });
        document.getElementById("goBack").addEventListener("click", () => history.back());
    }

    async function initStep4() {
        const db = firebase.firestore();
        const b = getBooking();
        if (!b.serviceId || !b.proId || !b.dateISO) {
            window.location.href = "agendar-servico.html";
            return;
        }
        firebase.auth().onAuthStateChanged(user => {
            if (!user) {
                alert("Você não está logado. Redirecionando para o login.");
                window.location.href = "index.html";
                return;
            }
            db.collection("clientes").doc(user.uid).get().then(doc => {
                const clienteNome = (doc.exists && doc.data().nome) ? doc.data().nome : "Cliente";
                document.getElementById("cf-service").textContent = `${b.serviceTitle} (${fmtMoney(b.servicePrice)})`;
                document.getElementById("cf-pro").textContent = b.proName;
                document.getElementById("cf-date").textContent = `${b.dateLabel} (${b.weekday})`;
                document.getElementById("cf-time").textContent = `${b.timeLabel} (15 min tolerância)`;
                
                document.getElementById("goNext").addEventListener("click", async () => {
                    const obs = (document.getElementById("obs")?.value || "").trim();
                    const agendamentoParaSalvar = {
                        clienteId: user.uid,
                        clienteNome: clienteNome,
                        profissionalId: b.proId,
                        profissionalNome: b.proName,
                        servicoId: b.serviceId,
                        servicoNome: b.serviceTitle,
                        servicoPreco: b.servicePrice,
                        inicioISO: b.dateISO,
                        dataHora: firebase.firestore.Timestamp.fromDate(new Date(b.dateISO)),
                        status: "Pendente",
                        observacao: obs,
                        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    try {
                        await db.collection("agendamentos").add(agendamentoParaSalvar);
                        const modal = document.getElementById("okModal");
                        if (modal) modal.style.display = "flex";
                        const closeBtn = modal.querySelector(".close");
                        if (closeBtn) closeBtn.onclick = () => {
                            modal.style.display = "none";
                            clearBooking();
                            window.location.href = "home.html";
                        };
                    } catch (error) {
                        console.error("Erro ao salvar agendamento:", error);
                        alert("Não foi possível confirmar seu agendamento. Erro: " + error.message);
                    }
                });
            }).catch(error => {
                console.error("Erro ao buscar dados do cliente:", error);
                alert("Ocorreu um erro ao buscar seus dados. Tente novamente.");
            });
        });
        document.getElementById("goBack").addEventListener("click", () => history.back());
    }

    // Expose (útil para depuração no console se necessário)
    window.BookingSteps = { initStep1, initStep2, initStep3, initStep4 };

    // Autoinicialização: O próprio script se chama quando a página está pronta.
    document.addEventListener('DOMContentLoaded', () => {
        const path = window.location.pathname.split('/').pop();
        if (path === 'agendar-servico.html') {
            window.BookingSteps.initStep1();
        } else if (path === 'agendar-profissional.html' || path === 'agendar-profissinal.html') {
            window.BookingSteps.initStep2();
        } else if (path === 'agendar-horario.html') {
            window.BookingSteps.initStep3();
        } else if (path === 'agendar-confirmar.html') {
            window.BookingSteps.initStep4();
        }
    });

})();