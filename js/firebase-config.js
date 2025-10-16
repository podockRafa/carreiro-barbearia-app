// js/firebase-config.js
// Este arquivo contém as "chaves" de acesso para o seu projeto Firebase e inicializa a conexão.

// 1. Objeto de configuração (copiado do painel do Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyDnonB0uJT7281aF1Gz4tK2pfmmF_Hnz5M",
  authDomain: "barbearia-srcarreiro.firebaseapp.com",
  projectId: "barbearia-srcarreiro",
  storageBucket: "barbearia-srcarreiro.appspot.com",
  messagingSenderId: "572916176261",
  appId: "1:572916176261:web:1897acc19ad63ed80860ec"
};

// 2. Inicializa o Firebase (este é o comando para a versão 8 do SDK)
firebase.initializeApp(firebaseConfig);