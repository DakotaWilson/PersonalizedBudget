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
const VERSION = "2.3.0";
const COLLECTIONS = {
  INCOMES: "incomes",
  BILLS: "bills",
  EXPENSES: "expenses",
  ACTIVITY_LOG: "activityLog"
};

// Recurrence pattern options
const RECURRENCE_PATTERNS = {
  NONE: "none",
  MONTHLY: "monthly",
  WEEKLY: "weekly",
  BIWEEKLY: "biweekly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly"
};

// Month names
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Day names
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
      { id: generateId(), name: "Rent", amount: 1200, dueDate: "2025-03-01", paid: false, recurring: true, recurrencePattern: RECURRENCE_PATTERNS.MONTHLY },
      { id: generateId(), name: "Internet", amount: 100, dueDate: "2025-03-11", paid: false, recurring: false, recurrencePattern: RECURRENCE_PATTERNS.NONE }
    ];
    
    const sampleExpenses = [
      { id: generateId(), category: "Groceries", amount: 120, date: "2025-03-05", notes: "Weekly grocery shopping" },
      { id: generateId(), category: "Shopping", amount: 45, date: "2025-03-01", notes: "New clothes" },
      { id: generateId(), category: "Savings", amount: 200, date: "2025-03-02", notes: "Monthly savings deposit" }
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
    
    // Ensure all bills have paid status and recurring properties
    bills = bills.map(bill => ({
      ...bill,
      paid: bill.paid !== undefined ? bill.paid : false,
      recurring: bill.recurring !== undefined ? bill.recurring : false,
      recurrencePattern: bill.recurrencePattern || RECURRENCE_PATTERNS.NONE
    }));
    
    // Load expenses
    const expensesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).get();
    expenses = expensesSnapshot.docs.map(doc => doc.data());
    
    // Ensure all expenses have notes field
    expenses = expenses.map(expense => ({
      ...expense,
      notes: expense.notes || ""
    }));
    
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

