// js/login.js
// Responsável por login, cadastro, autenticação com Google e REDIRECIONAMENTO POR NÍVEL DE ACESSO

document.addEventListener("DOMContentLoaded", () => {
    const auth = firebase.auth();
    const firestore = firebase.firestore();

    // Função que decide para onde redirecionar o usuário após o login
    function redirecionarPorNivelDeAcesso(uid) {
        const funcionarioRef = firestore.collection("funcionarios").doc(uid);

        funcionarioRef.get().then((doc) => {
            if (doc.exists) {
                const accessType = doc.data().accessType;
                if (accessType === 'Admin') {
                    // <<-- CAMINHO CORRIGIDO -->>
                    window.location.href = "admin/agenda.html";
                } else {
                    // <<-- CAMINHO CORRIGIDO -->>
                    window.location.href = "funcionario/agenda.html";
                }
            } else {
                // Se não é funcionário, é cliente
                window.location.href = "home.html";
            }
        }).catch(err => {
            console.error("Erro ao verificar nível de acesso:", err);
            // Em caso de erro, manda para a home de cliente como padrão seguro
            window.location.href = "home.html";
        });
    }

    // --- LÓGICA DE LOGIN COM EMAIL E SENHA ---
    const formLogin = document.getElementById("formLogin");
    if (formLogin) {
        formLogin.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value;
            const senha = document.getElementById("loginSenha").value;
            const erroLogin = document.getElementById("loginErro");

            auth.signInWithEmailAndPassword(email, senha)
                .then((userCredential) => {
                    // Chama a função central de redirecionamento
                    redirecionarPorNivelDeAcesso(userCredential.user.uid);
                })
                .catch(err => {
                    let mensagemAmigavel = "";
                    console.error("Código do erro de login:", err.code); // Para nossa depuração

                    switch (err.code) {
                        case 'auth/invalid-credential':
                        case 'auth/user-not-found':
                        case 'auth/wrong-password':
                        case 'auth/internal-error': // <<< ADICIONE ESTA LINHA
                            mensagemAmigavel = "E-mail ou senha inválidos. Por favor, tente novamente.";
                            break;
                        case 'auth/invalid-email':
                            mensagemAmigavel = "O formato do e-mail é inválido.";
                            break;
                        default:
                            mensagemAmigavel = "Ocorreu um erro inesperado. Tente novamente mais tarde.";
                            break;
                    }
                    erroLogin.innerText = mensagemAmigavel;
                });
        });
    }

    // --- LÓGICA DE LOGIN COM GOOGLE (AGORA INTELIGENTE) ---
    const btnGoogle = document.getElementById("btnGoogle");
    if (btnGoogle) {
        btnGoogle.addEventListener("click", () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then(async (result) => {
                    const user = result.user;
                    const uid = user.uid;

                    // <<-- LÓGICA ATUALIZADA -->>
                    // Procura primeiro em 'funcionarios'
                    const funcionarioDoc = await firestore.collection("funcionarios").doc(uid).get();

                    if (funcionarioDoc.exists) {
                        // Se encontrou, redireciona como funcionário/admin
                        redirecionarPorNivelDeAcesso(uid);
                    } else {
                        // Se não, trata como cliente (cria se não existir)
                        const clienteDoc = await firestore.collection("clientes").doc(uid).get();
                        if (!clienteDoc.exists) {
                            await firestore.collection("clientes").doc(uid).set({
                                nome: user.displayName,
                                email: user.email,
                                telefone: user.phoneNumber || "Não informado",
                                criadoEm: new Date()
                            });
                        }
                        // E redireciona para a home de cliente
                        window.location.href = "home.html";
                    }
                })
                .catch(err => {
                    alert("Erro no login com Google: " + err.message);
                });
        });
    }

    // --- LÓGICA DE CADASTRO (PARA CLIENTES) ---
    const btnCadastro = document.getElementById("btnCadastro");
    if (btnCadastro) {
        btnCadastro.addEventListener("click", () => {
            // ... (o restante do código de cadastro continua igual, pois ele já está correto)
            const nome = document.getElementById("cadNome").value;
            const telefone = document.getElementById("cadTelefone").value;
            const email = document.getElementById("cadEmail").value;
            const senha = document.getElementById("cadSenha").value;
            const erroCadastro = document.getElementById("cadastroErro");

            if (!nome || !telefone || !email || !senha) {
                erroCadastro.innerText = "Preencha todos os campos obrigatórios.";
                return;
            }

            auth.createUserWithEmailAndPassword(email, senha)
                .then((userCred) => {
                    const user = userCred.user;
                    return firestore.collection("clientes").doc(user.uid).set({
                        nome: nome,
                        telefone: telefone,
                        email: email,
                        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    window.location.href = "home.html";
                })
                .catch(err => {
                    erroCadastro.innerText = "Erro: " + err.message;
                });
        });
    }

    // --- LÓGICA PARA ALTERNAR ENTRE FORMULÁRIOS E VER SENHA ---
    // ... (o restante do código para alternar formulários e ver senha continua o mesmo)
    const boxLogin = document.getElementById("boxLogin");
    const boxCadastro = document.getElementById("boxCadastro");
    const btnMostrarCadastro = document.getElementById("mostrarCadastro");
    const btnMostrarLogin = document.getElementById("mostrarLogin");

    if (btnMostrarCadastro) {
        btnMostrarCadastro.addEventListener("click", (e) => {
            e.preventDefault();
            boxLogin.style.display = "none";
            boxCadastro.style.display = "block";
        });
    }

    if (btnMostrarLogin) {
        btnMostrarLogin.addEventListener("click", (e) => {
            e.preventDefault();
            boxCadastro.style.display = "none";
            boxLogin.style.display = "block";
        });
    }

    const toggleSenha = document.getElementById("toggleSenha");
    const campoSenha = document.getElementById("loginSenha");

    if (toggleSenha && campoSenha) {
        toggleSenha.addEventListener("click", () => {
            const type = campoSenha.getAttribute("type") === "password" ? "text" : "password";
            campoSenha.setAttribute("type", type);
            toggleSenha.textContent = type === "password" ? "👁️" : "🙈";
        });
    }
});