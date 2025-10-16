// js/lancamentos.js
// Módulo de Lançamentos, integrado com o Firebase Firestore

(function() {
    // Inicializa o serviço do Firestore
    const db = firebase.firestore();

    // --- Helpers ---
    const fmtBRL = n => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
    
    // --- Estado da Aplicação (dados que virão do Firebase) ---
    let todosLancs = []; // Todos os lançamentos carregados
    let funcs = [], clis = [], servs = [], prods = []; // Dados de outras coleções

    // --- Referências do DOM ---
    const tbody = document.getElementById("lanTbody");
    // ... (outras referências de filtros e modais)

    // --- LÓGICA DE CARREGAMENTO DE DADOS ---

    // Função principal que carrega todos os dados necessários
    async function carregarTodosOsDados() {
        try {
            // Carrega em paralelo os dados de apoio (funcionários, clientes, etc.)
            const [funcsSnap, clisSnap, servsSnap, prodsSnap] = await Promise.all([
                db.collection("funcionarios").get(),
                db.collection("clientes").get(),
                db.collection("servicos").get(),
                db.collection("produtos").get()
            ]);

            funcs = funcsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            clis = clisSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            servs = servsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            prods = prodsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Preenche os filtros da página
            preencherFiltros();

            // Carrega os lançamentos e renderiza a tabela
            await carregarErenderizarLancamentos();

        } catch (error) {
            console.error("Erro ao carregar dados de apoio:", error);
            alert("Falha ao carregar dados essenciais para a página de lançamentos.");
        }
    }

    async function carregarErenderizarLancamentos() {
        try {
            // Por performance, em um app real, faríamos a filtragem no backend.
            // Aqui, vamos carregar todos e filtrar no cliente para manter a simplicidade.
            const snapshot = await db.collection("lancamentos").orderBy("dataISO", "desc").get();
            todosLancs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            render(); // Renderiza a tabela com os dados carregados
        } catch (error) {
            console.error("Erro ao carregar lançamentos:", error);
            tbody.innerHTML = `<tr><td colspan="13">Erro ao carregar lançamentos.</td></tr>`;
        }
    }
    
    function preencherFiltros() {
        const fProf = document.getElementById('fProf');
        const fCli = document.getElementById('fCli');
        
        if (fProf) {
            fProf.innerHTML = '<option value="">Todos</option>' + funcs.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
        }
        if (fCli) {
            fCli.innerHTML = '<option value="">Todos</option>' + clis.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        }
    }

    // --- RENDERIZAÇÃO E FILTROS ---

    function render() {
        if (!tbody) return;
        
        // Aplica os filtros selecionados na tela (lógica simplificada)
        const filteredLancs = aplicarFiltros(todosLancs);

        // Renderiza KPIs (indicadores)
        renderKPIs(filteredLancs);

        if (filteredLancs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding: 20px;">Nenhum lançamento encontrado para os filtros selecionados.</td></tr>`;
            return;
        }

        tbody.innerHTML = filteredLancs.map(lanc => {
            const data = new Date(lanc.dataISO).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            return `
                <tr>
                    <td>${data}</td>
                    <td>${lanc.profissionalNome || "—"}</td>
                    <td>${lanc.clienteNome || "—"}</td>
                    <td>${(lanc.servico && lanc.servico.length > 0) ? lanc.servico.map(s => s.nome).join(', ') : "—"}</td>
                    <td>${(lanc.produtos && lanc.produtos.length > 0) ? lanc.produtos.map(p => `${p.nome} x${p.quantidade}`).join(', ') : "—"}</td>
                    <td>${lanc.pagamento?.forma || "—"}</td>
                    <td>${fmtBRL(lanc.valores?.receitaBruta)}</td>
                    <td>${fmtBRL(lanc.valores?.taxaPagamento)}</td>
                    <td>${fmtBRL(lanc.valores?.comissao)}</td>
                    <td>${fmtBRL(lanc.valores?.custoTotal)}</td>
                    <td>${fmtBRL(lanc.valores?.resultadoLiquido)}</td>
                    <td>
                        <div class="cell-actions">
                            <button class="btn btn-red" data-action="delete" data-id="${lanc.id}">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }
    
    function aplicarFiltros(lancamentos) {
        // Esta função pode ser expandida com a lógica de todos os filtros da tela
        // Por enquanto, ela retorna a lista completa
        return lancamentos;
    }

    function renderKPIs(lancamentosFiltrados) {
        const sum = (key) => lancamentosFiltrados.reduce((acc, lanc) => acc + (lanc.valores?.[key] || 0), 0);
        
        document.getElementById("kpiReceitaBruta").textContent = fmtBRL(sum("receitaBruta"));
        document.getElementById("kpiTaxas").textContent = fmtBRL(sum("taxaPagamento"));
        document.getElementById("kpiComissoes").textContent = fmtBRL(sum("comissao"));
        document.getElementById("kpiCustos").textContent = fmtBRL(sum("custoTotal"));
        document.getElementById("kpiResultado").textContent = fmtBRL(sum("resultadoLiquido"));
    }

    // --- AÇÕES (Exclusão, etc.) ---
    tbody?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='delete']");
        if (!btn) return;

        const id = btn.dataset.id;
        const lanc = todosLancs.find(l => l.id === id);
        if (!lanc) return;

        if (confirm(`Tem certeza que deseja excluir o lançamento de ${lanc.clienteNome} no valor de ${fmtBRL(lanc.valores?.receitaBruta)}?`)) {
            db.collection("lancamentos").doc(id).delete()
                .then(() => {
                    alert("Lançamento excluído.");
                    carregarErenderizarLancamentos(); // Recarrega a lista
                })
                .catch(err => {
                    console.error("Erro ao excluir lançamento:", err);
                    alert("Falha ao excluir lançamento.");
                });
        }
    });

    // --- INICIALIZAÇÃO ---
    // A primeira coisa que a página faz é carregar todos os dados
    carregarTodosOsDados();
})();