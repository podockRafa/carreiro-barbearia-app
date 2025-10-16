// js/service.js
// Módulo de Serviços do Admin, integrado com o Firebase Firestore

(() => {
    // Inicializa o serviço do Firestore
    const db = firebase.firestore();
    const servicosCollection = db.collection("servicos");

    // --- Helpers ---
    const BRL = v => (isNaN(v) ? 0 : v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const pct = v => isFinite(v) ? `${v.toFixed(1)}%` : "—";
    const num = v => (typeof v === "number" ? v : parseFloat(String(v).replace(",", "."))) || 0;
    const toast = msg => alert(msg); // Simples alerta por enquanto

    // --- Estado e Referências do DOM ---
    let state = []; // Guardará os serviços vindos do Firestore
    let editId = null; // Guarda o ID do serviço em edição
    const tbody = document.getElementById("svcTbody");
    const modal = document.getElementById("svcModal");
    const form = document.getElementById("svcForm");
    
    // --- LÓGICA DE DADOS COM FIRESTORE ---

    async function carregarESalvarServicos() {
        try {
            const snapshot = await servicosCollection.get();
            state = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTable();
        } catch (error) {
            console.error("Erro ao carregar serviços:", error);
            tbody.innerHTML = `<tr><td colspan="10">Erro ao carregar serviços.</td></tr>`;
        }
    }

    // --- RENDERIZAÇÃO DA TABELA ---

    function renderTable() {
        if (!tbody) return;

        const q = (document.getElementById("svcQ")?.value || "").trim().toLowerCase();
        const filtered = state.filter(s => {
            if (!q) return true;
            return (s.nome || "").toLowerCase().includes(q) || (s.obs || "").toLowerCase().includes(q);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 20px;">Nenhum serviço cadastrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(s => {
            const lucro = (s.preco || 0) - (s.custoTotal || 0);
            const margem = (s.preco > 0) ? (lucro / s.preco * 100) : 0;
            return `
                <tr data-id="${s.id}">
                    <td>${s.foto ? `<img class="mini" alt="" src="${s.foto}">` : `<div class="mini"></div>`}</td>
                    <td>${s.nome || "—"}</td>
                    <td>${s.duracao || "—"} min</td>
                    <td>${BRL(s.preco)}</td>
                    <td>${BRL(s.custoTotal)}</td>
                    <td>${BRL(lucro)}</td>
                    <td>${pct(margem)}</td>
                    <td class="hide-sm">${s.obs || "—"}</td>
                    <td class="hide-sm">${(s.materiais || []).map(m => m.nome).join(', ') || "—"}</td>
                    <td class="cell-actions">
                        <button class="btn btn-yellow" data-action="edit">✏️</button>
                        <button class="btn btn-red" data-action="delete">🗑️</button>
                    </td>
                </tr>
            `;
        }).join("");
    }
    
    // --- LÓGICA DO MODAL (CRIAR/EDITAR) ---

    function resetForm() {
        editId = null;
        form.reset();
        document.getElementById("svcModalTitle").textContent = "Novo serviço";
        // Limpar pré-visualização da foto se houver
        const fotoPreview = document.getElementById("svcFotoPreview");
        if (fotoPreview) {
            fotoPreview.innerHTML = 'FOTO';
            delete fotoPreview.dataset.b64;
        }
    }

    form?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nome = document.getElementById("mNome").value.trim();
        const duracao = num(document.getElementById("mDuracao").value);
        const preco = num(document.getElementById("mPreco").value);

        if (!nome || duracao <= 0 || preco <= 0) {
            return toast("Preencha Nome, Duração e Preço corretamente.");
        }

        const payload = {
            nome: nome,
            duracao: duracao,
            preco: preco,
            custoTotal: num(document.getElementById("mCusto").value), // Custo simplificado por enquanto
            obs: document.getElementById("mObs").value.trim(),
            // Adicionar lógica de foto e materiais se necessário
            materiais: [], 
            foto: null,
            tipoServico: "unitario" // Simplificado como 'unitario' por enquanto
        };
        
        try {
            const docId = editId || servicosCollection.doc().id;
            await servicosCollection.doc(docId).set(payload, { merge: true });
            
            toast(`Serviço "${nome}" salvo com sucesso!`);
            closeModal(modal);
            carregarESalvarServicos();
        } catch (error) {
            console.error("Erro ao salvar serviço:", error);
            toast("Falha ao salvar o serviço.");
        }
    });

    // --- AÇÕES DA TABELA E MODAIS ---

    document.getElementById("svcTbody")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        
        const id = btn.closest("tr").dataset.id;
        const action = btn.dataset.action;
        const s = state.find(x => x.id === id);
        if (!s) return;

        if (action === "edit") {
            editId = s.id;
            document.getElementById("svcModalTitle").textContent = "Editar serviço";
            document.getElementById("mNome").value = s.nome || "";
            document.getElementById("mDuracao").value = s.duracao || "";
            document.getElementById("mPreco").value = s.preco || "";
            document.getElementById("mCusto").value = s.custoTotal || "";
            document.getElementById("mObs").value = s.obs || "";
            openModal(modal);
        } else if (action === "delete") {
            if (confirm(`Tem certeza que deseja excluir o serviço "${s.nome}"?`)) {
                servicosCollection.doc(id).delete()
                    .then(() => {
                        toast("Serviço excluído.");
                        carregarESalvarServicos();
                    })
                    .catch(err => {
                        console.error("Erro ao excluir:", err);
                        toast("Falha ao excluir serviço.");
                    });
            }
        }
    });
    
    // Funções de UI (abrir/fechar modais)
    const openModal = (el) => { if(el) el.classList.add("show"); };
    const closeModal = (el) => { if(el) el.classList.remove("show"); };
    document.getElementById("btnFabAddService")?.addEventListener("click", () => {
        resetForm();
        openModal(modal);
    });
    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.addEventListener("click", () => closeModal(btn.closest(".modal")));
    });
    document.getElementById("svcQ")?.addEventListener("input", renderTable);

    // --- INICIALIZAÇÃO ---
    carregarESalvarServicos();
})();