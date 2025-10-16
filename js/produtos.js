// js/produtos.js
// Módulo de Produtos, Estoque e Kardex, integrado com o Firebase Firestore

(function() {
    // Inicializa o serviço do Firestore
    const db = firebase.firestore();
    const produtosCollection = db.collection("produtos");
    const kardexCollection = db.collection("kardex");

    // --- Helpers ---
    const fmtBRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));
    const badge = (label, color) => `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;background:${color};color:#000;font-weight:800">${label}</span>`;
    
    // --- Estado e Referências do DOM ---
    let produtos = []; // Guardará os produtos vindos do Firestore
    let query = "";
    const tbody = document.getElementById("prdTbody");
    const modal = document.getElementById("prdModal");
    const movModal = document.getElementById("movModal");
    const delModal = document.getElementById("prdModalDelete");
    const form = document.getElementById("prdForm");
    const movForm = document.getElementById("movForm");

    // --- LÓGICA DE DADOS COM FIRESTORE ---

    async function carregarErenderizarProdutos() {
        try {
            const snapshot = await produtosCollection.orderBy("nome").get();
            produtos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            render();
        } catch (error) {
            console.error("Erro ao carregar produtos:", error);
            tbody.innerHTML = `<tr><td colspan="12">Erro ao carregar produtos.</td></tr>`;
        }
    }

    // --- RENDERIZAÇÃO DA TABELA ---

    function render() {
        if (!tbody) return;
        const term = query.trim().toLowerCase();
        const data = produtos.filter(p => (p.nome || "").toLowerCase().includes(term));

        tbody.innerHTML = data.map(p => {
            const lucro = Number(p.precoVenda || 0) - Number(p.cmp || 0);
            const margem = p.precoVenda > 0 ? (lucro / Number(p.precoVenda)) * 100 : 0;
            const st = statusProd(p);
            const stChip = st === "ZERADO" ? badge("ZERADO", "#ff7878") : st === "BAIXO" ? badge("BAIXO", "#ffd166") : badge("OK", "#a0e7a0");
            
            return `
                <tr data-id="${p.id}">
                    <td>${p.nome || ""}</td>
                    <td>${p.sku || p.id}</td>
                    <td>${p.categoria || "—"}</td>
                    <td>${p.unidade || ""}</td>
                    <td>${p.estoqueAtual ?? 0}</td>
                    <td>${p.estoqueMinimo ?? 0}</td>
                    <td>${fmtBRL(p.precoVenda || 0)}</td>
                    <td>${fmtBRL(p.cmp || 0)}</td>
                    <td>${fmtBRL(lucro)} <span class="muted">(${margem.toFixed(0)}%)</span></td>
                    <td>${stChip}</td>
                    <td class="hide-sm">${p.fornecedor || "—"}</td>
                    <td class="cell-actions">
                        <button class="btn btn-yellow" data-act="edit" title="Editar">✏️</button>
                        <button class="btn btn-blue" data-act="move" title="Movimentar">🔁</button>
                        <button class="btn btn-red" data-act="del" title="Excluir">🗑️</button>
                    </td>
                </tr>`;
        }).join("");
    }

    function statusProd(p) {
        if ((p.estoqueAtual ?? 0) <= 0) return "ZERADO";
        if ((p.estoqueAtual ?? 0) <= (p.estoqueMinimo ?? 0)) return "BAIXO";
        return "OK";
    }

    // --- LÓGICA DO MODAL DE PRODUTO (CRIAR/EDITAR) ---

    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("pId").value;
        const nome = document.getElementById("pNome").value.trim();
        const sku = document.getElementById("pSKU").value.trim();
        if (!nome || !sku) return alert("Preencha Nome e SKU.");

        const isEditing = !!id;
        const docId = isEditing ? id : produtosCollection.doc().id;
        
        const existingProduct = isEditing ? produtos.find(p => p.id === id) : {};

        const payload = {
            nome: nome,
            sku: sku,
            categoria: document.getElementById("pCategoria").value.trim() || null,
            unidade: document.getElementById("pUn").value.trim() || "un",
            precoVenda: Number(document.getElementById("pPreco").value || 0),
            fornecedor: document.getElementById("pFornecedor").value.trim() || null,
            estoqueMinimo: Number(document.getElementById("pEstMin").value || 0),
            obs: document.getElementById("pObs").value.trim() || "",
            // Mantém os valores de estoque e custo se estiver editando
            estoqueAtual: existingProduct.estoqueAtual ?? 0,
            cmp: existingProduct.cmp ?? 0,
        };

        try {
            await produtosCollection.doc(docId).set(payload, { merge: true });
            toast("Produto salvo com sucesso!");
            close(modal);
            carregarErenderizarProdutos();
        } catch (error) {
            console.error("Erro ao salvar produto:", error);
            toast("Falha ao salvar produto.");
        }
    });

    // --- LÓGICA DO MODAL DE MOVIMENTAÇÃO DE ESTOQUE ---

    movForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("mProductId").value;
        const p = produtos.find(x => x.id === id);
        if (!p) return alert("Produto não encontrado.");

        const tipo = document.getElementById("mTipo").value;
        const qtd = Number(document.getElementById("mQtd").value || 0);
        const nowISO = new Date().toISOString();
        
        let novoEstoque = Number(p.estoqueAtual || 0);
        let novoCmp = Number(p.cmp || 0);
        const kardexEntry = { productId: p.id, dataISO: nowISO, quantidade: qtd };

        if (tipo === "entrada") {
            const custo = Number(document.getElementById("mCusto").value || 0);
            if (qtd <= 0 || custo < 0) return alert("Informe quantidade e custo válidos.");
            
            const estAnt = Number(p.estoqueAtual || 0);
            const cmpAnt = Number(p.cmp || 0);
            const novoEstoqueTotal = estAnt + qtd;
            novoCmp = novoEstoqueTotal > 0 ? (estAnt * cmpAnt + qtd * custo) / novoEstoqueTotal : custo;
            novoEstoque = novoEstoqueTotal;

            Object.assign(kardexEntry, { tipo: "entrada", motivo: "compra", custoUnitario: custo });

        } else if (tipo === "saida") {
            if (qtd <= 0) return alert("Quantidade deve ser > 0.");
            novoEstoque -= qtd;
            Object.assign(kardexEntry, { tipo: "saida", motivo: document.getElementById("mMotivo").value, custoUnitario: novoCmp });

        } else if (tipo === "ajuste") {
            novoEstoque += qtd; // qtd pode ser negativa para ajuste de baixa
            Object.assign(kardexEntry, { tipo: "ajuste", motivo: document.getElementById("mJust").value, custoUnitario: novoCmp });
        }
        
        try {
            // Usa uma transação para garantir que o produto e o kardex sejam atualizados juntos
            await db.runTransaction(async (transaction) => {
                const productRef = produtosCollection.doc(p.id);
                transaction.update(productRef, { estoqueAtual: novoEstoque, cmp: novoCmp });
                
                const kardexRef = kardexCollection.doc(); // Cria um novo documento com ID automático
                transaction.set(kardexRef, kardexEntry);
            });
            
            toast("Movimentação de estoque salva com sucesso!");
            close(movModal);
            carregarErenderizarProdutos();
        } catch (error) {
            console.error("Erro ao movimentar estoque:", error);
            toast("Falha ao salvar movimentação.");
        }
    });

    // --- AÇÕES DA TABELA E ABERTURA DE MODAIS ---
    
    tbody?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-act]");
        if (!btn) return;
        
        const id = btn.closest("tr").dataset.id;
        const p = produtos.find(x => x.id === id);
        if (!p) return;

        if (btn.dataset.act === "edit") {
            document.getElementById("prdModalTitle").textContent = "Editar produto";
            document.getElementById("pId").value = p.id;
            // Preencher o resto do formulário
            document.getElementById("pNome").value = p.nome || "";
            document.getElementById("pSKU").value = p.sku || "";
            // ... (outros campos)
            open(modal);

        } else if (btn.dataset.act === "del") {
            document.getElementById("prdDelNome").textContent = p.nome || "este produto";
            document.getElementById("btnPrdConfirmDelete").dataset.id = id;
            open(delModal);

        } else if (btn.dataset.act === "move") {
            document.getElementById("movTitle").textContent = `Movimentar: ${p.nome}`;
            document.getElementById("mProductId").value = p.id;
            open(movModal);
        }
    });

    document.getElementById("btnPrdConfirmDelete")?.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        try {
            await produtosCollection.doc(id).delete();
            toast("Produto excluído.");
            close(delModal);
            carregarErenderizarProdutos();
        } catch (error) {
            console.error("Erro ao excluir produto:", error);
            toast("Falha ao excluir produto.");
        }
    });

    // Abertura do modal de novo produto
    document.getElementById("btnFabAddPrd")?.addEventListener("click", () => {
        form.reset();
        document.getElementById("pId").value = "";
        document.getElementById("prdModalTitle").textContent = "Novo produto";
        open(modal);
    });
    
    // Funções de UI (abrir/fechar modais)
    const open = (el) => { if(el) el.classList.add("show"); };
    const close = (el) => { if(el) el.classList.remove("show"); };
    document.querySelectorAll("[data-close]").forEach(b => {
        b.addEventListener("click", () => b.closest(".modal") && close(b.closest(".modal")));
    });
    document.getElementById("prdQ")?.addEventListener("input", (e) => {
        query = e.target.value || "";
        render();
    });
    
    const toast = msg => alert(msg); // Placeholder para notificações

    // --- INICIALIZAÇÃO ---
    carregarErenderizarProdutos();
})();