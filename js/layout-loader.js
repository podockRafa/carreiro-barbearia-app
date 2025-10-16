// js/layout-loader.js
// Responsável por carregar o menu (sidebar) e destacar o link ativo.

(function () {
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');

    if (sidebarPlaceholder) {
        // Busca o arquivo _menu.html a partir da mesma pasta da página atual (ex: /admin/)
        fetch('./_menu.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Arquivo _menu.html não encontrado (Status: ${response.status})`);
                }
                return response.text();
            })
            .then(menuHtml => {
                sidebarPlaceholder.innerHTML = menuHtml;
                highlightActiveNav(); // Chama a função para destacar o link
            })
            .catch(error => {
                console.error('Erro ao carregar o layout:', error);
                sidebarPlaceholder.innerHTML = `<div style="padding: 20px; color: red;">${error.message}</div>`;
            });
    }

    function highlightActiveNav() {
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
            if(dot) dot.style.backgroundColor = color;
        }
    }
})();