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

let editingIndex = null;

function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function loadTransactions() {
  const data = localStorage.getItem("transactions");
  return data ? JSON.parse(data) : [];
}

let transactions = loadTransactions();
let barChartInstance = null;

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

  const filtered = transactions.filter((t) => {
    const typeMatch = typeFilter === "all" || t.type === typeFilter;
    const categoryMatch = categoryFilter === "all" || t.category === categoryFilter;

    // Convert to Date objects for robust comparison
    const tDate = t.date ? new Date(t.date) : null;
    const fromDate = fromDateStr ? new Date(fromDateStr) : null;
    const toDate = toDateStr ? new Date(toDateStr) : null;

    // Only compare if both dates are valid
    const fromMatch = fromDate ? (tDate ? tDate >= fromDate : false) : true;
    const toMatch = toDate ? (tDate ? tDate <= toDate : false) : true;

    return typeMatch && categoryMatch && fromMatch && toMatch;
  });

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
      const formattedDate = new Date(t.date);
      const displayDate = formattedDate.toLocaleDateString("en-GB");
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
        <td class="px-6 py-3">₹ ${t.amount.toLocaleString()}</td>
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
  el.addEventListener("change", renderTransactions);
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

  balanceEl.textContent = `₹ ${(income - expense).toLocaleString()}`;
  incomeEl.textContent = `₹ ${income.toLocaleString()}`;
  expenseEl.textContent = `₹ ${expense.toLocaleString()}`;
}

// ---------- Attach Row Buttons ----------
function attachRowButtons() {
  document.querySelectorAll(".deleteBtn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const realIndex = parseInt(btn.dataset.index, 10);
      if (isNaN(realIndex)) return;
      transactions.splice(realIndex, 1);
      saveTransactions();
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
transactionForm.addEventListener("submit", (e) => {
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
    transactions[editingIndex] = transactionData; // Edit mode
    editingIndex = null;
  } else {
    transactions.push(transactionData); // Add mode
  }

  saveTransactions();
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
saveTransactions();
renderTransactions();
updateSummary();
populateCategoryFilter(); // refresh categories
renderChart();
renderBarChart();
attachRowButtons();

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
