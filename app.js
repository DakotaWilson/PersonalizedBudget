// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWoRetxkIjcr2IFtaDzy6O86QID5AgHvw",
  authDomain: "budgetcalc-b5f98.firebaseapp.com",
  projectId: "budgetcalc-b5f98",
  storageBucket: "budgetcalc-b5f98.firebasestorage.app",
  messagingSenderId: "696280368169",
  appId: "1:696280368169:web:812c497f97343ef1064838",
  measurementId: "G-DYR1LH8VVB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Constants
const VERSION = "2.0.0";
const COLLECTIONS = {
  INCOMES: "incomes",
  BILLS: "bills",
  EXPENSES: "expenses",
  ACTIVITY_LOG: "activityLog"
};

// Data storage
let incomes = [];
let bills = [];
let expenses = [];
let activityLog = [];
let currentUser = null;

// DOM elements
const loadingIndicator = document.getElementById('loading-indicator');
const loginScreen = document.getElementById('login-screen');
const budgetApp = document.getElementById('budget-app');
const userEmailDisplay = document.getElementById('user-email');
const loginError = document.getElementById('login-error');

// Show loading indicator
function showLoading() {
  loadingIndicator.style.display = 'flex';
}

// Hide loading indicator
function hideLoading() {
  loadingIndicator.style.display = 'none';
}

// Show error message
function showError(message) {
  loginError.textContent = message;
  loginError.classList.remove('hidden');
  setTimeout(() => {
    loginError.classList.add('hidden');
  }, 5000);
}

// Firebase Authentication functions
async function registerUser(email, password) {
  try {
    showLoading();
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    // User registered successfully
    currentUser = userCredential.user;
    
    // Initialize user's data
    await initializeUserData(currentUser.uid);
    
    hideLoading();
    showApp();
  } catch (error) {
    hideLoading();
    showError(`Registration failed: ${error.message}`);
  }
}

async function loginUser(email, password) {
  try {
    showLoading();
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    // User logged in successfully
    currentUser = userCredential.user;
    
    hideLoading();
    showApp();
  } catch (error) {
    hideLoading();
    showError(`Login failed: ${error.message}`);
  }
}

function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    hideApp();
  }).catch((error) => {
    console.error("Logout failed:", error);
  });
}

// Initialize user data with sample data
async function initializeUserData(userId) {
  try {
    // Sample data
    const sampleIncomes = [
      { id: generateId(), source: "Doctor Care", amount: 1500, date: "2025-02-25" },
      { id: generateId(), source: "CORE", amount: 300, date: "2025-03-07" }
    ];
    
    const sampleBills = [
      { id: generateId(), name: "Rent", amount: 1200, dueDate: "2025-03-01" },
      { id: generateId(), name: "Internet", amount: 100, dueDate: "2025-03-11" }
    ];
    
    const sampleExpenses = [
      { id: generateId(), category: "Groceries", amount: 120, date: "2025-03-05" },
      { id: generateId(), category: "Shopping", amount: 45, date: "2025-03-01" }
    ];

    // Check if user already has data
    const incomesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).get();
    if (incomesSnapshot.empty) {
      // Initialize sample data
      const batch = db.batch();
      
      // Add incomes
      for (const income of sampleIncomes) {
        const docRef = db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).doc(income.id);
        batch.set(docRef, income);
      }
      
      // Add bills
      for (const bill of sampleBills) {
        const docRef = db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).doc(bill.id);
        batch.set(docRef, bill);
      }
      
      // Add expenses
      for (const expense of sampleExpenses) {
        const docRef = db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).doc(expense.id);
        batch.set(docRef, expense);
      }
      
      // Log activity
      const activityLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action: "Account created with sample data",
        type: "auth"
      };
      const logRef = db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(activityLog.id);
      batch.set(logRef, activityLog);
      
      await batch.commit();
    }
  } catch (error) {
    console.error("Error initializing user data:", error);
  }
}

