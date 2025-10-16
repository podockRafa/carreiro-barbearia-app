// js/clientes.js
// Módulo de clientes do Admin, AGORA integrado com o Firebase Firestore

(function() {
    // Inicializa os serviços do Firebase que vamos usar na página
    const db = firebase.firestore();
    const auth = firebase.auth(); // Adicionado para a re-autenticação

    // Coleções que vamos usar
    const clientesCollection = db.collection("clientes");
    const funcionariosCollection = db.collection("funcionarios");

    // Estado da aplicação (dados que vêm do Firebase)
    let state = [];
    let query = ""; // Para a barra de busca

    // Referências do DOM
    const tbody = document.getElementById("cliTbody");

    // --- LÓGICA DE DADOS COM FIRESTORE ---

    // Função principal para carregar os clientes do Firestore e renderizar a tabela
    async function carregarErenderizarClientes() {
        try {
            const snapshot = await clientesCollection.get();
            state = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            render();
        } catch (error) {
            console.error("Erro ao carregar clientes do Firestore:", error);
            tbody.innerHTML = `<tr><td colspan="7">Erro ao carregar dados. Verifique o console (F12).</td></tr>`;
        }
    }

    // Função que "promove" um cliente a funcionário, com verificação de senha
    async function promoverParaFuncionario(clienteId) {
        const adminUser = auth.currentUser;
        if (!adminUser) {
            return alert("Erro: Admin não está logado. Faça login novamente.");
        }

        const senha = prompt("Para confirmar esta operação, por favor, digite sua senha de administrador:");
        if (!senha) {
            return alert("Operação cancelada.");
        }

        try {
            const credencial = firebase.auth.EmailAuthProvider.credential(adminUser.email, senha);
            await adminUser.reauthenticateWithCredential(credencial);

            if (!confirm("Senha correta! Tem certeza que deseja promover este cliente a funcionário? O perfil de cliente dele será removido.")) {
                return;
            }

            const cliente = state.find(c => c.id === clienteId);
            if (!cliente) throw new Error("Cliente não encontrado.");

            const novoFuncionario = {
                nome: cliente.nome,
                email: cliente.email,
                phone: cliente.telefone || null,
                role: "Barbeiro", // Cargo padrão
                accessType: "Funcionario"
            };

            await funcionariosCollection.doc(cliente.id).set(novoFuncionario);
            await clientesCollection.doc(cliente.id).delete();

            alert(`${cliente.nome} foi promovido a funcionário com sucesso!`);
            carregarErenderizarClientes(); // Atualiza a lista de clientes

        } catch (error) {
            console.error("Erro na operação de promoção:", error);
            if (error.code === 'auth/wrong-password') {
                alert("Senha incorreta. Operação cancelada.");
            } else {
                alert(`Ocorreu um erro: ${error.message}`);
            }
        }
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO E UI ---

    // Função que desenha a tabela de clientes
    function render() {
        if (!tbody) return;
        
        const term = query.trim().toLowerCase();
        const filtered = state.filter(cliente => (cliente.nome || "").toLowerCase().includes(term));

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Nenhum cliente encontrado no banco de dados.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(cliente => {
            const dataNasc = cliente.nascimento ? new Date(cliente.nascimento).toLocaleDateString('pt-BR') : "—";
            return `
                <tr data-id="${cliente.id}">
                    <td>${cliente.foto ? `<img src="${cliente.foto}" alt="${cliente.nome}" style="width:40px;height:40px;border-radius:50%;">` : 'Sem Foto'}</td>
                    <td>${cliente.nome || "—"}</td>
                    <td>${cliente.telefone || "—"}</td>
                    <td class="hide-sm">${cliente.email || "—"}</td>
                    <td class="hide-sm">${dataNasc}</td>
                    <td>—</td> <td>
                        <div class="cell-actions">
                            <button class="btn btn-green" data-action="promote" title="Promover a Funcionário">Promover</button>
                            <button class="btn btn-yellow" data-action="edit">Editar</button>
                            <button class="btn btn-red" data-action="delete">Excluir</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }
    
    // Delegação de eventos na tabela para os botões de ação
    tbody?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;

        const id = btn.closest("tr").dataset.id;
        const action = btn.dataset.action;

        if (action === "promote") {
            promoverParaFuncionario(id);
        } else if (action === "edit") {
            alert(`Funcionalidade "Editar Cliente" (ID: ${id}) a ser implementada.`);
        } else if (action === "delete") {
            alert(`Funcionalidade "Excluir Cliente" (ID: ${id}) a ser implementada.`);
        }
    });

    // Lógica da barra de busca
    document.getElementById("cliQ")?.addEventListener("input", (e) => {
        query = e.target.value || "";
        render();
    });

    // --- INICIALIZAÇÃO ---
    // A primeira coisa que a página faz é carregar os clientes do Firebase
    carregarErenderizarClientes();
})();