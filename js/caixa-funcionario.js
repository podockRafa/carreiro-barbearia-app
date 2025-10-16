// js/caixa-funcionario.js
// VERSÃO CORRIGIDA: Apenas carrega os dados e inicializa a lógica compartilhada.

document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.firestore();
    const auth = firebase.auth();

    const employeeNameBadge = document.getElementById('employeeName');
    const selProfissional = document.getElementById("caixaProfissional");

    auth.onAuthStateChanged(user => {
        if (user) {
            carregarDadosIniciais(user);
        } else {
            console.log("Usuário não autenticado, redirecionando para o login.");
            window.location.href = '../../index.html';
        }
    });

    async function carregarDadosIniciais(user) {
        try {
            // 1. Busca todos os dados necessários em paralelo
            const [clientesSnap, servsSnap, prodsSnap, funcDoc] = await Promise.all([
                db.collection("clientes").orderBy("nome").get(),
                db.collection("servicos").where("tipoServico", "==", "unitario").orderBy("nome").get(),
                db.collection("produtos").orderBy("nome").get(),
                db.collection("funcionarios").doc(user.uid).get()
            ]);

            // Valida se o perfil do funcionário existe
            if (!funcDoc.exists) {
                throw new Error("Perfil de funcionário não encontrado no banco de dados.");
            }

            // 2. Formata os dados para o formato que o CaixaLogic espera
            const funcionarioLogado = { id: user.uid, ...funcDoc.data() };
            const clientes = clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const servicos = servsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const produtos = prodsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 3. Atualiza a interface específica da página do funcionário
            if (employeeNameBadge) {
                employeeNameBadge.textContent = funcionarioLogado.nome;
            }
            
            // Preenche e trava o select do profissional
            selProfissional.innerHTML = `<option value="${funcionarioLogado.id}">${funcionarioLogado.nome}</option>`;
            selProfissional.disabled = true;
            
            // 4. Inicia a lógica compartilhada do caixa, passando os dados carregados
            // A variável 'CaixaLogic' vem do arquivo js/shared/caixa-logic.js
            CaixaLogic.init({
                clientes: clientes,
                servicos: servicos,
                produtos: produtos,
                funcionarios: [funcionarioLogado], // Passa apenas o funcionário logado
                funcionarioFixo: true // Indica que o profissional não pode ser alterado
            });

        } catch (error) {
            console.error("Erro ao carregar dados iniciais para o caixa do funcionário:", error);
            alert("Não foi possível carregar os dados para o Caixa. Verifique o console (F12) para mais detalhes.");
        }
    }
});