// Firestore data functions
async function loadData() {
  try {
    showLoading();
    
    if (!currentUser) {
      hideLoading();
      return;
    }
    
    const userId = currentUser.uid;
    
    // Load incomes
    const incomesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).get();
    incomes = incomesSnapshot.docs.map(doc => doc.data());
    
    // Load bills
    const billsSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).get();
    bills = billsSnapshot.docs.map(doc => doc.data());
    
    // Load expenses
    const expensesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).get();
    expenses = expensesSnapshot.docs.map(doc => doc.data());
    
    // Load activity log
    const activityLogSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    activityLog = activityLogSnapshot.docs.map(doc => doc.data());
    
    hideLoading();
    
    // Update UI
    userEmailDisplay.textContent = currentUser.email;
    changeTab('dashboard');
    
  } catch (error) {
    console.error("Error loading data:", error);
    hideLoading();
    showError("Failed to load data. Please try again.");
  }
}

// Log activity
async function logActivity(action, type, details = {}) {
  if (!currentUser) return;
  
  try {
    const userId = currentUser.uid;
    const newLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action,
      type,
      details
    };
    
    // Add to Firestore
    await db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(newLog.id).set(newLog);
    
    // Update local array
    activityLog.unshift(newLog);
    
    // Show save indicator
    showSaveIndicator();
    
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

// Show the save indicator
function showSaveIndicator() {
  const indicator = document.getElementById('save-indicator');
  indicator.classList.add('visible');
  
  // Hide after 2 seconds
  setTimeout(() => {
    indicator.classList.remove('visible');
  }, 2000);
}

// Generate a unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// UI functions
function showApp() {
  loginScreen.style.display = 'none';
  budgetApp.style.display = 'block';
  loadData();
}

function hideApp() {
  budgetApp.style.display = 'none';
  loginScreen.style.display = 'block';
  document.getElementById('email-input').value = '';
  document.getElementById('password-input').value = '';
}

// Format helpers
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function formatDate(dateString) {
  if (!dateString) return "";
  // Fix timezone issues by handling the date string directly
  if (dateString.includes('T')) {
    // If it's an ISO string, create a date object
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } else {
    // If it's a YYYY-MM-DD format, parse it directly to prevent timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  }
}

function formatDateTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Calculate totals
function calculateTotals() {
  const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalBills = bills.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = totalIncome - totalBills - totalExpenses;
  
  return { totalIncome, totalBills, totalExpenses, balance };
}

// Group expenses by category
function getExpensesByCategory() {
  const result = {};
  expenses.forEach(expense => {
    const category = expense.category;
    if (!result[category]) {
      result[category] = 0;
    }
    result[category] += Number(expense.amount);
  });
  return result;
}

// Change tab function
function changeTab(tabName) {
  // Update active tab
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
  
  // Update content
  const contentDiv = document.getElementById('content');
  
  if (tabName === 'dashboard') {
    renderDashboard(contentDiv);
  } else if (tabName === 'income') {
    renderIncomeTracker(contentDiv);
  } else if (tabName === 'bills') {
    renderBillTracker(contentDiv);
  } else if (tabName === 'expenses') {
    renderExpenseTracker(contentDiv);
  }
}

// Render dashboard
function renderDashboard(container) {
  const { totalIncome, totalBills, totalExpenses, balance } = calculateTotals();
  const expensesByCategory = getExpensesByCategory();
  
  let html = `
    <div class="card">
      <h2 class="card-title">Financial Summary</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <h3 class="stat-label income-label">Income</h3>
          <p class="stat-value income-value">${formatCurrency(totalIncome)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label bills-label">Bills</h3>
          <p class="stat-value bills-value">${formatCurrency(totalBills)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label expenses-label">Expenses</h3>
          <p class="stat-value expenses-value">${formatCurrency(totalExpenses)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label balance-label">Balance</h3>
          <p class="stat-value ${balance >= 0 ? 'balance-value-positive' : 'balance-value-negative'}">
            ${formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2 class="card-title">Expense Breakdown</h2>
      <div class="space-y-3">
  `;
  
  const totalExpenseAmount = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
  
  if (Object.keys(expensesByCategory).length > 0) {
    Object.entries(expensesByCategory).forEach(([category, amount]) => {
      const percentage = totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0;
      
      html += `
        <div>
          <div class="flex justify-between mb-1">
            <span class="font-medium text-gray-300">${category}</span>
            <span class="text-gray-300">
              ${formatCurrency(amount)} (${percentage.toFixed(1)}%)
            </span>
          </div>
          <div class="progress-container">
            <div class="progress-bar" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    });
  } else {
    html += `<p class="text-gray-400">No expense data to display</p>`;
  }
  
  html += `
      </div>
    </div>
    
    <div class="card">
      <h2 class="card-title">Upcoming Bills</h2>
      <div class="space-y-3">
  `;
  
  // Fix timezone issues when comparing dates
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day
  
  const upcomingBills = bills
    .filter(bill => {
      // Parse date parts to create date object correctly
      const [year, month, day] = bill.dueDate.split('-').map(Number);
      const dueDate = new Date(year, month - 1, day);
      return dueDate >= today;
    })
    .sort((a, b) => {
      // Sort by due date
      const [yearA, monthA, dayA] = a.dueDate.split('-').map(Number);
      const [yearB, monthB, dayB] = b.dueDate.split('-').map(Number);
      return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    })
    .slice(0, 5);
  
  if (upcomingBills.length > 0) {
    upcomingBills.forEach(bill => {
      html += `
        <div class="flex justify-between border-b border-gray-700 pb-2">
          <div>
            <div class="font-medium text-gray-300">${bill.name}</div>
            <div class="text-sm text-gray-400">Due: ${formatDate(bill.dueDate)}</div>
          </div>
          <div class="text-yellow-300 font-medium">${formatCurrency(bill.amount)}</div>
        </div>
      `;
    });
  } else {
    html += `<p class="text-gray-400">No upcoming bills</p>`;
  }
  
  html += `
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Render income tracker
function renderIncomeTracker(container) {
  let html = `
    <div class="card">
      <h2 class="card-title">Add New Income</h2>
      <div class="form-grid">
        <div>
          <label class="form-label">Source</label>
          <select id="income-source" class="form-select">
            <option value="Doctor Care">Doctor Care</option>
            <option value="CORE">CORE</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div id="custom-source-container" style="display: none;">
          <label class="form-label">Specify Source</label>
          <input type="text" id="income-custom-source" class="form-input" placeholder="Income source">
        </div>
        
        <div>
          <label class="form-label">Amount</label>
          <input type="number" id="income-amount" class="form-input" placeholder="0.00">
        </div>
        
        <div>
          <label class="form-label">Date</label>
          <input type="date" id="income-date" class="form-input">
        </div>
      </div>
      <div class="mt-4">
        <button id="add-income-btn" class="btn btn-green">Add Income</button>
      </div>
    </div>
    
    <div class="card">
      <h2 class="card-title">Income History</h2>
      <div id="income-list">
        <!-- Income entries will be added here -->
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Show/hide custom source field
  const sourceSelect = document.getElementById('income-source');
  const customSourceContainer = document.getElementById('custom-source-container');
  
  sourceSelect.addEventListener('change', function() {
    customSourceContainer.style.display = this.value === 'Other' ? 'block' : 'none';
  });
  
  // Render income list
  renderIncomeList();
  
  // Add income button event
  document.getElementById('add-income-btn').addEventListener('click', async function() {
    const source = sourceSelect.value;
    const customSource = document.getElementById('income-custom-source').value;
    const amount = document.getElementById('income-amount').value;
    const date = document.getElementById('income-date').value;
    
    if (!amount || !date) {
      alert('Please fill in all required fields');
      return;
    }
    
    const finalSource = source === 'Other' ? (customSource || 'Other Income') : source;
    
    const newIncome = {
      id: generateId(),
      source: finalSource,
      amount: Number(amount),
      date: date // date input already provides YYYY-MM-DD format
    };
    
    try {
      showLoading();
      
      // Add to Firestore
      await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(newIncome.id).set(newIncome);
      
      // Add to local array
      incomes.push(newIncome);
      
      // Log activity
      await logActivity(`Added income: ${finalSource} - ${formatCurrency(newIncome.amount)}`, 'income', newIncome);
      
      // Reset form
      sourceSelect.value = 'Doctor Care';
      document.getElementById('income-custom-source').value = '';
      document.getElementById('income-amount').value = '';
      document.getElementById('income-date').value = '';
      customSourceContainer.style.display = 'none';
      
      hideLoading();
      
      // Update income list
      renderIncomeList();
    } catch (error) {
      hideLoading();
      console.error("Error adding income:", error);
      alert("Failed to add income. Please try again.");
    }
  });
}

// Render income list
function renderIncomeList() {
  const container = document.getElementById('income-list');
  
  if (incomes.length > 0) {
    let html = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left border-b border-gray-700">
              <th class="p-2 text-gray-300">Source</th>
              <th class="p-2 text-gray-300">Date</th>
              <th class="p-2 text-right text-gray-300">Amount</th>
              <th class="p-2 text-center text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Sort incomes by date (newest first) with timezone fix
    const sortedIncomes = [...incomes].sort((a, b) => {
      // Parse date parts to create date objects correctly
      const [yearA, monthA, dayA] = a.date.split('-').map(Number);
      const [yearB, monthB, dayB] = b.date.split('-').map(Number);
      return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
    });
    
    sortedIncomes.forEach(income => {
      html += `
        <tr class="border-b border-gray-700">
          <td class="p-2 text-gray-300">${income.source}</td>
          <td class="p-2 text-gray-300">${formatDate(income.date)}</td>
          <td class="p-2 text-right text-green-300">${formatCurrency(income.amount)}</td>
          <td class="p-2 text-center">
            <button class="text-red-400 hover:text-red-300" onclick="deleteIncome('${income.id}')">
              Delete
            </button>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    container.innerHTML = html;
  } else {
    container.innerHTML = `<p class="text-gray-400">No income entries yet</p>`;
  }
}

// Delete income
async function deleteIncome(id) {
  if (!currentUser) return;
  
  try {
    showLoading();
    
    // Find the income to delete
    const incomeToDelete = incomes.find(i => i.id === id);
    if (!incomeToDelete) {
      hideLoading();
      return;
    }
    
    // Delete from Firestore
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(id).delete();
    
    // Delete from local array
    incomes = incomes.filter(i => i.id !== id);
    
    // Log activity
    await logActivity(`Deleted income: ${incomeToDelete.source} - ${formatCurrency(incomeToDelete.amount)}`, 'delete', incomeToDelete);
    
    hideLoading();
    
    // Update UI
    renderIncomeList();
    
    // If we're on the dashboard, update it too
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
      renderDashboard(document.getElementById('content'));
    }
  } catch (error) {
    hideLoading();
    console.error("Error deleting income:", error);
    alert("Failed to delete income. Please try again.");
  }
}

// Render bill tracker
function renderBillTracker(container) {
  let html = `
    <div class="card">
      <h2 class="card-title">Add New Bill</h2>
      <div class="form-grid">
        <div>
          <label class="form-label">Bill Name</label>
          <input type="text" id="bill-name" class="form-input" placeholder="Bill name">
        </div>
        
        <div>
          <label class="form-label">Amount</label>
          <input type="number" id="bill-amount" class="form-input" placeholder="0.00">
        </div>
        
        <div>
          <label class="form-label">Due Date</label>
          <input type="date" id="bill-due-date" class="form-input">
        </div>
      </div>
      <div class="mt-4">
        <button id="add-bill-btn" class="btn btn-yellow">Add Bill</button>
      </div>
    </div>
    
    <div class="card">
      <h2 class="card-title">Bill List</h2>
      <div id="bill-list">
        <!-- Bill entries will be added here -->
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Render bill list
  renderBillList();
  
  // Add bill button event
  document.getElementById('add-bill-btn').addEventListener('click', async function() {
    const name = document.getElementById('bill-name').value;
    const amount = document.getElementById('bill-amount').value;
    const dueDate = document.getElementById('bill-due-date').value;
    
    if (!name || !amount || !dueDate) {
      alert('Please fill in all required fields');
      return;
    }
    
    const newBill = {
      id: generateId(),
      name: name,
      amount: Number(amount),
      dueDate: dueDate // date input already provides YYYY-MM-DD format
    };
    
    try {
      showLoading();
      
      // Add to Firestore
      await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(newBill.id).set(newBill);
      
      // Add to local array
      bills.push(newBill);
      
      // Log activity
      await logActivity(`Added bill: ${name} - ${formatCurrency(newBill.amount)}`, 'bill', newBill);
      
      // Reset form
      document.getElementById('bill-name').value = '';
      document.getElementById('bill-amount').value = '';
      document.getElementById('bill-due-date').value = '';
      
      hideLoading();
      
      // Update bill list
      renderBillList();
    } catch (error) {
      hideLoading();
      console.error("Error adding bill:", error);
      alert("Failed to add bill. Please try again.");
    }
  });
}

// Render bill list
function renderBillList() {
  const container = document.getElementById('bill-list');
  
  if (bills.length > 0) {
    let html = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left border-b border-gray-700">
              <th class="p-2 text-gray-300">Bill Name</th>
              <th class="p-2 text-gray-300">Due Date</th>
              <th class="p-2 text-right text-gray-300">Amount</th>
              <th class="p-2 text-center text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Sort bills by due date (with timezone fix)
    const sortedBills = [...bills].sort((a, b) => {
      // Parse date parts to create date objects correctly
      const [yearA, monthA, dayA] = a.dueDate.split('-').map(Number);
      const [yearB, monthB, dayB] = b.dueDate.split('-').map(Number);
      return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    });
    
    sortedBills.forEach(bill => {
      html += `
        <tr class="border-b border-gray-700">
          <td class="p-2 text-gray-300">${bill.name}</td>
          <td class="p-2 text-gray-300">${formatDate(bill.dueDate)}</td>
          <td class="p-2 text-right text-yellow-300">${formatCurrency(bill.amount)}</td>
          <td class="p-2 text-center">
            <button class="text-red-400 hover:text-red-300" onclick="deleteBill('${bill.id}')">
              Delete
            </button>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    container.innerHTML = html;
  } else {
    container.innerHTML = `<p class="text-gray-400">No bills yet</p>`;
  }
}

// Delete bill
async function deleteBill(id) {
  if (!currentUser) return;
  
  try {
    showLoading();
    
    // Find the bill to delete
    const billToDelete = bills.find(b => b.id === id);
    if (!billToDelete) {
      hideLoading();
      return;
    }
    
    // Delete from Firestore
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).delete();
    
    // Delete from local array
    bills = bills.filter(b => b.id !== id);
    
    // Log activity
    await logActivity(`Deleted bill: ${billToDelete.name} - ${formatCurrency(billToDelete.amount)}`, 'delete', billToDelete);
    
    hideLoading();
    
    // Update UI
    renderBillList();
    
    // If we're on the dashboard, update it too
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
      renderDashboard(document.getElementById('content'));
    }
  } catch (error) {
    hideLoading();
    console.error("Error deleting bill:", error);
    alert("Failed to delete bill. Please try again.");
  }
}

// Render expense tracker
function renderExpenseTracker(container) {
  let html = `
    <div class="card">
      <h2 class="card-title">Add New Expense</h2>
      <div class="form-grid">
        <div>
          <label class="form-label">Category</label>
          <select id="expense-category" class="form-select">
            <option value="">Select a category</option>
            <option value="Groceries">Groceries</option>
            <option value="Dining">Dining</option>
            <option value="Transportation">Transportation</option>
            <option value="Shopping">Shopping</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Utilities">Utilities</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        <div>
          <label class="form-label">Amount</label>
          <input type="number" id="expense-amount" class="form-input" placeholder="0.00">
        </div>
        
        <div>
          <label class="form-label">Date</label>
          <input type="date" id="expense-date" class="form-input">
        </div>
      </div>
      <div class="mt-4">
        <button id="add-expense-btn" class="btn btn-red">Add Expense</button>
      </div>
    </div>
    
    <div class="card">
      <h2 class="card-title">Expense History</h2>
      <div id="expense-list">
        <!-- Expense entries will be added here -->
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Render expense list
  renderExpenseList();
  
  // Add expense button event
  document.getElementById('add-expense-btn').addEventListener('click', async function() {
    const category = document.getElementById('expense-category').value;
    const amount = document.getElementById('expense-amount').value;
    const date = document.getElementById('expense-date').value;
    
    if (!category || !amount || !date) {
      alert('Please fill in all required fields');
      return;
    }
    
    const newExpense = {
      id: generateId(),
      category: category,
      amount: Number(amount),
      date: date // date input already provides YYYY-MM-DD format
    };
    
    try {
      showLoading();
      
      // Add to Firestore
      await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(newExpense.id).set(newExpense);
      
      // Add to local array
      expenses.push(newExpense);
      
      // Log activity
      await logActivity(`Added expense: ${category} - ${formatCurrency(newExpense.amount)}`, 'expense', newExpense);
      
      // Reset form
      document.getElementById('expense-category').value = '';
      document.getElementById('expense-amount').value = '';
      document.getElementById('expense-date').value = '';
      
      hideLoading();
      
      // Update expense list
      renderExpenseList();
    } catch (error) {
      hideLoading();
      console.error("Error adding expense:", error);
      alert("Failed to add expense. Please try again.");
    }
  });
}

// Render expense list
function renderExpenseList() {
  const container = document.getElementById('expense-list');
  
  if (expenses.length > 0) {
    let html = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left border-b border-gray-700">
              <th class="p-2 text-gray-300">Category</th>
              <th class="p-2 text-gray-300">Date</th>
              <th class="p-2 text-right text-gray-300">Amount</th>
              <th class="p-2 text-center text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Sort expenses by date (newest first) with timezone fix
    const sortedExpenses = [...expenses].sort((a, b) => {
      // Parse date parts to create date objects correctly
      const [yearA, monthA, dayA] = a.date.split('-').map(Number);
      const [yearB, monthB, dayB] = b.date.split('-').map(Number);
      return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
    });
    
    sortedExpenses.forEach(expense => {
      html += `
        <tr class="border-b border-gray-700">
          <td class="p-2 text-gray-300">${expense.category}</td>
          <td class="p-2 text-gray-300">${formatDate(expense.date)}</td>
          <td class="p-2 text-right text-red-300">${formatCurrency(expense.amount)}</td>
          <td class="p-2 text-center">
            <button class="text-red-400 hover:text-red-300" onclick="deleteExpense('${expense.id}')">
              Delete
            </button>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    container.innerHTML = html;
  } else {
    container.innerHTML = `<p class="text-gray-400">No expenses yet</p>`;
  }
}

