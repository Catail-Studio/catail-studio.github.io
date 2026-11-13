// The design system's few behaviours (design.css): tabs that switch their panels, the menus in
// the top bar closing when you click elsewhere or press Esc, and the bar marking the page you're on.

/* ---------- Tabs ---------- */

function setupTabs(root) {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  let restartTimer = () => {};
  const select = (tab, focus = false) => {
    for (const each of tabs) {
      const on = each === tab;
      each.setAttribute("aria-selected", String(on));
      each.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(each.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    }
    if (focus) tab.focus();
    restartTimer();
  };
  restartTimer = setupAutoplay(root, () => {
    const current = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    select(tabs[(current + 1) % tabs.length]);
  });
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

// Tabs with data-autoplay="<ms>" move on by themselves: a bar under the row fills up, and when
// it's full the next tab opens. A click still opens any tab at once and starts the bar again.
// The bar waits while the tabs are off screen, the page is hidden or the mouse is over them, and
// there is none at all for a visitor who asked for less motion. Returns "start the bar again".
function setupAutoplay(root, next) {
  const ms = Number(root.dataset.autoplay);
  if (!ms || matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const timer = document.createElement("div");
  timer.className = "ui-tabs__timer";
  timer.setAttribute("aria-hidden", "true");
  const bar = document.createElement("i");
  timer.append(bar);
  root.querySelector('[role="tablist"]').after(timer);

  // The clock: how long the open tab has been showing, counted only while nothing holds it.
  const TICK_MS = 100;
  let shown = 0;
  let seen = false;
  let hovered = false;
  const held = () => !seen || hovered || document.hidden;
  setInterval(() => {
    if (held()) return;
    shown += TICK_MS;
    bar.style.transform = `scaleX(${Math.min(shown / ms, 1)})`;
    if (shown >= ms) next();
  }, TICK_MS);

  new IntersectionObserver(
    ([entry]) => {
      seen = entry.isIntersecting;
    },
    { threshold: 0.3 },
  ).observe(root);
  // Mouse only: a finger never "leaves", and would stop the bar for good.
  root.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") hovered = true;
  });
  root.addEventListener("pointerleave", () => {
    hovered = false;
  });

  return () => {
    shown = 0;
    // Back to empty at once, not sliding back.
    bar.style.transition = "none";
    bar.style.transform = "scaleX(0)";
    void bar.offsetWidth;
    bar.style.transition = "";
  };
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
