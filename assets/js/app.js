// Selectors
const balanceEl = document.querySelector("#balance");
const incomeEl = document.querySelector("#income");
const expenseEl = document.querySelector("#expense");
const tableBody = document.querySelector("#transaction-body");
const addBtn = document.getElementById("addBtn");
const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const transactionForm = document.getElementById("transactionForm");
const filterEl = document.getElementById("filter");
const categoryFilterEl = document.getElementById("categoryFilter");
const sortEl = document.getElementById("sort");
const fromDateEl = document.getElementById("fromDate");
const toDateEl = document.getElementById("toDate");
const API_BASE_URL =
  "https://68ae7584b91dfcdd62b9356a.mockapi.io/incomeandexpence";

let transactions = [];
let currency = localStorage.getItem("currency") || "₹";
let barChartInstance = null;
let editingIndex = null;

async function addTransactionAPI(transaction) {
  const res = await fetch(API_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
  return await res.json();
}

async function updateTransactionAPI(id, transaction) {
  const res = await fetch(`${API_BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
  return await res.json();
}

async function deleteTransactionAPI(id) {
  await fetch(`${API_BASE_URL}/${id}`, { method: "DELETE" });
}

async function loadTransactions() {
  const fromDateStr = fromDateEl ? fromDateEl.value : null;
  const toDateStr = toDateEl ? toDateEl.value : null;
  let url = API_BASE_URL;
  const params = [];
  if (fromDateStr) params.push(`date_gte=${fromDateStr}`);
  if (toDateStr) params.push(`date_lte=${toDateStr}`);
  if (params.length) url += `?${params.join("&")}`;
  console.log("Fetching transactions from:", url);
  let res = await fetch(url);
  let data = await res.json();
  // If no data returned and filters were applied, try fetching all
  if (data.length === 0 && params.length) {
    console.warn("No data with date filter, retrying without filter");
    res = await fetch(API_BASE_URL);
    data = await res.json();
  }
  console.log("API data loaded:", data);
  return data;
}

let pieChartInstance = null;
function renderChart() {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const pieCanvas = document.getElementById("pieChart");
  if (!pieCanvas) return;
  const ctx = pieCanvas.getContext("2d");

  // Destroy previous pie chart instance if exists
  if (pieChartInstance) {
    pieChartInstance.destroy();
  }

  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Income", "Expense"],
      datasets: [
        {
          data: [income, expense],
          backgroundColor: ["#16a34a", "#dc2626"],
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: "bottom",
        },
      },
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

// ---------- Modal Controls ----------
addBtn.addEventListener("click", () => {
  editingIndex = null; // Add mode
  transactionForm.reset();
  modal.classList.remove("hidden");
});

closeModal.addEventListener("click", () => {
  editingIndex = null; // reset when closed
  modal.classList.add("hidden");
});

if (sortEl) {
  sortEl.addEventListener("change", renderTransactions);
}

// ---------- Render Transactions ----------
function renderTransactions() {
  const typeFilter = filterEl ? filterEl.value : "all";
  const categoryFilter = categoryFilterEl ? categoryFilterEl.value : "all";
  const fromDateStr = fromDateEl.value;
  const toDateStr = toDateEl.value;

  // Date filtering is now handled by API, only filter by type and category here
  console.log("All transactions:", transactions);
  const filtered = transactions.filter((t) => {
    const typeMatch = typeFilter === "all" || t.type === typeFilter;
    const categoryMatch =
      categoryFilter === "all" || t.category === categoryFilter;
    return typeMatch && categoryMatch;
  });
  console.log("Filtered transactions:", filtered);

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No transactions found.</td></tr>`;
    attachRowButtons();
    renderChart();
    updateSummary();
    renderBarChart();
    return;
  }
  // inside renderTransactions, after filtering
  if (sortEl) {
    switch (sortEl.value) {
      case "date_asc":
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case "date_desc":
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case "amount_asc":
        filtered.sort((a, b) => a.amount - b.amount);
        break;
      case "amount_desc":
        filtered.sort((a, b) => b.amount - a.amount);
        break;
    }
  }

  tableBody.innerHTML = filtered
    .map((t) => {
      const realIndex = transactions.findIndex((tr) => tr.id === t.id);
      // Convert Unix timestamp to date string if needed
      let displayDate = "";
      if (typeof t.date === "number") {
        const d = new Date(t.date * 1000); // Unix timestamp (seconds)
        displayDate = d.toLocaleDateString("en-GB");
      } else if (typeof t.date === "string" && !isNaN(Date.parse(t.date))) {
        displayDate = new Date(t.date).toLocaleDateString("en-GB");
      } else {
        displayDate = t.date || "-";
      }
      // Defensive: ensure t.amount is a number
      let amount = Number(t.amount);
      if (isNaN(amount)) amount = 0;
      return `
      <tr class="border-b hover:bg-gray-50 transition">
        <td class="px-6 py-3">${displayDate}</td>
        <td class="px-6 py-3">
          <span class="px-2 py-1 rounded text-white ${
            t.category === "Food"
              ? "bg-green-500"
              : t.category === "Travel"
              ? "bg-blue-500"
              : "bg-gray-500"
          }">
            ${t.category}
          </span>
        </td>
        <td class="px-6 py-3 ${
          t.type === "income" ? "text-green-600" : "text-red-600"
        }">${t.type}</td>
        <td class="px-6 py-3">${currency} ${amount.toLocaleString()}</td>
        <td class="px-6 py-3 flex space-x-2">
          <button class="editBtn px-2 py-1 bg-yellow-400 rounded hover:bg-yellow-500 text-white" data-index="${realIndex}">Edit</button>
          <button class="deleteBtn px-2 py-1 bg-red-500 rounded hover:bg-red-600 text-white" data-index="${realIndex}">Delete</button>
        </td>
      </tr>
    `;
    })
    .join("");
  attachRowButtons();
  renderChart();
  updateSummary();
  renderBarChart();
}

if (filterEl) {
  filterEl.addEventListener("change", () => {
    renderTransactions();
  });
}

if (categoryFilterEl) {
  categoryFilterEl.addEventListener("change", () => {
    renderTransactions();
  });
}

[fromDateEl, toDateEl].forEach((el) => {
  el.addEventListener("change", async () => {
    transactions = await loadTransactions();
    renderTransactions();
  });
});

// Populate category filter dynamically
function populateCategoryFilter() {
  const categories = [...new Set(transactions.map((t) => t.category))];
  categoryFilterEl.innerHTML =
    `<option value="all">All</option>` +
    categories.map((c) => `<option value="${c}">${c}</option>`).join("");
}

// ---------- Update Summary ----------
function updateSummary() {
  let income = 0,
    expense = 0;

  transactions.forEach((t) =>
    t.type === "income" ? (income += t.amount) : (expense += t.amount)
  );

  balanceEl.textContent = `${currency} ${(income - expense).toLocaleString()}`;
  incomeEl.textContent = `${currency} ${income.toLocaleString()}`;
  expenseEl.textContent = `${currency} ${expense.toLocaleString()}`;
}

// ---------- Attach Row Buttons ----------
function attachRowButtons() {
  document.querySelectorAll(".deleteBtn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const realIndex = parseInt(btn.dataset.index, 10);
      if (isNaN(realIndex)) return;
      await deleteTransactionAPI(transactions[realIndex].id);
      transactions = await loadTransactions();
      renderTransactions();
      updateSummary();
      populateCategoryFilter();
      renderChart();
      renderBarChart();
    })
  );

  document.querySelectorAll(".editBtn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const realIndex = parseInt(btn.dataset.index, 10);
      if (isNaN(realIndex)) return;
      openEditModal(realIndex);
    })
  );
}

