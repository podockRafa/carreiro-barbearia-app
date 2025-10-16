// js/admin.js
// Lógica do Dashboard, agora integrado com dados reais do Firebase Firestore

document.addEventListener("DOMContentLoaded", () => {
    // Inicializa o serviço do Firestore
    const db = firebase.firestore();

    // --- Helpers ---
    const toBRL = v => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const setText = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
    };

    // Função principal para carregar e processar os dados
    async function carregarDadosDoDashboard() {
        try {
            // Busca todos os lançamentos ordenados pela data mais recente
            const lancamentosSnap = await db.collection("lancamentos").orderBy("dataISO", "desc").get();
            const lancamentos = lancamentosSnap.docs.map(doc => doc.data());

            if (lancamentos.length === 0) {
                // Se não houver dados, exibe uma mensagem
                document.getElementById('view-dashboard').innerHTML = '<p style="text-align:center; padding: 20px;">Nenhum lançamento encontrado para gerar o dashboard.</p>';
                return;
            }

            // Processa os dados para o Dashboard
            processarErenderizarDashboard(lancamentos);

        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
            alert("Falha ao carregar dados do dashboard.");
        }
    }

    function processarErenderizarDashboard(lancamentos) {
        // --- 1. CÁLCULO DOS KPIs PRINCIPAIS ---
        
        const receitaTotal = lancamentos.reduce((acc, l) => acc + (l.valores?.receitaBruta || 0), 0);
        // Despesas e Lucro (simplificado por enquanto, pois não temos um módulo de despesas)
        const despesasTotais = lancamentos.reduce((acc, l) => acc + (l.valores?.taxaPagamento || 0) + (l.valores?.comissao || 0) + (l.valores?.custoTotal || 0), 0);
        const lucroLiquido = receitaTotal - despesasTotais;
        const totalAtendimentos = lancamentos.filter(l => l.servico && l.servico.length > 0).length;
        const ticketMedio = totalAtendimentos > 0 ? receitaTotal / totalAtendimentos : 0;

        // Renderiza os KPIs no HTML
        setText("kpiReceita", toBRL(receitaTotal));
        setText("kpiDespesas", toBRL(despesasTotais));
        setText("kpiLucro", toBRL(lucroLiquido));
        setText("kpiTicket", toBRL(ticketMedio));

        // --- 2. CÁLCULO DOS RANKINGS (TOP SERVIÇOS E PRODUTOS) ---

        const servicosContador = {};
        const produtosContador = {};

        lancamentos.forEach(l => {
            // Conta os serviços
            if (l.servico) {
                l.servico.forEach(s => {
                    if (!servicosContador[s.nome]) servicosContador[s.nome] = { nome: s.nome, qtd: 0, receita: 0 };
                    servicosContador[s.nome].qtd++;
                    servicosContador[s.nome].receita += s.precoFinal || 0;
                });
            }
            // Conta os produtos
            if (l.produtos) {
                l.produtos.forEach(p => {
                    if (!p.brinde) { // Apenas produtos pagos contam para o ranking de receita
                        if (!produtosContador[p.nome]) produtosContador[p.nome] = { nome: p.nome, qtd: 0, receita: 0 };
                        produtosContador[p.nome].qtd += p.quantidade || 0;
                        produtosContador[p.nome].receita += (p.precoUnitarioAplicado || 0) * (p.quantidade || 0);
                    }
                });
            }
        });
        
        // Converte os contadores em arrays e ordena por receita
        const topServicos = Object.values(servicosContador).sort((a, b) => b.receita - a.receita);
        const topProdutos = Object.values(produtosContador).sort((a, b) => b.receita - a.receita);

        // Renderiza os rankings
        renderRank("rankServicos", topServicos);
        renderRank("rankProdutos", topProdutos);

        // --- 3. TABELA DE ENTRADAS RECENTES ---
        const entradasRecentes = lancamentos.slice(0, 5); // Pega os 5 mais recentes
        renderTabelaEntradas("tabEntradas", entradasRecentes);
    }

    // Funções auxiliares de renderização
    function renderRank(ulId, list) {
        const ul = document.getElementById(ulId);
        if (!ul) return;
        ul.innerHTML = list.slice(0, 5).map(item => // Mostra o Top 5
            `<li><span>${item.nome} (${item.qtd})</span><span>${toBRL(item.receita)}</span></li>`
        ).join("");
    }
    
    function renderTabelaEntradas(tableId, lancamentos) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (!tbody) return;
        tbody.innerHTML = lancamentos.map(l => {
            const desc = (l.servico && l.servico[0]?.nome) || (l.produtos && l.produtos[0]?.nome) || 'Venda';
            return `
                <tr>
                    <td>${new Date(l.dataISO).toLocaleDateString('pt-BR')}</td>
                    <td>${l.tipo || 'Venda'}</td>
                    <td>${desc}</td>
                    <td>${l.pagamento?.forma || '-'}</td>
                    <td>${toBRL(l.valores?.resultadoLiquido || 0)}</td>
                </tr>
            `;
        }).join("");
    }

    // --- INICIALIZAÇÃO ---
    carregarDadosDoDashboard();
});