// Generate next recurring bill based on recurrence pattern
function generateNextRecurringBill(bill) {
  const [year, month, day] = bill.dueDate.split('-').map(Number);
  
  // Create a new bill object
  const newBill = {
    ...bill,
    id: generateId(),
    paid: false
  };
  
  // Calculate the next due date based on recurrence pattern
  const dueDate = new Date(year, month - 1, day);
  
  switch (bill.recurrencePattern) {
    case RECURRENCE_PATTERNS.MONTHLY:
      dueDate.setMonth(dueDate.getMonth() + 1);
      break;
    case RECURRENCE_PATTERNS.WEEKLY:
      dueDate.setDate(dueDate.getDate() + 7);
      break;
    case RECURRENCE_PATTERNS.BIWEEKLY:
      dueDate.setDate(dueDate.getDate() + 14);
      break;
    case RECURRENCE_PATTERNS.QUARTERLY:
      dueDate.setMonth(dueDate.getMonth() + 3);
      break;
    case RECURRENCE_PATTERNS.YEARLY:
      dueDate.setFullYear(dueDate.getFullYear() + 1);
      break;
    default:
      return null; // Return null if not recurring
  }
  
  // Format the new due date
  const nextMonth = String(dueDate.getMonth() + 1).padStart(2, '0');
  const nextDay = String(dueDate.getDate()).padStart(2, '0');
  newBill.dueDate = `${dueDate.getFullYear()}-${nextMonth}-${nextDay}`;
  
  return newBill;
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

// Calendar helper functions
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function getPreviousMonth(year, month) {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
}

function getNextMonth(year, month) {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
}

function getBillsForDay(year, month, day) {
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  return bills.filter(bill => {
    // Check if this bill falls on the specified date
    if (bill.dueDate === dateString) {
      return true;
    }
    return false;
  });
}

// Calculate totals
function calculateTotals() {
  const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  
  // Calculate total for unpaid bills only
  const totalBills = bills
    .filter(bill => !bill.paid)
    .reduce((sum, item) => sum + Number(item.amount), 0);
    
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = totalIncome - totalBills - totalExpenses;
  
  const totalPaidBills = bills
    .filter(bill => bill.paid)
    .reduce((sum, item) => sum + Number(item.amount), 0);
  
  // Calculate total savings
  const totalSavings = expenses
    .filter(expense => expense.category === "Savings")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  
  return { totalIncome, totalBills, totalExpenses, balance, totalPaidBills, totalSavings };
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
  const { totalIncome, totalBills, totalExpenses, balance, totalPaidBills, totalSavings } = calculateTotals();
  const expensesByCategory = getExpensesByCategory();
  
  // Initialize with current month and year
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Store month and year as data attributes for use in navigation
  container.dataset.calendarYear = currentYear;
  container.dataset.calendarMonth = currentMonth;
  
  let html = `
    <div class="card">
      <h2 class="card-title">Financial Summary</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <h3 class="stat-label income-label">Income</h3>
          <p class="stat-value income-value">${formatCurrency(totalIncome)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label bills-label">Unpaid Bills</h3>
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
      <h2 class="card-title">Savings Summary</h2>
      <div class="stat-card w-full">
        <h3 class="stat-label balance-label">Total Savings</h3>
        <p class="stat-value balance-value-positive">${formatCurrency(totalSavings)}</p>
      </div>
    </div>
    
    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="card-title m-0">Bills Calendar</h2>
        <div class="flex items-center">
          <button id="prev-month" class="calendar-nav-btn">❮</button>
          <h3 id="calendar-title" class="text-gray-300 mx-4">${MONTH_NAMES[currentMonth]} ${currentYear}</h3>
          <button id="next-month" class="calendar-nav-btn">❯</button>
        </div>
      </div>
      <div id="bills-calendar" class="calendar-container">
        <div class="calendar-header">
          ${DAY_NAMES.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
        </div>
        <div class="calendar-body">
  `;
  
  // Generate calendar days
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    html += `<div class="calendar-day calendar-day-empty"></div>`;
  }
  
  // Add calendar days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayBills = getBillsForDay(currentYear, currentMonth, day);
    const hasUnpaidBills = dayBills.some(bill => !bill.paid);
    const totalDayAmount = dayBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
    
    let dayClass = "calendar-day";
    if (hasUnpaidBills) {
      dayClass += " calendar-day-has-bills";
    }
    
    // Check if it's today
    const isToday = currentYear === currentDate.getFullYear() && 
                    currentMonth === currentDate.getMonth() && 
                    day === currentDate.getDate();
    
    if (isToday) {
      dayClass += " calendar-day-today";
    }
    
    html += `
      <div class="${dayClass}">
        <div class="calendar-day-number">${day}</div>
    `;
    
    if (dayBills.length > 0) {
      html += `<div class="calendar-day-amount">${formatCurrency(totalDayAmount)}</div>`;
      
      // Display bills on this day (maximum 2 to avoid overflow)
      const shownBills = dayBills.slice(0, 2);
      html += `<div class="calendar-day-bills">`;
      
      shownBills.forEach(bill => {
        const isPaid = bill.paid;
        html += `
          <div class="calendar-day-bill ${isPaid ? 'bill-paid' : 'bill-unpaid'}"
               title="${bill.name}: ${formatCurrency(bill.amount)} (${isPaid ? 'Paid' : 'Unpaid'})">
            ${bill.name.length > 8 ? bill.name.substring(0, 6) + '...' : bill.name}
          </div>
        `;
      });
      
      if (dayBills.length > 2) {
        html += `<div class="calendar-day-more">+${dayBills.length - 2} more</div>`;
      }
      
      html += `</div>`;
    }
    
    html += `</div>`;
  }
  
  html += `
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
      // Filter out paid bills
      if (bill.paid) return false;
      
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
      const recurringIcon = bill.recurring ? 
        `<span class="ml-2 text-blue-300" title="${bill.recurrencePattern}">↻</span>` : '';
        
      html += `
        <div class="flex justify-between border-b border-gray-700 pb-2">
          <div>
            <div class="font-medium text-gray-300">
              ${bill.name}${recurringIcon}
            </div>
            <div class="text-sm text-gray-400">Due: ${formatDate(bill.dueDate)}</div>
          </div>
          <div class="flex items-center">
            <div class="text-yellow-300 font-medium mr-4">${formatCurrency(bill.amount)}</div>
            <button class="bg-green-800 hover:bg-green-700 text-white px-2 py-1 rounded text-sm" 
              onclick="toggleBillPaid('${bill.id}', true)">
              Mark Paid
            </button>
          </div>
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
  
  // Add event listeners for calendar navigation
  document.getElementById('prev-month').addEventListener('click', function() {
    navigateCalendar(container, 'prev');
  });
  
  document.getElementById('next-month').addEventListener('click', function() {
    navigateCalendar(container, 'next');
  });
}

