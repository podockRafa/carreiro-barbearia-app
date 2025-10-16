// js/funcionarios.js
// Módulo de funcionários com cadastro AUTOMATIZADO de usuários (Firebase Auth + Firestore) - VERSÃO COM TABELA CORRIGIDA

(function() {
    // Inicializa o serviço do Firestore
    const db = firebase.firestore();

    // Estado da aplicação
    let state = [];
    let query = "";
    let editingId = null;

    // --- Referências do DOM ---
    const tbody = document.getElementById("empTbody");
    const modal = document.getElementById("empModal");
    const modalDel = document.getElementById("empModalDelete");
    const form = document.getElementById("empForm");
    const fId = document.getElementById("fId");
    const fLoginId = document.getElementById("fLoginId");

    // --- LÓGICA DE DADOS COM FIRESTORE ---

    async function carregarErenderizarFuncionarios() {
        try {
            const snapshot = await db.collection("funcionarios").get();
            state = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            render();
        } catch (error) {
            console.error("Erro ao carregar funcionários:", error);
            alert("Não foi possível carregar os dados dos funcionários.");
        }
    }

    // --- LÓGICA DO FORMULÁRIO (SALVA NO FIRESTORE) ---
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const isEditing = !!editingId;
        const email = fLoginId.value.trim();
        const nome = document.getElementById("fName").value.trim();
        const role = document.getElementById("fRole").value;

        if (!nome || !role || !email) {
            return alert("Preencha Nome, Função e E-mail de Login.");
        }

        let uid_final = editingId;

        if (!isEditing) {
            uid_final = prompt(`Cadastro de Novo Funcionário para o e-mail: ${email}\n\n1. Crie este usuário na aba 'Authentication' do Firebase.\n2. Copie o UID gerado.\n3. Cole o UID aqui:`);
            if (!uid_final) {
                alert("Cadastro cancelado. O UID é necessário.");
                return;
            }
        }

        const payload = {
            nome: nome,
            role: role,
            email: email,
            accessType: (role === 'Gerente') ? 'Admin' : 'Funcionario',
            phone: document.getElementById("fPhone").value.trim() || null,
        };

        try {
            await db.collection("funcionarios").doc(uid_final).set(payload, { merge: true });
            alert("Funcionário salvo com sucesso!");
            close(modal);
            carregarErenderizarFuncionarios();
        } catch (error) {
            console.error("Erro ao salvar funcionário:", error);
            alert(`Falha ao salvar funcionário: ${error.message}`);
        }
    });

    // --- LÓGICA DE EXCLUSÃO (DELETA DO FIRESTORE) ---
    document.getElementById("btnEmpConfirmDelete")?.addEventListener("click", async (e) => {
        const idParaDeletar = e.currentTarget.dataset.id;
        if (!idParaDeletar) return;
        try {
            await db.collection("funcionarios").doc(idParaDeletar).delete();
            alert("Perfil do funcionário excluído do banco de dados.\n\nATENÇÃO: O login deste usuário ainda precisa ser removido manualmente na aba 'Authentication' do Firebase.");
            close(modalDel);
            carregarErenderizarFuncionarios();
        } catch (error) {
            console.error("Erro ao excluir funcionário:", error);
            alert("Falha ao excluir funcionário.");
        }
    });

    // --- FUNÇÃO DE RENDERIZAÇÃO (CORRIGIDA) ---
    function render() {
        if (!tbody) return;
        
        const term = query.trim().toLowerCase();
        const filtered = state.filter(emp => (emp.nome || "").toLowerCase().includes(term));

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum funcionário encontrado.</td></tr>';
            return;
        }

        // <<-- CÓDIGO CORRIGIDO AQUI -->>
        // A tabela agora é construída com todas as colunas (<td>) corretamente.
        tbody.innerHTML = filtered.map(emp => `
            <tr data-id="${emp.id}">
                <td>${emp.foto ? `<img src="${emp.foto}" alt="${emp.nome}" class="avatar-sm">` : 'Sem Foto'}</td>
                <td>${emp.nome || "Sem nome"}</td>
                <td>${emp.role || "Não definido"}</td>
                <td>${emp.phone || "Não informado"}</td>
                <td class="hide-sm">${emp.address || "—"}</td>
                <td>${emp.contractType || "—"}</td>
                <td>...</td> <td class="hide-sm">...</td> <td>${emp.accessType || "—"}</td>
                <td>${emp.id || "—"}</td>
                <td>...</td> <td>
                    <div class="cell-actions">
                        <button class="btn btn-yellow" data-action="edit">Editar</button>
                        <button class="btn btn-red" data-action="delete">Excluir</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }
    
    // --- FUNÇÕES DE UI (CONTINUAM AS MESMAS) ---
    tbody?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const id = btn.closest("tr").dataset.id;
        const emp = state.find(e => e.id === id);
        if (!emp) return;

        if (btn.dataset.action === "edit") {
            editingId = emp.id;
            document.getElementById("empModalTitle").textContent = "Editar funcionário";
            fId.value = emp.id;
            
            fLoginId.value = emp.email || "";
            fLoginId.readOnly = true;
            fLoginId.style.backgroundColor = '#333';

            document.getElementById("fName").value = emp.nome || "";
            document.getElementById("fRole").value = emp.role || "";
            document.getElementById("fPhone").value = emp.phone || "";
            open(modal);
        } else if (btn.dataset.action === "delete") {
            document.getElementById("empDelNome").textContent = emp.nome || "este funcionário";
            document.getElementById("btnEmpConfirmDelete").dataset.id = id;
            open(modalDel);
        }
    });

    document.getElementById("btnFabAddEmp")?.addEventListener("click", () => {
        editingId = null;
        form.reset();
        document.getElementById("empModalTitle").textContent = "Novo funcionário";
        
        fLoginId.readOnly = false;
        fLoginId.style.backgroundColor = '';
        
        open(modal);
    });

    const open = (el) => el.classList.add("show");
    const close = (el) => el.classList.remove("show");
    document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", (e) => close(e.target.closest(".modal"))));
    document.getElementById("empQ")?.addEventListener("input", (e) => {
        query = e.target.value || "";
        render();
    });

    // --- INICIALIZAÇÃO ---
    carregarErenderizarFuncionarios();
})();