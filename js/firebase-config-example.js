// js/firebase-config.js
// Este arquivo contém as "chaves" de acesso para o seu projeto Firebase e inicializa a conexão.

// 1. Objeto de configuração (copiado do painel do Firebase)
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_AUTH_DOMAIN_AQUI",
  projectId: "SEU_PROJECT_ID_AQUI",
  storageBucket: "SEU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "SEU_SENDER_ID_AQUI",
  appId: "SEU_APP_ID_AQUI"
};

// 2. Inicializa o Firebase (este é o comando para a versão 8 do SDK)
firebase.initializeApp(firebaseConfig);