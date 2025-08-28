// menu.js - Handles sidebar menu navigation and section switching


const menuMap = [
  { menu: "dashboardMenu", section: "dashboardSection" },
  { menu: "transactionsMenu", section: "transactionsSection" },
  { menu: "reportsMenu", section: "reportsSection" },
  { menu: "settingsMenu", section: "settingsSection" },
];

const baseClasses = "flex items-center px-6 py-4 gap-3 hover:bg-indigo-50 hover:text-indigo-600 transition font-medium";
const activeClasses = "text-lg font-semibold text-indigo-600 bg-indigo-50 border-l-4 border-indigo-500";

function setActive(menuEl) {
  menuMap.forEach(({ menu }) => {
    document.getElementById(menu).className = baseClasses;
  });
  menuEl.className = baseClasses + " " + activeClasses;
}

function showSection(sectionId) {
  menuMap.forEach(({ section }) => {
    document.getElementById(section).classList.add("hidden");
  });
  document.getElementById(sectionId).classList.remove("hidden");
}

// Attach event listeners
menuMap.forEach(({ menu, section }) => {
  const menuEl = document.getElementById(menu);
  menuEl.addEventListener("click", (e) => {
    e.preventDefault();
    setActive(menuEl);
    showSection(section);
    if (menu === "reportsMenu") {
      if (typeof renderLineChart === "function") renderLineChart();
      if (typeof renderTrendBarChart === "function") renderTrendBarChart();
    }
  });
});

// Set initial state
setActive(document.getElementById("dashboardMenu"));
showSection("dashboardSection");
