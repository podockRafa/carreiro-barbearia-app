// js/layout-loader.js
(function () {
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (sidebarPlaceholder) {
        // O caminho './_menu.html' assume que o menu está na mesma pasta (admin/ ou funcionario/)
        const menuPath = window.location.pathname.includes('/admin/') ? '../admin/_menu.html' : './_menu.html';

        fetch(menuPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Arquivo _menu.html não encontrado (Status: ${response.status})`);
                }
                return response.text();
            })
            .then(menuHtml => {
                sidebarPlaceholder.innerHTML = menuHtml;
                highlightActiveNav();

                // >>> LÓGICA DO BOTÃO DE LOGOFF ADICIONADA AQUI <<<
                const logoutBtn = document.getElementById('adminLogoutBtn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => {
                        firebase.auth().signOut().then(() => {
                            // Redireciona para a página de login principal
                            window.location.href = '../../index.html';
                        }).catch(error => {
                            console.error("Erro ao fazer logoff:", error);
                        });
                    });
                }
                // >>> FIM DA LÓGICA DO LOGOFF <<<

            })
            .catch(error => {
                console.error('Erro ao carregar o layout:', error);
                sidebarPlaceholder.innerHTML = `<div style="padding: 20px; color: red;">${error.message}</div>`;
            });
    }

    function highlightActiveNav() {
        // ... (o resto da função highlightActiveNav continua igual)
        const links = Array.from(document.querySelectorAll(".admin-nav .nav-item"));
        if (!links.length) return;
        const currentPage = window.location.pathname.split("/").pop();
        const activeLink = links.find(a => (a.getAttribute("href") || "").includes(currentPage));
        if (activeLink) {
            links.forEach(a => a.classList.remove("active"));
            activeLink.classList.add("active");
            const color = activeLink.dataset.color || "#fff";
            activeLink.style.borderColor = color;
            activeLink.style.outlineColor = color;
            const dot = activeLink.querySelector('.dot');
            if (dot) dot.style.backgroundColor = color;
        }
    }
})();