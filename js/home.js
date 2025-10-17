// js/home.js
// Protege a página, busca o nome do cliente no Firestore e liga os botões

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializa os serviços do Firebase
    const auth = firebase.auth();
    const db = firebase.firestore();

    // 2. Pega todos os elementos da página de uma vez
    const nomeSpan = document.getElementById("nomeCliente");
    const btnAgendar = document.getElementById("btnAgendar");
    const btnHistorico = document.getElementById("btnHistorico");
    const btnLogout = document.getElementById("btnLogout");

    // 3. Lógica de proteção da rota e carregamento de dados
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }
        try {
            const doc = await db.collection("clientes").doc(user.uid).get();
            let nome = "Cliente"; // Define um padrão
            if (doc.exists && doc.data().nome) {
                nome = doc.data().nome;
            } else if (user.displayName) {
                nome = user.displayName;
            }
            nomeSpan.textContent = nome.split(' ')[0];
        } catch (err) {
            console.error("Erro ao carregar dados do usuário:", err);
            nomeSpan.textContent = "Cliente";
        }
    });

    // 4. Lógica de todos os botões, agrupada
    if (btnAgendar) {
        btnAgendar.addEventListener("click", () => {
            window.location.href = "agendar-servico.html";
        });
    }

    if (btnHistorico) {
        btnHistorico.addEventListener("click", () => {
            window.location.href = "historico.html";
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            firebase.auth().signOut().then(() => {
                window.location.href = "index.html";
            }).catch((error) => {
                console.error("Erro ao fazer logoff:", error);
                alert("Não foi possível sair. Tente novamente.");
            });
        });
    }
});