// ---------- Submit Handler ----------
transactionForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const amountValue = parseFloat(document.getElementById("amount").value);
  if (isNaN(amountValue)) {
    return alert("Please enter a valid amount");
  }

  const transactionData = {
    id: editingIndex !== null ? transactions[editingIndex].id : Date.now(),
    date: document.getElementById("date").value,
    category: document.getElementById("category").value,
    type: document.getElementById("type").value,
    amount: amountValue,
  };

  if (editingIndex !== null) {
    await updateTransactionAPI(transactions[editingIndex].id, transactionData);
    editingIndex = null;
  } else {
    await addTransactionAPI(transactionData);
  }

  transactions = await loadTransactions();
  // Ensure all UI updates after transaction change
  populateCategoryFilter();
  updateSummary();
  renderTransactions();
  renderChart();
  renderBarChart();
  modal.classList.add("hidden");
  transactionForm.reset();
});

// ---------- Open Edit Modal ----------
function openEditModal(index) {
  const t = transactions[index];
  editingIndex = index;

  ["date", "category", "type", "amount"].forEach((id) => {
    document.getElementById(id).value = t[id];
  });

  modal.classList.remove("hidden");
}

// ---------- Init ----------
async function init() {
  transactions = await loadTransactions();
  renderTransactions();
  updateSummary();
  populateCategoryFilter(); // refresh categories
  renderChart();
  renderBarChart();
  attachRowButtons();
}
init();

