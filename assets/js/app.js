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

let editingIndex = null;

function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function loadTransactions() {
  const data = localStorage.getItem("transactions");
  return data ? JSON.parse(data) : [];
}

let transactions = loadTransactions();

function renderChart() {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const ctx = document.getElementById("pieChart").getContext("2d");
  new Chart(ctx, {
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

  const filtered = transactions.filter(
    (t) =>
      (typeFilter === "all" || t.type === typeFilter) &&
      (categoryFilter === "all" || t.category === categoryFilter)
  );

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No transactions found.</td></tr>`;
    attachRowButtons();
    renderChart();
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
      return `
      <tr class="border-b hover:bg-gray-50 transition">
        <td class="px-6 py-3">${t.date}</td>
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
  renderTransactions();
  updateSummary();
  populateCategoryFilter();
  renderChart();
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
attachRowButtons();
