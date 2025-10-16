// js/home.js
// Protege a página, busca o nome do cliente no Firestore e liga os botões

document.addEventListener("DOMContentLoaded", () => {
    // Inicializa os serviços do Firebase
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Pega os elementos da página que vamos manipular
    const nomeSpan = document.getElementById("nomeCliente");
    const btnAgendar = document.getElementById("btnAgendar");
    const btnHistorico = document.getElementById("btnHistorico");

    // --- PROTEÇÃO DA ROTA E CARREGAMENTO DE DADOS ---
    // Esta função verifica se o usuário está logado. Ela é chamada sempre que o estado da autenticação muda.
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Se não houver usuário logado, redireciona imediatamente para a página de login
            window.location.href = "index.html";
            return;
        }

        // Se o usuário está logado, vamos buscar o nome dele para exibir na saudação
        try {
            // Busca o documento do cliente no Firestore usando o ID do usuário logado (user.uid)
            const doc = await db.collection("clientes").doc(user.uid).get();
            let nome = "";

            if (doc.exists && doc.data().nome) {
                // Se encontramos o documento e ele tem um nome, usamos esse nome
                nome = doc.data().nome;
            } else if (user.displayName) {
                // Se não, mas o usuário logou com Google, usamos o nome do Google
                nome = user.displayName;
            } else {
                // Como último recurso, usamos "Cliente"
                nome = "Cliente";
            }
            // Atualiza o texto na tela com o primeiro nome do cliente
            nomeSpan.textContent = nome.split(' ')[0];

        } catch (err) {
            console.error("Erro ao carregar dados do usuário:", err);
            nomeSpan.textContent = "Cliente";
        }
    });

    // --- AÇÕES DOS BOTÕES ---

    // Evento de clique para o botão "Agendar agora"
    if (btnAgendar) {
        btnAgendar.addEventListener("click", () => {
            // Redireciona para a primeira página do fluxo de agendamento
            // <<-- CORREÇÃO AQUI -->>
            window.location.href = "agendar-servico.html";
        });
    }

    // Evento de clique para o botão "Histórico"
    if (btnHistorico) {
        btnHistorico.addEventListener("click", () => {
            // Redireciona para a página de histórico de agendamentos
            window.location.href = "historico.html"; // Este já estava correto
        });
    }
});