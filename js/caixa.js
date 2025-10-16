// =================================================================
//      VERSÃO FINAL E COMPLETA - js/caixa.js
// =================================================================

// Adicionamos um "guarda" que espera o Firebase confirmar o login
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        // Usuário está logado e verificado! AGORA podemos carregar os dados.
        console.log("Admin autenticado. Carregando dados do caixa...");
        carregarDadosIniciais();
    } else {
        // Se por algum motivo o usuário não estiver logado, redireciona para o login.
        console.error("Acesso negado. Usuário admin não está logado.");
        alert("Você precisa estar logado como admin para acessar esta página.");
        // Ajuste o caminho para a sua página de login se for diferente
        window.location.href = '../../index.html'; 
    }
});

// A função de carregar dados, agora limpa e usando Promise.all
async function carregarDadosIniciais() {
    const db = firebase.firestore();
    try {
        // Carrega todos os dados necessários de uma vez
        const [clientesSnap, funcsSnap, servsSnap, prodsSnap] = await Promise.all([
            db.collection("clientes").orderBy("nome").get(),
            db.collection("funcionarios").orderBy("nome").get(),
            db.collection("servicos").where("tipoServico", "==", "unitario").orderBy("nome").get(),
            db.collection("produtos").orderBy("nome").get()
        ]);

        const clientes = clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const funcionarios = funcsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const servicos = servsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const produtos = prodsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Inicializa a lógica de caixa compartilhada
        CaixaLogic.init({
            clientes: clientes,
            servicos: servicos,
            produtos: produtos,
            funcionarios: funcionarios
        });

    } catch (error) {
        console.error("Erro fatal ao carregar dados iniciais:", error);
        alert("Não foi possível carregar os dados. Verifique o console (F12).");
    }
}