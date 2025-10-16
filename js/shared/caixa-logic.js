// js/shared/caixa-logic.js

// LÓGICA COMPARTILHADA PARA O CAIXA (ADMIN E FUNCIONÁRIO)
// Este objeto contém toda a funcionalidade que era duplicada.
const CaixaLogic = (function() {
    // --- Referências ao Firestore e estado interno ---
    const db = firebase.firestore();
    let clientes = [], funcionarios = [], servicos = [], produtos = [];
    let funcionarioFixo = null; // Usado pela tela do funcionário

    // --- Configurações ---
    const config = {
        taxas: { Dinheiro: 0, Pix: 0, Debito: 1.5, CreditoAVista: 3.0, CreditoParcelado: 4.0 }
    };

    // --- Referências do DOM (serão buscadas no init) ---
    let selCliente, selProfissional, inputData, listaServicos, listaProdutos, selPagamento;

    // --- Helper de formatação ---
    const fmtBRL = n => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

    // --- Função de Inicialização ---
    // Recebe os dados carregados pelas páginas específicas (admin ou funcionário)
    function init(data) {
        // Guarda os dados no estado interno do módulo
        clientes = data.clientes || [];
        servicos = data.servicos || [];
        produtos = data.produtos || [];
        funcionarios = data.funcionarios || [];
        funcionarioFixo = data.funcionarioFixo || null; // Se um funcionário fixo for passado

        // Busca os elementos do DOM
        selCliente = document.getElementById("caixaCliente");
        selProfissional = document.getElementById("caixaProfissional");
        inputData = document.getElementById("caixaData");
        listaServicos = document.getElementById("servicosLista");
        listaProdutos = document.getElementById("produtosLista");
        selPagamento = document.getElementById("formaPagamento");

        // Preenche os selects
        preencherSelect(selCliente, clientes, 'id', 'nome');
        if (!funcionarioFixo) { // Se não for a tela do funcionário, preenche a lista de profissionais
            preencherSelect(selProfissional, funcionarios, 'id', 'nome');
        }

        // Configura os listeners dos botões uma única vez
        setupEventListeners();
        
        // Reseta o formulário para o estado inicial
        resetarFormulario();
    }

    function setupEventListeners() {
        document.getElementById('addServico').addEventListener('click', adicionarLinhaServico);
        document.getElementById('addProduto').addEventListener('click', adicionarLinhaProduto);
        document.getElementById('formaPagamento').addEventListener('change', recalcularTudo);
        document.getElementById('btnFinalizar').addEventListener('click', finalizarVenda);
        document.getElementById('btnCancelar').addEventListener('click', resetarFormulario);
        setInterval(definirDataHoraAtual, 1000); // Mantém a hora atualizada
    }
    
    // --- FUNÇÕES DE LÓGICA (movidas de caixa.js e caixa-funcionario.js) ---
    // As funções abaixo são idênticas às que você já tinha, agora centralizadas aqui.

    function preencherSelect(select, dados, vKey, tKey) {
        select.innerHTML = '<option value="">Selecione...</option>';
        dados.forEach(item => {
            select.innerHTML += `<option value="${item[vKey]}">${item[tKey]}</option>`;
        });
    }

    async function finalizarVenda() {
        if (!selCliente.value || !selProfissional.value) return alert("Selecione um cliente e um profissional.");
        const funcionario = funcionarios.find(f => f.id === selProfissional.value);
        if (!funcionario) return alert("Profissional inválido.");

        const { servicosDaVenda, produtosDaVenda, valoresCalculados } = coletarEcalcularDadosVenda(funcionario);
        if (servicosDaVenda.length === 0 && produtosDaVenda.length === 0) return alert("Adicione pelo menos um serviço ou produto.");

        const novoLancamento = {
            dataISO: new Date(inputData.value).toISOString(),
            profissionalId: funcionario.id,
            profissionalNome: funcionario.nome,
            clienteId: selCliente.value,
            clienteNome: selCliente.options[selCliente.selectedIndex].text,
            tipo: "venda_pdv",
            servico: servicosDaVenda,
            produtos: produtosDaVenda,
            pagamento: { forma: selPagamento.value, parcelas: 1 },
            valores: valoresCalculados,
            obs: "Venda registrada via PDV"
        };

        try {
            await db.runTransaction(async (transaction) => {
                const produtoRefs = produtosDaVenda.map(item => db.collection("produtos").doc(item.produtoId));
                const produtoDocs = await Promise.all(produtoRefs.map(ref => transaction.get(ref)));
                const lancamentoRef = db.collection("lancamentos").doc();
                transaction.set(lancamentoRef, novoLancamento);

                for (let i = 0; i < produtosDaVenda.length; i++) {
                    const itemVendido = produtosDaVenda[i];
                    const produtoDoc = produtoDocs[i];
                    if (!produtoDoc.exists) throw new Error(`Produto "${itemVendido.nome}" não encontrado!`);

                    const novoEstoque = (produtoDoc.data().estoqueAtual || 0) - itemVendido.quantidade;
                    transaction.update(produtoRefs[i], { estoqueAtual: novoEstoque });

                    const kardexRef = db.collection("kardex").doc();
                    transaction.set(kardexRef, { 
                        productId: itemVendido.produtoId, 
                        tipo: "saida", 
                        motivo: itemVendido.brinde ? "brinde" : "venda",
                        dataISO: novoLancamento.dataISO, 
                        quantidade: itemVendido.quantidade,
                        custoUnitario: itemVendido.custoUnitarioAplicado
                    });
                }
            });
            alert("Venda finalizada com sucesso!");
            resetarFormulario();
        } catch (error) {
            console.error("Erro ao finalizar a venda:", error);
            alert(`Falha ao salvar a venda: ${error.message}`);
        }
    }

    function adicionarLinhaServico() {
        const div = document.createElement('div');
        div.className = 'item-lista-row';
        div.innerHTML = `
            <select class="servico-select" style="grid-column: 1 / 4;">
                <option value="">Selecione...</option>
                ${servicos.map(s => `<option value="${s.id}" data-valor="${s.preco}">${s.nome}</option>`).join('')}
            </select>
            <input type="text" class="servico-valor" value="${fmtBRL(0)}" disabled />
            <div class="del-btn" title="Remover">X</div>`;
        listaServicos.appendChild(div);

        div.querySelector('.servico-select').addEventListener('change', e => {
            const valor = e.target.options[e.target.selectedIndex].dataset.valor || 0;
            div.querySelector('.servico-valor').value = fmtBRL(Number(valor));
            recalcularTudo();
        });
        div.querySelector('.del-btn').addEventListener('click', () => { div.remove(); recalcularTudo(); });
    }

    function adicionarLinhaProduto() {
        const id = `prod_${Math.random().toString(36).slice(2, 9)}`;
        const div = document.createElement('div');
        div.className = 'item-lista-row';
        div.innerHTML = `
            <select class="produto-select">
                <option value="">Selecione...</option>
                ${produtos.map(p => `<option value="${p.id}" data-valor="${p.precoVenda}" data-cmp="${p.cmp || 0}">
                    ${p.nome} (Estoque: ${p.estoqueAtual || 0})</option>`).join('')}
            </select>
            <input type="number" class="produto-qtd" value="1" min="1" />
            <div>
                <input type="checkbox" id="brinde_${id}" class="produto-brinde" />
                <label for="brinde_${id}">Brinde</label>
            </div>
            <input type="text" class="produto-valor-total" value="${fmtBRL(0)}" disabled />
            <div class="del-btn" title="Remover">X</div>`;
        listaProdutos.appendChild(div);

        const recalcularLinha = () => {
            const sel = div.querySelector('.produto-select');
            const valorUnitario = sel.options[sel.selectedIndex].dataset.valor || 0;
            const qtd = div.querySelector('.produto-qtd').value || 1;
            const isBrinde = div.querySelector('.produto-brinde').checked;
            const total = isBrinde ? 0 : Number(valorUnitario) * Number(qtd);
            div.querySelector('.produto-valor-total').value = fmtBRL(total);
            recalcularTudo();
        };

        div.querySelectorAll('select, input').forEach(el => el.addEventListener('change', recalcularLinha));
        div.querySelector('.produto-qtd').addEventListener('input', recalcularLinha);
        div.querySelector('.del-btn').addEventListener('click', () => { div.remove(); recalcularTudo(); });
        recalcularLinha();
    }

    function recalcularTudo() {
        const { valoresCalculados } = coletarEcalcularDadosVenda(null); // Passa null para não calcular comissão ainda
        document.getElementById('resumoServicos').textContent = fmtBRL(valoresCalculados.receitaServicos);
        document.getElementById('resumoProdutos').textContent = fmtBRL(valoresCalculados.receitaProdutos);
        document.getElementById('resumoSubtotal').textContent = fmtBRL(valoresCalculados.receitaBruta);
        document.getElementById('resumoTaxa').textContent = `${fmtBRL(valoresCalculados.taxaPagamento)} (${config.taxas[selPagamento.value] || 0}%)`;
        document.getElementById('resumoTotalFinal').textContent = fmtBRL(valoresCalculados.receitaBruta - valoresCalculados.taxaPagamento);
    }
    
    function coletarEcalcularDadosVenda(funcionario) {
        const servicosDaVenda = Array.from(document.querySelectorAll('#servicosLista .item-lista-row')).map(row => {
            const sel = row.querySelector('.servico-select');
            const servicoInfo = servicos.find(s => s.id === sel.value);
            return servicoInfo ? { id: servicoInfo.id, nome: servicoInfo.nome, precoFinal: Number(servicoInfo.preco), custoMateriais: Number(servicoInfo.custoTotal || 0) } : null;
        }).filter(Boolean);

        const produtosDaVenda = Array.from(document.querySelectorAll('#produtosLista .item-lista-row')).map(row => {
            const sel = row.querySelector('.produto-select');
            const produtoInfo = produtos.find(p => p.id === sel.value);
            if (!produtoInfo) return null;
            const qtd = Number(row.querySelector('.produto-qtd').value);
            const isBrinde = row.querySelector('.produto-brinde').checked;
            return {
                produtoId: produtoInfo.id, nome: produtoInfo.nome, quantidade: qtd, brinde: isBrinde,
                precoUnitarioAplicado: isBrinde ? 0 : Number(produtoInfo.precoVenda),
                custoUnitarioAplicado: Number(sel.options[sel.selectedIndex].dataset.cmp || 0)
            };
        }).filter(Boolean);

        const receitaServicos = servicosDaVenda.reduce((acc, s) => acc + s.precoFinal, 0);
        const receitaProdutos = produtosDaVenda.reduce((acc, p) => acc + (p.precoUnitarioAplicado * p.quantidade), 0);
        const receitaBruta = receitaServicos + receitaProdutos;
        const taxaPagamento = (receitaBruta * (config.taxas[selPagamento.value] || 0)) / 100;
        
        let comissao = 0;
        if (funcionario && funcionario.commissionType) { // Calcula comissão apenas se um funcionário válido for passado
            if (funcionario.commissionType === "percentual") comissao = receitaServicos * (Number(funcionario.commissionValue || 0) / 100);
            else if (funcionario.commissionType === "valor_fixo") comissao = servicosDaVenda.length * Number(funcionario.commissionValue || 0);
        }

        const custoServicos = servicosDaVenda.reduce((acc, s) => acc + s.custoMateriais, 0);
        const custoProdutos = produtosDaVenda.reduce((acc, p) => acc + (p.custoUnitarioAplicado * p.quantidade), 0);
        const custoTotal = custoServicos + custoProdutos;

        const valoresCalculados = {
            receitaServicos, receitaProdutos, receitaBruta, taxaPagamento, comissao, custoTotal,
            resultadoLiquido: receitaBruta - taxaPagamento - comissao - custoTotal
        };

        return { servicosDaVenda, produtosDaVenda, valoresCalculados };
    }

    function resetarFormulario() {
        if(selCliente) selCliente.value = "";
        if(selProfissional && !funcionarioFixo) selProfissional.value = ""; // Só reseta se não for funcionário
        if(listaServicos) listaServicos.innerHTML = "";
        if(listaProdutos) listaProdutos.innerHTML = "";
        if(selPagamento) selPagamento.value = "Dinheiro";
        definirDataHoraAtual();
        recalcularTudo();
    }

    function definirDataHoraAtual() {
        if(!inputData) return;
        const agora = new Date();
        agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
        inputData.value = agora.toISOString().slice(0, 16);
    }

    // Expõe apenas a função de inicialização, que é o ponto de entrada do módulo
    return {
        init: init
    };

})();