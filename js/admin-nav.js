// ../js/admin-nav.js
document.addEventListener("DOMContentLoaded", () => {
  const links = Array.from(document.querySelectorAll(".admin-nav .nav-item"));
  if (!links.length) return;

  const current = location.pathname.split("/").pop().toLowerCase();
  let active = links.find(a => {
    const href = (a.getAttribute("href") || "").split("/").pop().toLowerCase();
    return current === href;
  }) || links[0];

  links.forEach(a => a.classList.remove("active"));
  active.classList.add("active");

  const color = active.dataset.color || "#fff";
  active.style.outline = `2px solid ${color}`;
  active.style.borderColor = color;
  const dot = active.querySelector(".dot");
  if (dot) dot.style.background = color;
});
