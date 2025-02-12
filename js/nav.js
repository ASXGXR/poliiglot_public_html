// nav.js

document.addEventListener('DOMContentLoaded', async () => {
  const navPlaceholder = document.getElementById("nav-placeholder");

  if (navPlaceholder) {
    navPlaceholder.innerHTML = await (await fetch("nav.html")).text();
    
    // Ensure script runs only after nav is inserted
    initializeNav();
  }
});

function initializeNav() {
  const pages = { library: "library-page", translator: null, currency: "currency-page", settings: "settings-page" };
  const navItems = Object.keys(pages);
  const activeClass = "active-nav";

  // Hide all pages except the default (null) one
  document.querySelectorAll(Object.values(pages).filter(Boolean).map(p => `.${p}`).join(", "))
    .forEach(el => el.style.display = "none");

  // Set default active nav
  const defaultPage = navItems.find(id => pages[id] === null);
  if (defaultPage) document.getElementById(defaultPage)?.classList.add(activeClass);

  navItems.forEach(id => {
    document.getElementById(id)?.addEventListener("click", () => {
      // Hide all pages and remove active class from all nav items
      document.querySelectorAll(Object.values(pages).filter(Boolean).map(p => `.${p}`).join(", "))
        .forEach(el => el.style.display = "none");
      navItems.forEach(nav => document.getElementById(nav)?.classList.remove(activeClass));

      // Show the selected page & set active class
      if (pages[id]) document.querySelector(`.${pages[id]}`).style.display = "flex";
      document.getElementById(id)?.classList.add(activeClass);
    });
  });
}