function renderBarChart() {
  const categoryTotals = {};

  transactions.forEach((t) => {
    if (t.type === "expense") {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    }
  });

  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);

  const canvas = document.getElementById("barChart");
  if (!canvas) return; // safeguard if element missing
  const ctx = canvas.getContext("2d");

  // Destroy old chart if exists
  if (barChartInstance) {
    barChartInstance.destroy();
  }

  barChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Expenses by Category",
          data: values,
          backgroundColor: "#3b82f6",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function renderLineChart() {
  // Prepare monthly data
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const incomePerMonth = Array(12).fill(0);
  const expensePerMonth = Array(12).fill(0);

  transactions.forEach((t) => {
    const month = new Date(t.date).getMonth();
    if (t.type === "income") incomePerMonth[month] += t.amount;
    else expensePerMonth[month] += t.amount;
  });

  const ctx = document.getElementById("lineChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Income",
          data: incomePerMonth,
          borderColor: "#16a34a",
          fill: false,
        },
        {
          label: "Expense",
          data: expensePerMonth,
          borderColor: "#dc2626",
          fill: false,
        },
      ],
    },
    options: { responsive: true },
  });
}

function renderTrendBarChart() {
  const categoryTotals = {};
  transactions.forEach((t) => {
    if (t.type === "expense") {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    }
  });

  const labels = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);

  const ctx = document.getElementById("trendBarChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Expenses by Category",
          data: values,
          backgroundColor: "#3b82f6",
        },
      ],
    },
    options: { responsive: true },
  });
}

const exportBtn = document.getElementById("exportBtn");

exportBtn.addEventListener("click", () => {
  if (!transactions.length) return alert("No transactions to export!");

  // Prepare data
  const data = transactions.map((t) => ({
    Date: t.date,
    Category: t.category,
    Type: t.type,
    Amount: t.amount,
  }));

  // Create worksheet and workbook
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");

  // Export to Excel
  XLSX.writeFile(wb, "Transactions.xlsx");
});

const currencySelect = document.getElementById("currencySelect");

currencySelect.addEventListener("change", () => {
  currency = currencySelect.value;
  localStorage.setItem("currency", currency);
  renderTransactions(); // update table amounts
  updateSummary();
});

// Theme buttons
const lightThemeBtn = document.getElementById("lightThemeBtn");
const darkThemeBtn = document.getElementById("darkThemeBtn");

if (lightThemeBtn) {
  lightThemeBtn.addEventListener("click", () => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  });
}

if (darkThemeBtn) {
  darkThemeBtn.addEventListener("click", () => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  });
}

// Apply saved theme on load
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

// Reset button
const resetBtn = document.getElementById("resetBtn");
if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    for (const t of transactions) {
      await deleteTransactionAPI(t.id);
    }
    transactions = [];
    renderTransactions();
    updateSummary();
    populateCategoryFilter();
    renderChart();
    renderBarChart();
  });
}
