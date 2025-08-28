// -------------------- DOM Selectors --------------------
const balanceEl = document.querySelector("#balance"); // Balance display
const incomeEl = document.querySelector("#income"); // Income display
const expenseEl = document.querySelector("#expense"); // Expense display
const tableBody = document.querySelector("#transaction-body"); // Table body for transactions
const addBtn = document.getElementById("addBtn"); // Add transaction button
const modal = document.getElementById("modal"); // Modal for add/edit
const closeModal = document.getElementById("closeModal"); // Close modal button
const transactionForm = document.getElementById("transactionForm"); // Transaction form
const filterEl = document.getElementById("filter"); // Type filter
const categoryFilterEl = document.getElementById("categoryFilter"); // Category filter
const sortEl = document.getElementById("sort"); // Sort select
const fromDateEl = document.getElementById("fromDate"); // From date filter
const toDateEl = document.getElementById("toDate"); // To date filter
const API_BASE_URL =
  "https://68ae7584b91dfcdd62b9356a.mockapi.io/incomeandexpence"; // API endpoint

// -------------------- State Variables --------------------
let transactions = []; // All transactions
let currency = localStorage.getItem("currency") || "₹"; // Selected currency
let barChartInstance = null; // Bar chart instance
// Pie chart instance (declared above with other state variables)
let editingIndex = null; // Index of transaction being edited

// -------------------- Error Message UI --------------------
function showApiError(message) {
  let errDiv = document.getElementById("apiErrorMsg");
  if (!errDiv) {
    errDiv = document.createElement("div");
    errDiv.id = "apiErrorMsg";
    errDiv.style =
      "background:#fee;color:#b91c1c;padding:12px 20px;margin:10px 0;border-radius:8px;font-weight:bold;";
    document.body.prepend(errDiv);
  }
  errDiv.textContent = message;
}
function clearApiError() {
  const errDiv = document.getElementById("apiErrorMsg");
  if (errDiv) errDiv.remove();
}

// -------------------- API Functions --------------------

// Add a new transaction to the API
async function addTransactionAPI(transaction) {
  try {
    console.log("[API] POST", API_BASE_URL, transaction);
    const res = await fetch(API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });
    console.log("[API] POST response", res);
    if (!res.ok) throw new Error("API error: " + res.status);
    return await res.json();
  } catch (err) {
    console.error("Failed to add transaction:", err);
    showApiError("Failed to add transaction. Please try again later.");
    return null;
  }
}