// Navigate the calendar
function navigateCalendar(container, direction) {
  let year = parseInt(container.dataset.calendarYear);
  let month = parseInt(container.dataset.calendarMonth);
  
  if (direction === 'prev') {
    const prev = getPreviousMonth(year, month);
    year = prev.year;
    month = prev.month;
  } else if (direction === 'next') {
    const next = getNextMonth(year, month);
    year = next.year;
    month = next.month;
  }
  
  // Update data attributes
  container.dataset.calendarYear = year;
  container.dataset.calendarMonth = month;
  
  // Update calendar title
  document.getElementById('calendar-title').textContent = `${MONTH_NAMES[month]} ${year}`;
  
  // Regenerate calendar body
  const calendarBody = document.querySelector('.calendar-body');
  let html = '';
  
  // Generate calendar days
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    html += `<div class="calendar-day calendar-day-empty"></div>`;
  }
  
  // Get the current date for today highlighting
  const currentDate = new Date();
  
  // Add calendar days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayBills = getBillsForDay(year, month, day);
    const hasUnpaidBills = dayBills.some(bill => !bill.paid);
    const totalDayAmount = dayBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
    
    let dayClass = "calendar-day";
    if (hasUnpaidBills) {
      dayClass += " calendar-day-has-bills";
    }
    
    // Check if it's today
    const isToday = year === currentDate.getFullYear() && 
                    month === currentDate.getMonth() && 
                    day === currentDate.getDate();
    
    if (isToday) {
      dayClass += " calendar-day-today";
    }
    
    html += `
      <div class="${dayClass}">
        <div class="calendar-day-number">${day}</div>
    `;
    
    if (dayBills.length > 0) {
      html += `<div class="calendar-day-amount">${formatCurrency(totalDayAmount)}</div>`;
      
      // Display bills on this day (maximum 2 to avoid overflow)
      const shownBills = dayBills.slice(0, 2);
      html += `<div class="calendar-day-bills">`;
      
      shownBills.forEach(bill => {
        const isPaid = bill.paid;
        html += `
          <div class="calendar-day-bill ${isPaid ? 'bill-paid' : 'bill-unpaid'}"
               title="${bill.name}: ${formatCurrency(bill.amount)} (${isPaid ? 'Paid' : 'Unpaid'})">
            ${bill.name.length > 8 ? bill.name.substring(0, 6) + '...' : bill.name}
          </div>
        `;
      });
      
      if (dayBills.length > 2) {
        html += `<div class="calendar-day-more">+${dayBills.length - 2} more</div>`;
      }
      
      html += `</div>`;
    }
    
    html += `</div>`;
  }
  
  calendarBody.innerHTML = html;
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
      
      <div class="mt-4 flex items-center mb-4">
        <input type="checkbox" id="bill-recurring" class="mr-2 h-4 w-4 text-blue-600">
        <label for="bill-recurring" class="form-label mb-0">Recurring Bill</label>
      </div>
      
      <div id="recurrence-options" class="mb-4" style="display: none;">
        <label class="form-label">Recurrence Pattern</label>
        <select id="recurrence-pattern" class="form-select">
          <option value="${RECURRENCE_PATTERNS.MONTHLY}">Monthly</option>
          <option value="${RECURRENCE_PATTERNS.WEEKLY}">Weekly</option>
          <option value="${RECURRENCE_PATTERNS.BIWEEKLY}">Bi-weekly</option>
          <option value="${RECURRENCE_PATTERNS.QUARTERLY}">Quarterly</option>
          <option value="${RECURRENCE_PATTERNS.YEARLY}">Yearly</option>
        </select>
      </div>
      
      <div class="mt-4">
        <button id="add-bill-btn" class="btn btn-yellow">Add Bill</button>
      </div>
    </div>
    
    <div class="card">
      <h2 class="card-title">Bill List</h2>
      <div class="mb-4">
        <div class="flex justify-between items-center mb-2">
          <div class="flex">
            <button id="show-all-bills" class="bg-gray-700 text-white px-3 py-1 rounded-l active-filter">All</button>
            <button id="show-unpaid-bills" class="bg-gray-700 text-white px-3 py-1">Unpaid</button>
            <button id="show-paid-bills" class="bg-gray-700 text-white px-3 py-1 rounded-r">Paid</button>
          </div>
        </div>
      </div>
      <div id="bill-list">
        <!-- Bill entries will be added here -->
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Show/hide recurrence options
  const recurringCheckbox = document.getElementById('bill-recurring');
  const recurrenceOptions = document.getElementById('recurrence-options');
  
  recurringCheckbox.addEventListener('change', function() {
    recurrenceOptions.style.display = this.checked ? 'block' : 'none';
  });
  
  // Add bill filter buttons
  document.getElementById('show-all-bills').addEventListener('click', function() {
    document.getElementById('show-all-bills').classList.add('active-filter');
    document.getElementById('show-unpaid-bills').classList.remove('active-filter');
    document.getElementById('show-paid-bills').classList.remove('active-filter');
    renderBillList('all');
  });
  
  document.getElementById('show-unpaid-bills').addEventListener('click', function() {
    document.getElementById('show-all-bills').classList.remove('active-filter');
    document.getElementById('show-unpaid-bills').classList.add('active-filter');
    document.getElementById('show-paid-bills').classList.remove('active-filter');
    renderBillList('unpaid');
  });
  
  document.getElementById('show-paid-bills').addEventListener('click', function() {
    document.getElementById('show-all-bills').classList.remove('active-filter');
    document.getElementById('show-unpaid-bills').classList.remove('active-filter');
    document.getElementById('show-paid-bills').classList.add('active-filter');
    renderBillList('paid');
  });
  
  // Render bill list (default to all)
  renderBillList('all');
  
  // Add bill button event
  document.getElementById('add-bill-btn').addEventListener('click', async function() {
    const name = document.getElementById('bill-name').value;
    const amount = document.getElementById('bill-amount').value;
    const dueDate = document.getElementById('bill-due-date').value;
    const recurring = document.getElementById('bill-recurring').checked;
    const recurrencePattern = recurring 
      ? document.getElementById('recurrence-pattern').value 
      : RECURRENCE_PATTERNS.NONE;
    
    if (!name || !amount || !dueDate) {
      alert('Please fill in all required fields');
      return;
    }
    
    const newBill = {
      id: generateId(),
      name: name,
      amount: Number(amount),
      dueDate: dueDate, // date input already provides YYYY-MM-DD format
      paid: false,
      recurring: recurring,
      recurrencePattern: recurrencePattern
    };
    
    try {
      showLoading();
      
      // Add to Firestore
      await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(newBill.id).set(newBill);
      
      // Add to local array
      bills.push(newBill);
      
      // Log activity
      await logActivity(`Added ${recurring ? 'recurring' : ''} bill: ${name} - ${formatCurrency(newBill.amount)}`, 'bill', newBill);
      
      // Reset form
      document.getElementById('bill-name').value = '';
      document.getElementById('bill-amount').value = '';
      document.getElementById('bill-due-date').value = '';
      document.getElementById('bill-recurring').checked = false;
      document.getElementById('recurrence-pattern').value = RECURRENCE_PATTERNS.MONTHLY;
      recurrenceOptions.style.display = 'none';
      
      hideLoading();
      
      // Update bill list
      renderBillList('all');
    } catch (error) {
      hideLoading();
      console.error("Error adding bill:", error);
      alert("Failed to add bill. Please try again.");
    }
  });
}

