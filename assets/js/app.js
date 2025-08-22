// Sample transactions (later replaced with API)
const transactions = [
  { id: 1, date: "2025-08-20", category: "Food", type: "expense", amount: 500 },
  {
    id: 2,
    date: "2025-08-19",
    category: "Salary",
    type: "income",
    amount: 4043,
  },
  {
    id: 3,
    date: "2025-08-18",
    category: "Travel",
    type: "expense",
    amount: 1200,
  },
  {
    id: 4,
    date: "2025-08-17",
    category: "Freelance",
    type: "income",
    amount: 43,
  },
];

// Selectors
const balanceEl = document.querySelector("#balance");
const incomeEl = document.querySelector("#income");
const expenseEl = document.querySelector("#expense");
const tableBody = document.querySelector("#transaction-body");

const addBtn = document.getElementById("addBtn");
const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const transactionForm = document.getElementById("transactionForm");

// Show modal
addBtn.addEventListener("click", () => {
  modal.classList.remove("hidden");
});

// Hide modal
closeModal.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// Render Transactions
function renderTransactions() {
  tableBody.innerHTML = "";
  transactions.forEach((t, index) => {
    const row = document.createElement("tr");
    row.className = "border-b hover:bg-gray-50 transition";
    row.innerHTML = `
      <td class="px-6 py-3">${t.date}</td>
      <td class="px-6 py-3">${t.category}</td>
      <td class="px-6 py-3 ${
        t.type === "income" ? "text-green-600" : "text-red-600"
      }">${t.type}</td>
      <td class="px-6 py-3">₹ ${t.amount.toLocaleString()}</td>
      <td class="px-6 py-3 flex space-x-2">
        <button class="editBtn px-2 py-1 bg-yellow-400 rounded hover:bg-yellow-500 text-white" data-index="${index}">Edit</button>
        <button class="deleteBtn px-2 py-1 bg-red-500 rounded hover:bg-red-600 text-white" data-index="${index}">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
  attachRowButtons();
}

// Update Cards
function updateSummary() {
  let income = 0,
    expense = 0;
  transactions.forEach((t) => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });

  const balance = income - expense;

  balanceEl.textContent = `₹ ${balance.toLocaleString()}`;
  incomeEl.textContent = `₹ ${income.toLocaleString()}`;
  expenseEl.textContent = `₹ ${expense.toLocaleString()}`;
}

// Init
renderTransactions();
updateSummary();

transactionForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const newTransaction = {
    id: Date.now(), // unique id
    date: document.getElementById("date").value,
    category: document.getElementById("category").value,
    type: document.getElementById("type").value,
    amount: parseFloat(document.getElementById("amount").value),
  };

  // Add to transactions array
  transactions.push(newTransaction);

  // Update UI
  renderTransactions();
  updateSummary();

  // Close modal & reset form
  modal.classList.add("hidden");
  transactionForm.reset();
});

// Handle  Delete
function attachRowButtons() {
  const deleteBtns = document.querySelectorAll(".deleteBtn");
  const editBtns = document.querySelectorAll(".editBtn");

  // Delete
  deleteBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = btn.getAttribute("data-index");
      transactions.splice(index, 1); // remove from array
      renderTransactions();
      updateSummary();
    });
  });

  // Edit (Next Step)
  editBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = btn.getAttribute("data-index");
      openEditModal(index);
    });
  });
}

// handle Edit
function openEditModal(index) {
  const t = transactions[index];
  // Fill modal fields
  document.getElementById("date").value = t.date;
  document.getElementById("category").value = t.category;
  document.getElementById("type").value = t.type;
  document.getElementById("amount").value = t.amount;

  modal.classList.remove("hidden");

  // Temporary submit listener for edit
  transactionForm.onsubmit = (e) => {
    e.preventDefault();
    t.date = document.getElementById("date").value;
    t.category = document.getElementById("category").value;
    t.type = document.getElementById("type").value;
    t.amount = parseFloat(document.getElementById("amount").value);

    renderTransactions();
    updateSummary();
    modal.classList.add("hidden");
    transactionForm.reset();

    // Restore original submit for adding new
    transactionForm.onsubmit = addTransactionSubmit;
  };
}

function addTransactionSubmit(e) {
  e.preventDefault();
  const newTransaction = {
    id: Date.now(),
    date: document.getElementById("date").value,
    category: document.getElementById("category").value,
    type: document.getElementById("type").value,
    amount: parseFloat(document.getElementById("amount").value),
  };
  transactions.push(newTransaction);
  renderTransactions();
  updateSummary();
  modal.classList.add("hidden");
  transactionForm.reset();
}

transactionForm.addEventListener("submit", addTransactionSubmit);