// Update an existing transaction in the API
async function updateTransactionAPI(id, transaction) {
  try {
    console.log("[API] PUT", `${API_BASE_URL}/${id}`, transaction);
    const res = await fetch(`${API_BASE_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });
    console.log("[API] PUT response", res);
    if (!res.ok) throw new Error("API error: " + res.status);
    return await res.json();
  } catch (err) {
    console.error("Failed to update transaction:", err);
    showApiError("Failed to update transaction. Please try again later.");
    return null;
  }
}

// Delete a transaction from the API
async function deleteTransactionAPI(id) {
  try {
    console.log("[API] DELETE", `${API_BASE_URL}/${id}`);
    const res = await fetch(`${API_BASE_URL}/${id}`, { method: "DELETE" });
    console.log("[API] DELETE response", res);
    if (!res.ok) throw new Error("API error: " + res.status);
  } catch (err) {
    console.error("Failed to delete transaction:", err);
    showApiError("Failed to delete transaction. Please try again later.");
  }
}

// Load transactions from the API, optionally filtered by date
async function loadTransactions() {
  const fromDateStr = fromDateEl ? fromDateEl.value : null;
  const toDateStr = toDateEl ? toDateEl.value : null;
  let url = API_BASE_URL;
  const params = [];
  if (fromDateStr) params.push(`date_gte=${fromDateStr}`);
  if (toDateStr) params.push(`date_lte=${toDateStr}`);
  if (params.length) url += `?${params.join("&")}`;
  console.log("[API] GET", url);
  try {
    let res = await fetch(url);
    console.log("[API] GET response", res);
    if (!res.ok) {
      let text = await res.text();
      console.error("[API] GET error response text:", text);
      throw new Error("API error: " + res.status);
    }
    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      let text = await res.text();
      console.error("[API] GET invalid JSON:", text);
      showApiError("API returned invalid data format.");
      return [];
    }
    // If no data returned and filters were applied, try fetching all
    if (data.length === 0 && params.length) {
      console.warn("No data with date filter, retrying without filter");
      res = await fetch(API_BASE_URL);
      if (!res.ok) throw new Error("API error: " + res.status);
      data = await res.json();
    }
    console.log("[API] data loaded:", data);
    clearApiError();
    return data;
  } catch (err) {
    console.error("Failed to fetch transactions:", err);
    showApiError(
      "Failed to fetch transactions. Please check your connection or try again later."
    );
    return [];
  }
}
// -------------------- Month Filter Logic --------------------
const monthSelectEl = document.getElementById("monthSelect");

function getMonthYearString(date) {
  const d = new Date(date);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function populateMonthDropdown() {
  if (!monthSelectEl) return;
  // Get unique month-year values from transactions
  const monthSet = new Set();
  transactions.forEach((t) => {
    if (t.date) {
      const str = getMonthYearString(t.date);
      if (str) monthSet.add(str);
    }
  });
  const monthArr = Array.from(monthSet).sort().reverse();
  monthSelectEl.innerHTML =
    `<option value="all">All</option>` +
    monthArr
      .map((m) => {
        const [year, month] = m.split("-");
        const date = new Date(year, month - 1);
        return `<option value="${m}">${date.toLocaleString("default", {
          month: "long",
        })} ${year}</option>`;
      })
      .join("");
}

if (monthSelectEl) {
  monthSelectEl.addEventListener("change", renderTransactions);
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
  const selectedMonth = monthSelectEl ? monthSelectEl.value : "all";

  // Date filtering is now handled by API, only filter by type and category and month here
  console.log("All transactions:", transactions);
  let filtered = transactions.filter((t) => {
    const typeMatch = typeFilter === "all" || t.type === typeFilter;
    const categoryMatch =
      categoryFilter === "all" || t.category === categoryFilter;
    let monthMatch = true;
    if (selectedMonth && selectedMonth !== "all") {
      monthMatch = getMonthYearString(t.date) === selectedMonth;
    }
    return typeMatch && categoryMatch && monthMatch;
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


if (fromDateEl) {
  fromDateEl.addEventListener("change", async () => {
    transactions = await loadTransactions();
    renderTransactions();
  });
}
if (toDateEl) {
  toDateEl.addEventListener("change", async () => {
    transactions = await loadTransactions();
    renderTransactions();
  });
}

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
  console.log('[DEBUG] App init start');
  transactions = await loadTransactions();
  console.log('[DEBUG] Transactions loaded:', transactions);
  renderTransactions();
  console.log('[DEBUG] Rendered transactions');
  updateSummary();
  console.log('[DEBUG] Updated summary');
  populateCategoryFilter(); // refresh categories
  console.log('[DEBUG] Populated category filter');
  populateMonthDropdown(); // refresh months
  console.log('[DEBUG] Populated month dropdown');
  renderChart();
  console.log('[DEBUG] Rendered pie chart');
  renderBarChart();
  console.log('[DEBUG] Rendered bar chart');
  attachRowButtons();
  console.log('[DEBUG] Attached row buttons');
  console.log('[DEBUG] App init complete');
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

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.body.classList.add("bg-gray-900");
    document.body.classList.remove("bg-gray-100");
  } else {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("bg-gray-900");
    document.body.classList.add("bg-gray-100");
  }
}

if (lightThemeBtn) {
  lightThemeBtn.addEventListener("click", () => {
    localStorage.setItem("theme", "light");
    applyTheme("light");
  });
}

if (darkThemeBtn) {
  darkThemeBtn.addEventListener("click", () => {
    localStorage.setItem("theme", "dark");
    applyTheme("dark");
  });
}

// Apply saved theme on load
const savedTheme = localStorage.getItem("theme");
applyTheme(savedTheme === "dark" ? "dark" : "light");

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
