# 💈 Sistema de Gestão para Barbearia - Sr. Carreiro

![Status do Projeto](https://img.shields.io/badge/status-concluído-green)
![Tecnologia](https://img.shields.io/badge/frontend-JS%20puro-yellow)
![Tecnologia](https://img.shields.io/badge/backend-Firebase-orange)

Este é um sistema web completo para gestão e agendamento em barbearias, desenvolvido como uma aplicação full-stack utilizando JavaScript puro ("Vanilla JS") e a plataforma Firebase como backend. A solução foi projetada para modernizar a operação do negócio, automatizando processos e fornecendo dados estratégicos para a tomada de decisões.

A aplicação atende a três perfis de usuários distintos: **Clientes**, **Funcionários** e **Administradores**, cada um com seu próprio painel e funcionalidades específicas para suas necessidades.

**➡️ [Clique aqui para ver o projeto ao vivo](https://barbearia-srcarreiro.web.app)**

---

## ✨ Funcionalidades Principais

O sistema é dividido em três portais, cada um com uma experiência de usuário dedicada:

### 👤 Portal do Cliente
Uma interface limpa e direta, focada em facilitar o agendamento para o cliente final.
* **Autenticação Completa:** Cadastro e login com E-mail/Senha, além de login social com Google para maior conveniência.
* **Fluxo de Agendamento Intuitivo:** Um processo guiado em 4 etapas (Escolha do Serviço -> Profissional -> Dia e Horário -> Confirmação) garante uma experiência de usuário sem atritos.
* **Histórico de Agendamentos:** O cliente tem acesso a um histórico de todos os seus agendamentos passados e futuros, com status visual de comparecimento.
* **Experiência de Aplicativo (PWA):** O site é um Progressive Web App, permitindo que o cliente o "instale" na tela inicial do celular. Ele funciona como um app nativo e possui capacidade de acesso offline aos recursos essenciais.

### ✂️ Portal do Funcionário
Um painel de controle focado na produtividade e autonomia do profissional.
* **Acesso Restrito:** Login seguro que direciona o funcionário para um painel com suas ferramentas de trabalho diárias.
* **Agenda do Dia:** Visualização clara e objetiva de todos os seus agendamentos para o dia corrente, com a capacidade de marcar o status do cliente (compareceu ou não).
* **Gestão de Disponibilidade:** O próprio funcionário pode configurar seus dias e horários de trabalho, bloqueando ou liberando horários em sua agenda pessoal para os próximos 30 dias.
* **Módulo de Caixa (PDV):** Permite registrar os serviços realizados e produtos vendidos em cada atendimento, calculando totais e finalizando a venda diretamente pelo seu painel.

### 🚀 Portal do Administrador
O centro de comando do negócio, com acesso a todas as funcionalidades de gestão.
* **Dashboard Gerencial Completo:** Um painel com indicadores de performance (KPIs) essenciais em tempo real, como receita, despesas, lucro líquido e ticket médio.
* **Gestão Total (CRUD):** Controle total sobre as entidades do sistema:
    * **Clientes:** Cadastro, busca, edição e visualização de todos os clientes da barbearia.
    * **Funcionários:** Gerenciamento da equipe, com definição de nível de acesso (Admin/Funcionário).
    * **Serviços:** Criação e edição do catálogo de serviços, definindo preço, duração e custos associados.
    * **Produtos e Estoque:** Controle de inventário com movimentações de entrada (compra) e saída (venda, consumo, perda), além do cálculo de Custo Médio Ponderado (CMP).
* **Visão Financeira Detalhada:** Tela de **Lançamentos** com um registro completo de todas as transações, incluindo filtros avançados por data, profissional, cliente e forma de pagamento.
* **Controle de Agenda Global:** O admin pode visualizar e configurar a agenda de todos os funcionários a partir de um único painel.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (ES6+ "Vanilla")
* **Backend & Database:** [Firebase](https://firebase.google.com/)
    * **Firebase Authentication** para gerenciamento de usuários e logins sociais.
    * **Firestore Database** como banco de dados NoSQL em tempo real.
    * **Firebase Hosting** para a hospedagem de alta performance e com CDN global.
* **PWA (Progressive Web App):**
    * Manifest.json para metadados da aplicação.
    * Service Workers para funcionalidade offline e cache.
* **Ferramentas:** Git, GitHub, VS Code

---

## 📂 Estrutura do Projeto

O código é organizado de forma modular para facilitar a manutenção e escalabilidade, separando as responsabilidades de cada parte da aplicação.

```
/
├── assets/         # Imagens, ícones e logos
├── css/            # Arquivos de estilo (admin.css, styles.css)
├── html/           # Todas as páginas do sistema
│   ├── admin/      # Páginas exclusivas do painel de admin
│   └── funcionario/# Páginas exclusivas do painel de funcionário
└── js/             # Lógica da aplicação em JavaScript
│   └── shared/     # Scripts compartilhados entre painéis
├── firebase.json   # Configuração do Firebase Hosting
├── firestore.rules # Regras de Segurança do banco de dados
├── README.md       # Este arquivo
└── .gitignore      # Arquivos a serem ignorados pelo Git
```