// Delete expense
async function deleteExpense(id) {
  if (!currentUser) return;
  
  try {
    showLoading();
    
    // Find the expense to delete
    const expenseToDelete = expenses.find(e => e.id === id);
    if (!expenseToDelete) {
      hideLoading();
      return;
    }
    
    // Delete from Firestore
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).delete();
    
    // Delete from local array
    expenses = expenses.filter(e => e.id !== id);
    
    // Log activity
    await logActivity(`Deleted expense: ${expenseToDelete.category} - ${formatCurrency(expenseToDelete.amount)}`, 'delete', expenseToDelete);
    
    hideLoading();
    
    // Update UI
    renderExpenseList();
    
    // If we're on the dashboard, update it too
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
      renderDashboard(document.getElementById('content'));
    }
  } catch (error) {
    hideLoading();
    console.error("Error deleting expense:", error);
    alert("Failed to delete expense. Please try again.");
  }
}

// Activity log functions
function showActivityLog() {
  const modal = document.getElementById('activity-log-modal');
  const logContent = document.getElementById('activity-log-content');
  
  modal.style.display = 'flex';
  
  if (activityLog.length === 0) {
    logContent.innerHTML = `<p class="text-gray-400 text-center">No activity recorded yet</p>`;
    return;
  }
  
  let html = `<div class="space-y-3">`;
  
  activityLog.forEach(log => {
    html += `
      <div class="log-entry">
        <div class="log-date">${formatDateTime(log.timestamp)}</div>
        <div class="log-action">${log.action}</div>
      </div>
    `;
  });
  
  html += `</div>`;
  logContent.innerHTML = html;
}

function hideActivityLog() {
  document.getElementById('activity-log-modal').style.display = 'none';
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Set up Firebase auth state change listener
  auth.onAuthStateChanged(user => {
    if (user) {
      // User is signed in
      currentUser = user;
      showApp();
    } else {
      // User is signed out
      currentUser = null;
      hideApp();
    }
  });
  
  // Initialize login button
  document.getElementById('login-button').addEventListener('click', function() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }
    
    loginUser(email, password);
  });
  
  // Initialize register button
  document.getElementById('register-button').addEventListener('click', function() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }
    
    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }
    
    registerUser(email, password);
  });
  
  // Allow Enter key to submit login
  document.getElementById('password-input').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      document.getElementById('login-button').click();
    }
  });
});

// Add global functions
window.changeTab = changeTab;
window.deleteIncome = deleteIncome;
window.deleteBill = deleteBill;
window.deleteExpense = deleteExpense;
window.showActivityLog = showActivityLog;
window.hideActivityLog = hideActivityLog;
window.logout = logout;
