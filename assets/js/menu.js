// menu.js - Handles sidebar menu navigation and section switching

const dashboardMenu = document.getElementById("dashboardMenu");
const transactionsMenu = document.getElementById("transactionsMenu");
const reportsMenu = document.getElementById("reportsMenu");
const settingsMenu = document.getElementById("settingsMenu");
const dashboardSection = document.getElementById("dashboardSection");
const transactionsSection = document.getElementById("transactionsSection");

const baseClasses =
  "flex items-center px-6 py-4 gap-3 hover:bg-indigo-50 hover:text-indigo-600 transition font-medium";
const activeClasses =
  "text-lg font-semibold text-indigo-600 bg-indigo-50 border-l-4 border-indigo-500";

function setActive(menu) {
  [dashboardMenu, transactionsMenu, reportsMenu, settingsMenu].forEach((m) => {
    m.className = baseClasses;
  });
  menu.className = baseClasses + " " + activeClasses;
}

setActive(dashboardMenu);

dashboardMenu.addEventListener("click", (e) => {
  e.preventDefault();
  dashboardSection.classList.remove("hidden");
  transactionsSection.classList.add("hidden");
  setActive(dashboardMenu);
});

transactionsMenu.addEventListener("click", (e) => {
  e.preventDefault();
  dashboardSection.classList.add("hidden");
  transactionsSection.classList.remove("hidden");
  setActive(transactionsMenu);
});

reportsMenu.addEventListener("click", (e) => {
  e.preventDefault();
  setActive(reportsMenu);
  // Section not implemented, keep hidden
  dashboardSection.classList.add("hidden");
  transactionsSection.classList.add("hidden");
});

settingsMenu.addEventListener("click", (e) => {
  e.preventDefault();
  setActive(settingsMenu);
  // Section not implemented, keep hidden
  dashboardSection.classList.add("hidden");
  transactionsSection.classList.add("hidden");
});