// Render bill list with filter option
function renderBillList(filter = 'all') {
  const container = document.getElementById('bill-list');
  
  // Filter bills based on the selected filter
  let filteredBills = [...bills];
  if (filter === 'paid') {
    filteredBills = filteredBills.filter(bill => bill.paid);
  } else if (filter === 'unpaid') {
    filteredBills = filteredBills.filter(bill => !bill.paid);
  }
  
  if (filteredBills.length > 0) {
    let html = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left border-b border-gray-700">
              <th class="p-2 text-gray-300">Bill Name</th>
              <th class="p-2 text-gray-300">Due Date</th>
              <th class="p-2 text-gray-300">Status</th>
              <th class="p-2 text-right text-gray-300">Amount</th>
              <th class="p-2 text-center text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Sort bills by due date (with timezone fix)
    const sortedBills = filteredBills.sort((a, b) => {
      // Parse date parts to create date objects correctly
      const [yearA, monthA, dayA] = a.dueDate.split('-').map(Number);
      const [yearB, monthB, dayB] = b.dueDate.split('-').map(Number);
      return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    });
    
    sortedBills.forEach(bill => {
      // Add recurring icon if bill is recurring
      const recurringIcon = bill.recurring ? 
        `<span class="ml-2 text-blue-300" title="${bill.recurrencePattern}">↻</span>` : '';
        
      html += `
        <tr class="border-b border-gray-700">
          <td class="p-2 text-gray-300">${bill.name}${recurringIcon}</td>
          <td class="p-2 text-gray-300">${formatDate(bill.dueDate)}</td>
          <td class="p-2">
            <span class="${bill.paid ? 'text-green-300' : 'text-yellow-300'}">
              ${bill.paid ? 'Paid' : 'Unpaid'}
            </span>
          </td>
          <td class="p-2 text-right text-yellow-300">${formatCurrency(bill.amount)}</td>
          <td class="p-2 text-center">
            <div class="flex justify-end space-x-2">
              ${!bill.paid ? `
                <button class="bg-green-800 hover:bg-green-700 text-white px-2 py-1 rounded text-sm" 
                  onclick="toggleBillPaid('${bill.id}', true)">
                  Mark Paid
                </button>
              ` : `
                <button class="bg-yellow-800 hover:bg-yellow-700 text-white px-2 py-1 rounded text-sm" 
                  onclick="toggleBillPaid('${bill.id}', false)">
                  Mark Unpaid
                </button>
              `}
              <button class="text-red-400 hover:text-red-300" onclick="deleteBill('${bill.id}')">
                Delete
              </button>
            </div>
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
    container.innerHTML = `<p class="text-gray-400">No ${filter === 'all' ? '' : filter} bills yet</p>`;
  }
}

// Toggle bill paid status
async function toggleBillPaid(id, paidStatus) {
  if (!currentUser) return;
  
  try {
    showLoading();
    
    // Find the bill to update
    const billIndex = bills.findIndex(b => b.id === id);
    if (billIndex === -1) {
      hideLoading();
      return;
    }
    
    const bill = bills[billIndex];
    
    // Update the bill
    bill.paid = paidStatus;
    
    // Update in Firestore
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).update({ paid: paidStatus });
    
    // Log activity
    await logActivity(`Marked bill ${bill.name} as ${paidStatus ? 'paid' : 'unpaid'} - ${formatCurrency(bill.amount)}`, 'bill', bill);
    
    // Create next recurring bill if this one was paid and it's recurring
    if (paidStatus && bill.recurring) {
      const nextBill = generateNextRecurringBill(bill);
      if (nextBill) {
        // Add to Firestore
        await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(nextBill.id).set(nextBill);
        
        // Add to local array
        bills.push(nextBill);
        
        // Log activity
        await logActivity(`Created next recurring bill: ${nextBill.name} - ${formatCurrency(nextBill.amount)}`, 'bill', nextBill);
      }
    }
    
    hideLoading();
    
    // Update UI based on which tab we're on
    if (document.getElementById('tab-bills').classList.contains('active')) {
      // Find which filter is active
      const filterButtons = ['show-all-bills', 'show-unpaid-bills', 'show-paid-bills'];
      const activeButton = filterButtons.find(id => document.getElementById(id).classList.contains('active-filter'));
      
      let filterType = 'all';
      if (activeButton === 'show-unpaid-bills') filterType = 'unpaid';
      if (activeButton === 'show-paid-bills') filterType = 'paid';
      
      renderBillList(filterType);
    }
    
    // If we're on the dashboard, update it too
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
      renderDashboard(document.getElementById('content'));
    }
  } catch (error) {
    hideLoading();
    console.error("Error updating bill:", error);
    alert("Failed to update bill. Please try again.");
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
    
    // Update UI based on which tab we're on
    if (document.getElementById('tab-bills').classList.contains('active')) {
      // Find which filter is active
      const filterButtons = ['show-all-bills', 'show-unpaid-bills', 'show-paid-bills'];
      const activeButton = filterButtons.find(id => document.getElementById(id).classList.contains('active-filter'));
      
      let filterType = 'all';
      if (activeButton === 'show-unpaid-bills') filterType = 'unpaid';
      if (activeButton === 'show-paid-bills') filterType = 'paid';
      
      renderBillList(filterType);
    }
    
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
            <option value="Eating out">Eating out</option>
            <option value="Groceries">Groceries</option>
            <option value="Gas">Gas</option>
            <option value="Kyliee">Kyliee</option>
            <option value="Personal care">Personal care</option>
            <option value="Shopping">Shopping</option>
            <option value="Pets">Pets</option>
            <option value="Gifts">Gifts</option>
            <option value="Savings">Savings</option>
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
        <label class="form-label">Notes</label>
        <textarea id="expense-notes" class="form-input h-20" placeholder="Add notes about this expense (optional)"></textarea>
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
    const notes = document.getElementById('expense-notes').value.trim();
    
    if (!category || !amount || !date) {
      alert('Please fill in all required fields');
      return;
    }
    
    const newExpense = {
      id: generateId(),
      category: category,
      amount: Number(amount),
      date: date, // date input already provides YYYY-MM-DD format
      notes: notes
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
      document.getElementById('expense-notes').value = '';
      
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
              <th class="p-2 text-gray-300">Notes</th>
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
      const notesDisplay = expense.notes ? expense.notes : '-';
      const amountClass = expense.category === 'Savings' ? 'text-blue-300' : 'text-red-300';
      
      html += `
        <tr class="border-b border-gray-700">
          <td class="p-2 text-gray-300">${expense.category}</td>
          <td class="p-2 text-gray-300">${formatDate(expense.date)}</td>
          <td class="p-2 text-gray-400">
            <div class="note-text" title="${expense.notes}">${notesDisplay}</div>
          </td>
          <td class="p-2 text-right ${amountClass}">${formatCurrency(expense.amount)}</td>
          <td class="p-2 text-center">
            <div class="flex justify-end space-x-2">
              <button class="text-blue-400 hover:text-blue-300" onclick="editExpenseNotes('${expense.id}')">
                Edit
              </button>
              <button class="text-red-400 hover:text-red-300" onclick="deleteExpense('${expense.id}')">
                Delete
              </button>
            </div>
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

// Edit expense notes
function editExpenseNotes(id) {
  // Find the expense
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;
  
  // Show the edit notes modal
  const modal = document.getElementById('edit-notes-modal');
  const notesTextarea = document.getElementById('edit-notes-textarea');
  const expenseIdField = document.getElementById('edit-expense-id');
  
  // Set the current notes and expense ID
  notesTextarea.value = expense.notes || '';
  expenseIdField.value = id;
  
  // Display the expense info in the modal
  document.getElementById('edit-notes-category').textContent = expense.category;
  document.getElementById('edit-notes-amount').textContent = formatCurrency(expense.amount);
  document.getElementById('edit-notes-date').textContent = formatDate(expense.date);
  
  // Show the modal
  modal.style.display = 'flex';
}

// Save updated notes
async function saveExpenseNotes() {
  if (!currentUser) return;
  
  try {
    showLoading();
    
    const id = document.getElementById('edit-expense-id').value;
    const newNotes = document.getElementById('edit-notes-textarea').value.trim();
    
    // Find the expense
    const expenseIndex = expenses.findIndex(e => e.id === id);
    if (expenseIndex === -1) {
      hideLoading();
      return;
    }
    
    // Update the notes
    expenses[expenseIndex].notes = newNotes;
    
    // Update in Firestore
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).update({ notes: newNotes });
    
    // Log activity
    await logActivity(`Updated notes for expense: ${expenses[expenseIndex].category}`, 'expense', expenses[expenseIndex]);
    
    hideLoading();
    
    // Hide the modal
    hideEditNotesModal();
    
    // Update UI
    renderExpenseList();
  } catch (error) {
    hideLoading();
    console.error("Error updating expense notes:", error);
    alert("Failed to update notes. Please try again.");
  }
}

// Hide edit notes modal
function hideEditNotesModal() {
  document.getElementById('edit-notes-modal').style.display = 'none';
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
window.toggleBillPaid = toggleBillPaid;
window.editExpenseNotes = editExpenseNotes;
window.saveExpenseNotes = saveExpenseNotes;
window.hideEditNotesModal = hideEditNotesModal;
