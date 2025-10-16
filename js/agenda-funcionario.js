// js/agenda-funcionario.js

// VERSÃO CORRIGIDA: Garante que a UI só é atualizada após o sucesso da operação no Firestore.
document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.firestore();
    const auth = firebase.auth();
    const listaAgendaEl = document.getElementById('lista-agenda');
    const headerTitleEl = document.getElementById('header-title');
    const employeeNameBadge = document.getElementById('employeeName');
    let currentUserId = null; // Variável para guardar o ID do usuário logado

    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUserId = user.uid; // Armazena o ID do usuário
            try {
                // Busca o nome do perfil para exibir na tela
                const userProfile = await db.collection("funcionarios").doc(user.uid).get();
                const userName = userProfile.exists && userProfile.data().nome ? userProfile.data().nome : user.email;
                if (employeeNameBadge) employeeNameBadge.textContent = userName;

                // Carrega a agenda do usuário
                await carregarAgenda(user.uid);
            } catch (error) {
                console.error("Erro ao inicializar a página da agenda:", error);
                if (listaAgendaEl) listaAgendaEl.innerHTML = `<p>Ocorreu um erro ao carregar seus dados.</p>`;
            }
        } else {
            window.location.href = "../../index.html";
        }
    });

    async function carregarAgenda(uid) {
        const hoje = new Date();
        if (headerTitleEl) headerTitleEl.textContent = 'Sua Agenda de Hoje';
        const inicioDoDia = new Date(hoje.setHours(0, 0, 0, 0)).toISOString();
        const fimDoDia = new Date(hoje.setHours(23, 59, 59, 999)).toISOString();

        try {
            const agendSnapshot = await db.collection("agendamentos")
                .where('profissionalId', '==', uid)
                .where('inicioISO', '>=', inicioDoDia)
                .where('inicioISO', '<=', fimDoDia)
                .orderBy('inicioISO')
                .get();

            if (agendSnapshot.empty) {
                listaAgendaEl.innerHTML = '<p class="muted" style="text-align: center; padding: 20px;">Nenhum agendamento para hoje.</p>';
                return;
            }

            const agendamentosDoDia = agendSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderLista(agendamentosDoDia);

        } catch (error) {
            console.error("Erro ao carregar agenda:", error);
            if (error.code === 'failed-precondition') {
                listaAgendaEl.innerHTML = '<p style="color:red; text-align:center;">Erro: É necessário criar um índice no Firestore. Abra o console do admin (F12) para encontrar o link.</p>';
            } else {
                listaAgendaEl.innerHTML = '<p>Erro ao carregar a agenda.</p>';
            }
        }
    }

    function renderLista(agendamentos) {
        listaAgendaEl.innerHTML = agendamentos.map(ag => {
            const hora = new Date(ag.inicioISO).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const status = ag.status || 'Pendente';
            // Os botões só aparecem se o status ainda for 'Pendente'
            const acoesVisiveis = status === 'Pendente';

            return `
                <div class="agenda-item" data-id="${ag.id}">
                    <div class="agenda-details">
                        <h4>${hora} - ${ag.clienteNome}</h4>
                        <p>Serviço: ${ag.servicoNome}</p>
                        <p>Status: <strong class="appointment-status">${status}</strong></p>
                    </div>
                    <div class="appointment-actions">
                        ${acoesVisiveis ? `
                            <button class="btn btn-green btn-sm" data-action="marcar-compareceu" title="Marcar Compareceu">✓ Compareceu</button>
                            <button class="btn btn-red btn-sm" data-action="marcar-nao-compareceu" title="Marcar Falta">X Faltou</button>
                        ` : `<strong>Status Definido!</strong>`
                        }
                    </div>
                </div>`;
        }).join('');
    }

    listaAgendaEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const agendamentoId = btn.closest('.agenda-item').dataset.id;
        const action = btn.dataset.action;

        if (action === "marcar-compareceu") {
            atualizarStatus(agendamentoId, "Compareceu");
        } else if (action === "marcar-nao-compareceu") {
            atualizarStatus(agendamentoId, "Não Compareceu");
        }
    });

    async function atualizarStatus(agendamentoId, novoStatus) {
        try {
            // Primeiro, tenta atualizar o banco de dados
            await db.collection("agendamentos").doc(agendamentoId).update({ status: novoStatus });

            // --- ALTERAÇÃO: Se a atualização der certo, recarrega a lista inteira ---
            // Isso garante que a UI sempre mostrará a informação real do banco de dados.
            alert(`Status do agendamento atualizado para "${novoStatus}".`);
            await carregarAgenda(currentUserId);

        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert("Não foi possível atualizar o status. Tente novamente.");
        }
    }
});