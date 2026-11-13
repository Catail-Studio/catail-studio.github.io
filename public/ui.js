// The design system's few behaviours (design.css): tabs that switch their panels, the menus in
// the top bar closing when you click elsewhere or press Esc, and the bar marking the page you're on.

/* ---------- Tabs ---------- */

function setupTabs(root) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const select = (tab, focus = false) => {
    for (const each of tabs) {
      const on = each === tab;
      each.setAttribute("aria-selected", String(on));
      each.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(each.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    }
    if (focus) tab.focus();
  };
  for (const tab of tabs) {
    tab.addEventListener("click", () => select(tab));
    // Arrow keys move along the row, as tabs do.
    tab.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      select(tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length], true);
    });
  }
  select(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0]);
}

/* ---------- The products menu ---------- */

function setupMenus() {
  const menus = [...document.querySelectorAll(".ui-nav__menu, .ui-nav__mobile")];
  addEventListener("click", (event) => {
    // A click outside closes a menu, and so does picking one of its links.
    for (const menu of menus) {
      if (!menu.contains(event.target) || event.target.closest("a")) menu.open = false;
    }
  });
  addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    for (const menu of menus) {
      if (!menu.open) continue;
      menu.open = false;
      menu.querySelector("summary")?.focus();
    }
  });
}

/* ---------- The page you're on ---------- */

function markCurrent() {
  const page = (url) => url.pathname.replace(/index\.html$/, "");
  const here = page(location);
  for (const link of document.querySelectorAll(".ui-nav__links > a, .ui-nav__sheet a")) {
    const url = new URL(link.href, location.href);
    if (!url.hash && url.origin === location.origin && page(url) === here) link.setAttribute("aria-current", "page");
  }
}

for (const root of document.querySelectorAll(".ui-tabs")) setupTabs(root);
setupMenus();
markCurrent();
