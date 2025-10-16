document.addEventListener("DOMContentLoaded", () => {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const list = document.getElementById("historyList");
    const btnVoltar = document.getElementById("btnVoltar");

    btnVoltar.addEventListener("click", () => {
        window.location.href = "home.html";
    });

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }
        try {
            // Padronizado para buscar por 'clienteId' e ordenar por 'dataHora'
            const snap = await db.collection("agendamentos")
                .where("clienteId", "==", user.uid)
                .orderBy("dataHora", "desc")
                .limit(100)
                .get();
            if (snap.empty) {
                list.innerHTML = `<li class="history-item"><span class="when">Nenhum agendamento encontrado.</span></li>`;
                return;
            }
            const now = new Date();
            const frag = document.createDocumentFragment();
            snap.forEach(doc => {
                const a = doc.data();
                const dt = a.dataHora && a.dataHora.toDate ? a.dataHora.toDate() : null;
                const whenStr = dt ? formatDateTime(dt) : "(sem data)";
                const statusClass = getStatusClass(a.status, dt, now);
                const li = document.createElement("li");
                li.className = "history-item";
                const spanWhen = document.createElement("span");
                spanWhen.className = "when";
                spanWhen.textContent = whenStr;
                const box = document.createElement("span");
                box.className = `status-box ${statusClass}`;
                box.setAttribute("title", getStatusLabel(statusClass));
                li.appendChild(spanWhen);
                li.appendChild(box);
                frag.appendChild(li);
            });
            list.innerHTML = "";
            list.appendChild(frag);
        } catch (err) {
            console.error("Erro ao carregar histórico:", err);
            // Verifica se o erro é de índice faltando
            if (err.code === 'failed-precondition') {
                list.innerHTML = `<li class="history-item"><span class="when">Erro de configuração do banco de dados. Um índice precisa ser criado no Firestore. Verifique o console (F12) para o link de criação.</span></li>`;
            } else {
                list.innerHTML = `<li class="history-item"><span class="when">Erro ao carregar histórico.</span></li>`;
            }
        }
    });

    function formatDateTime(d) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
    }

    function getStatusClass(status, dt, now) {
        const s = (status || "").toLowerCase();
        if (s === "compareceu") return "status--ok";
        if (s === "faltou") return "status--no";
        if (s === "cancelado") return "status--cancel";
        if (dt && dt > now) return "status--future";
        return "status--ok";
    }

    function getStatusLabel(cls) {
        switch (cls) {
            case "status--ok": return "Compareceu";
            case "status--no": return "Faltou";
            case "status--cancel": return "Cancelado";
            case "status--future": return "Agendamento futuro";
            default: return "Status";
        }
    }
});