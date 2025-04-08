// app.js
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWoRetxkIjcr2IFtaDzy6O86QID5AgHvw", // Replace with your actual API key if needed
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
const VERSION = "2.4.2"; // Updated version
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

// Month Filter State
let selectedFilterYear = null;
let selectedFilterMonth = null; // 0-indexed (0 for January, 11 for December)

// DOM elements
const loadingIndicator = document.getElementById('loading-indicator');
const loginScreen = document.getElementById('login-screen');
const budgetApp = document.getElementById('budget-app');
const userEmailDisplay = document.getElementById('user-email');
const loginError = document.getElementById('login-error');
// Note: monthFilterSelect is fetched dynamically in functions now for robustness
const contentDiv = document.getElementById('content');

// Show loading indicator
function showLoading() {
  if (loadingIndicator) loadingIndicator.style.display = 'flex';
}

// Hide loading indicator
function hideLoading() {
  if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// Show error message
function showError(message) {
    if (!loginError) return;
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
    currentUser = userCredential.user;
    await initializeUserData(currentUser.uid);
    hideLoading();
    showApp();
  } catch (error) {
    hideLoading();
    showError(`Registration failed: ${error.message}`);
    console.error("Registration Error:", error);
  }
}

async function loginUser(email, password) {
  try {
    showLoading();
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    currentUser = userCredential.user;
    hideLoading();
    showApp();
  } catch (error) {
    hideLoading();
    showError(`Login failed: ${error.message}`);
    console.error("Login Error:", error);
  }
}

function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    // Clear local data arrays on logout
    incomes = [];
    bills = [];
    expenses = [];
    activityLog = [];
    selectedFilterYear = null; // Reset filter state
    selectedFilterMonth = null;
    hideApp();
  }).catch((error) => {
    console.error("Logout failed:", error);
  });
}

// Initialize user data with sample data (if needed)
async function initializeUserData(userId) {
    const sampleDataDate = new Date(); // Use current date for relevance
    sampleDataDate.setDate(1); // Set to the 1st of the current month

    try {
        // Generate dates relative to the start of the current month
        const currentDateStr = formatDateForInput(sampleDataDate);
        const nextMonthDate = new Date(sampleDataDate);
        nextMonthDate.setMonth(sampleDataDate.getMonth() + 1);
        const nextMonthDateStr = formatDateForInput(nextMonthDate);
        const prevMonthDate = new Date(sampleDataDate);
        prevMonthDate.setMonth(sampleDataDate.getMonth() - 1);
        const prevMonthDateStr = formatDateForInput(prevMonthDate);


        const sampleIncomes = [
            { id: generateId(), source: "Paycheck 1", amount: 1800, date: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 15)) },
            { id: generateId(), source: "Freelance", amount: 450, date: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 25)) }
        ];

        const sampleBills = [
            { id: generateId(), name: "Rent", amount: 1200, dueDate: currentDateStr, paid: false, recurring: true, recurrencePattern: RECURRENCE_PATTERNS.MONTHLY },
            { id: generateId(), name: "Internet", amount: 60, dueDate: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 10)), paid: false, recurring: true, recurrencePattern: RECURRENCE_PATTERNS.MONTHLY },
            { id: generateId(), name: "Next Rent", amount: 1200, dueDate: nextMonthDateStr, paid: false, recurring: true, recurrencePattern: RECURRENCE_PATTERNS.MONTHLY }, // For demonstration
        ];

        const sampleExpenses = [
            { id: generateId(), category: "Groceries", amount: 120, date: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 5)), notes: "Weekly grocery shopping" },
            { id: generateId(), category: "Eating out", amount: 45, date: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 12)), notes: "Lunch with colleague" },
            { id: generateId(), category: "Savings", amount: 250, date: formatDateForInput(new Date(sampleDataDate.getFullYear(), sampleDataDate.getMonth(), 16)), notes: "Monthly savings transfer" }
        ];

        // Check if user already has data
        const incomesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).limit(1).get();

        if (incomesSnapshot.empty) {
          console.log("Initializing sample data for new user:", userId);
          const batch = db.batch();

          sampleIncomes.forEach(income => {
            const docRef = db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).doc(income.id);
            batch.set(docRef, income);
          });

          sampleBills.forEach(bill => {
            const docRef = db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).doc(bill.id);
            batch.set(docRef, bill);
          });

          sampleExpenses.forEach(expense => {
            const docRef = db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).doc(expense.id);
            batch.set(docRef, expense);
          });

          const activityLogEntry = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: "Account created with sample data",
            type: "auth"
          };
          const logRef = db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(activityLogEntry.id);
          batch.set(logRef, activityLogEntry);

          await batch.commit();
          console.log("Sample data initialized.");
        } else {
          console.log("User already has data, skipping sample data initialization.");
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
      console.warn("loadData called but no currentUser.");
      return;
    }

    console.log("loadData started for user:", currentUser.uid);

    const userId = currentUser.uid;

    // Load incomes
    console.log("Loading Incomes...");
    const incomesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).get();
    incomes = incomesSnapshot.docs.map(doc => doc.data());

    // Load bills
    console.log("Loading Bills...");
    const billsSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).get();
    bills = billsSnapshot.docs.map(doc => doc.data());
    // Ensure all bills have necessary properties
    bills = bills.map(bill => ({
      ...bill,
      paid: bill.paid !== undefined ? bill.paid : false,
      recurring: bill.recurring !== undefined ? bill.recurring : false,
      recurrencePattern: bill.recurrencePattern || RECURRENCE_PATTERNS.NONE
    }));

    // Load expenses
    console.log("Loading Expenses...");
    const expensesSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).get();
    expenses = expensesSnapshot.docs.map(doc => doc.data());
    // Ensure all expenses have notes field
    expenses = expenses.map(expense => ({
      ...expense,
      notes: expense.notes || ""
    }));

    // Load activity log
    console.log("Loading Activity Log...");
    const activityLogSnapshot = await db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    activityLog = activityLogSnapshot.docs.map(doc => doc.data());
    console.log("Firestore data loaded. Items:", { incomes: incomes.length, bills: bills.length, expenses: expenses.length });

    // Initialize filter to current month
    const now = new Date();
    selectedFilterYear = now.getFullYear();
    selectedFilterMonth = now.getMonth(); // 0-indexed
    console.log("Default filter set to:", selectedFilterYear, MONTH_NAMES[selectedFilterMonth]);

    // Populate the month filter dropdown
    console.log("Calling populateMonthFilterDropdown...");
    populateMonthFilterDropdown();

    hideLoading();

    // Update UI
    if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email;
    const subtitleElement = document.querySelector('.app-subtitle');
    if (subtitleElement) subtitleElement.textContent = `v${VERSION}`;
    console.log("Changing tab to dashboard...");
    changeTab('dashboard');

  } catch (error) {
    console.error("Error loading data:", error);
    hideLoading();
    showError("Failed to load budget data. Please try again.");
  }
}

// Log activity
async function logActivity(action, type, details = {}) {
  if (!currentUser) return;

  try {
    const userId = currentUser.uid;
    // Create a clean details object, avoiding potential issues
    const cleanDetails = {};
    for (const key in details) {
        if (Object.hasOwnProperty.call(details, key)) {
            // Only include simple types or arrays of simple types if necessary
             const value = details[key];
             if (typeof value !== 'object' || value === null || Array.isArray(value)) { // Allow arrays, might need refinement
                 cleanDetails[key] = value;
             } else if (value instanceof Date) { // Allow Date objects
                 cleanDetails[key] = value.toISOString(); // Store as ISO string
             }
             // Add more conditions if other simple object types are needed
        }
    }


    const newLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action,
      type,
      details: cleanDetails // Use the cleaned details
    };

    await db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(newLog.id).set(newLog);
    activityLog.unshift(newLog); // Add to the beginning of the local array
    if (activityLog.length > 50) { // Keep the local log capped
        activityLog.pop();
    }
    showSaveIndicator();

  } catch (error) {
    console.error("Error logging activity:", error);
    // Avoid showing user alert for logging errors unless critical
  }
}


// Generate next recurring bill based on recurrence pattern
function generateNextRecurringBill(bill) {
  if (!bill.dueDate) {
      console.error("Cannot generate next recurring bill: Missing dueDate.", bill);
      return null;
  }
  try {
    const [year, month, day] = bill.dueDate.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) throw new Error("Invalid dueDate format");

    // Create a new bill object
    const newBill = {
      ...bill,
      id: generateId(),
      paid: false
    };

    // Calculate the next due date based on recurrence pattern using UTC
    const dueDate = new Date(Date.UTC(year, month - 1, day));

    switch (bill.recurrencePattern) {
      case RECURRENCE_PATTERNS.MONTHLY:
        dueDate.setUTCMonth(dueDate.getUTCMonth() + 1);
        break;
      case RECURRENCE_PATTERNS.WEEKLY:
        dueDate.setUTCDate(dueDate.getUTCDate() + 7);
        break;
      case RECURRENCE_PATTERNS.BIWEEKLY:
        dueDate.setUTCDate(dueDate.getUTCDate() + 14);
        break;
      case RECURRENCE_PATTERNS.QUARTERLY:
        dueDate.setUTCMonth(dueDate.getUTCMonth() + 3);
        break;
      case RECURRENCE_PATTERNS.YEARLY:
        dueDate.setUTCFullYear(dueDate.getUTCFullYear() + 1);
        break;
      default:
        console.warn("Unknown recurrence pattern:", bill.recurrencePattern);
        return null;
    }

    // Format the new due date back to YYYY-MM-DD
    newBill.dueDate = formatDateForInput(dueDate);
    return newBill;

  } catch (error) {
      console.error("Error generating next recurring bill from:", bill, error);
      return null;
  }
}

// Show the save indicator
function showSaveIndicator() {
  const indicator = document.getElementById('save-indicator');
  if (!indicator) return;
  indicator.classList.add('visible');
  setTimeout(() => {
    indicator.classList.remove('visible');
  }, 2000);
}

// Generate a unique ID
function generateId() {
  // Improved randomness and length
  return `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 11)}`;
}

// UI functions
function showApp() {
  if (loginScreen) loginScreen.style.display = 'none';
  if (budgetApp) budgetApp.style.display = 'block';
  loadData(); // Load data when app is shown
}

function hideApp() {
  if (budgetApp) budgetApp.style.display = 'none';
  if (loginScreen) loginScreen.style.display = 'block';
  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  if(emailInput) emailInput.value = '';
  if(passwordInput) passwordInput.value = '';
  if(loginError) loginError.classList.add('hidden'); // Hide any previous errors
}

// Format helpers
function formatCurrency(amount) {
    // Ensure amount is a number
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
        // console.warn("formatCurrency received non-numeric value:", amount);
        return "$0.00"; // Or handle as appropriate
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(numAmount);
}

// Formats YYYY-MM-DD or ISO string to locale date string (e.g., MM/DD/YYYY)
function formatDate(dateString) {
    if (!dateString) return "";
    try {
        // Handle YYYY-MM-DD safely by constructing Date object with UTC values
        if (typeof dateString === 'string' && dateString.includes('-') && !dateString.includes('T')) {
            const parts = dateString.split('-');
            if (parts.length !== 3) throw new Error("Invalid date format");
            const [year, month, day] = parts.map(Number);
            if (isNaN(year) || isNaN(month) || isNaN(day)) throw new Error("Invalid date parts");
             // Use UTC constructor to avoid timezone shifts affecting the date
            const date = new Date(Date.UTC(year, month - 1, day));
            if (isNaN(date.getTime())) throw new Error("Constructed invalid date");
             // Use timeZone:'UTC' in options to display the correct date regardless of local timezone
            return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
        } else {
            // Handle ISO strings or other Date object inputs
            const date = new Date(dateString);
            if (isNaN(date.getTime())) throw new Error("Invalid date object or ISO string");
            // No timezone needed here if it's already a Date object or ISO string
            return date.toLocaleDateString('en-US');
        }
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return "Invalid Date"; // Return indicator for invalid dates
    }
}

// Formats ISO string to locale date and time string
function formatDateTime(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid DateTime";
    return date.toLocaleString('en-US'); // Uses local timezone
  } catch (e) {
    console.error("Error formatting datetime:", dateString, e);
    return "Invalid DateTime";
  }
}

// Helper to format a Date object into YYYY-MM-DD for input fields and Firestore
function formatDateForInput(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.warn("formatDateForInput received invalid date:", date, ". Using today.");
        const today = new Date();
        date = today; // Default to today if input is invalid
    }
    try {
        // Use UTC methods to avoid timezone shifts affecting the date components
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error in formatDateForInput with date:", date, e);
        const today = new Date(); // Fallback to today on error
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
}


// Calendar helper functions
function getDaysInMonth(year, month) {
  // Month is 0-indexed for Date object
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  // Month is 0-indexed for Date object
  return new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday...
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

// Gets bills (from the main 'bills' array) that fall on a specific calendar day
function getBillsForDay(year, month, day) {
  // month is 0-indexed here
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  // Filter ALL bills to find matches for this specific day
  return bills.filter(bill => bill.dueDate === dateString);
}

// --- Month Filter Logic ---

function populateMonthFilterDropdown() {
    const selectElement = document.getElementById('month-filter-select');
    if (!selectElement) {
        console.error("CRITICAL: Month filter select element (#month-filter-select) not found in DOM!");
        return;
    }
    console.log("populateMonthFilterDropdown: Found select element.");

    selectElement.innerHTML = ''; // Clear existing options

    const options = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    options.push({ value: 'all', text: 'All Time' });
    for (let i = -12; i <= 6; i++) {
        const date = new Date(currentYear, currentMonth + i, 1);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed
        const value = `${year}-${String(month + 1).padStart(2, '0')}`; // YYYY-MM format
        const text = `${MONTH_NAMES[month]} ${year}`;
        options.push({ value, text });
    }
    console.log("populateMonthFilterDropdown: Generated options:", options.length);

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        selectElement.appendChild(option);
    });
    console.log("populateMonthFilterDropdown: Finished appending options.");

    let selectedValue = 'all';
    if (selectedFilterYear !== null && selectedFilterMonth !== null) {
        selectedValue = `${selectedFilterYear}-${String(selectedFilterMonth + 1).padStart(2, '0')}`;
    }
    console.log("populateMonthFilterDropdown: Attempting to set selected value to:", selectedValue);

    selectElement.value = selectedValue;

    if (selectElement.value !== selectedValue && selectedValue !== 'all') {
        console.warn(`populateMonthFilterDropdown: Could not set dropdown to '${selectedValue}'. Defaulting to 'All Time'.`);
        selectElement.value = 'all';
        selectedFilterYear = null; // Adjust state if fallback occurs
        selectedFilterMonth = null;
    } else {
         console.log("populateMonthFilterDropdown: Successfully set dropdown value to:", selectElement.value);
    }
}

function handleMonthFilterChange() {
    const selectElement = document.getElementById('month-filter-select');
     if (!selectElement) {
        console.error("handleMonthFilterChange: Select element not found!");
        return;
    }
    const selectedValue = selectElement.value;
    console.log("Month filter changed to:", selectedValue);

    if (selectedValue === 'all') {
        selectedFilterYear = null;
        selectedFilterMonth = null;
    } else {
        try {
            const [year, month] = selectedValue.split('-').map(Number);
            if (isNaN(year) || isNaN(month)) throw new Error("Invalid value format");
            selectedFilterYear = year;
            selectedFilterMonth = month - 1; // Convert back to 0-indexed
        } catch (error) {
             console.error("Error parsing selected month filter value:", selectedValue, error);
             // Reset to 'all' if parsing fails
             selectedFilterYear = null;
             selectedFilterMonth = null;
             selectElement.value = 'all';
        }
    }

    const activeTabButton = document.querySelector('.tab.active');
    if (activeTabButton && activeTabButton.id) {
        const activeTabName = activeTabButton.id.split('-')[1];
        if (activeTabName) {
            console.log("Re-rendering tab:", activeTabName);
            changeTab(activeTabName);
        } else {
             console.warn("Could not extract tab name from active button ID:", activeTabButton.id);
             changeTab('dashboard'); // Default fallback
        }
    } else {
        console.warn("Could not find active tab button to re-render.");
        changeTab('dashboard'); // Default fallback
    }
}

// Helper function to filter data arrays by the selected month/year
function filterDataByMonth(dataArray, dateField = 'date') {
    if (selectedFilterYear === null || selectedFilterMonth === null) {
        return [...dataArray]; // Return a copy of all data if "All Time" is selected
    }

    return dataArray.filter(item => {
        if (!item || !item[dateField] || typeof item[dateField] !== 'string') return false; // Skip items without valid date field

        try {
            const dateStr = item[dateField];
            // Basic check for YYYY-MM-DD format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                // console.warn(`Invalid date format in field '${dateField}' for item:`, item);
                return false;
            }
            const [itemYear, itemMonth] = dateStr.split('-').map(Number);
            if (isNaN(itemYear) || isNaN(itemMonth)) return false; // Check parsing result

            // Compare year and 1-based month
            return itemYear === selectedFilterYear && itemMonth === selectedFilterMonth + 1;
        } catch (e) {
            console.warn(`Error parsing date field '${dateField}' for item:`, item, e);
            return false; // Exclude items with unparseable dates
        }
    });
}


// --- Calculation and Rendering Functions ---

// Calculate totals based on filtered data
function calculateTotals() {
  const filteredIncomes = filterDataByMonth(incomes, 'date');
  const filteredBills = filterDataByMonth(bills, 'dueDate');
  const filteredExpenses = filterDataByMonth(expenses, 'date');

  const totalIncome = filteredIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // Total for unpaid bills within the filtered month
  const totalUnpaidBills = filteredBills
    .filter(bill => !bill.paid)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const balance = totalIncome - totalUnpaidBills - totalExpenses; // Net change for the period

  // Total for paid bills within the filtered month (for info/verification)
  const totalPaidBills = filteredBills
    .filter(bill => bill.paid)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  // Total savings from filtered expenses
  const totalSavings = filteredExpenses
    .filter(expense => expense.category === "Savings")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
      totalIncome,
      totalBills: totalUnpaidBills, // Renamed for clarity in dashboard display
      totalExpenses,
      balance,
      totalPaidBills,
      totalSavings
    };
}

// Group filtered expenses by category
function getExpensesByCategory() {
  const filteredExpenses = filterDataByMonth(expenses, 'date');
  const result = {};
  filteredExpenses.forEach(expense => {
    const category = expense.category || "Uncategorized"; // Handle missing category
    const amount = Number(expense.amount || 0);
    if (!result[category]) {
      result[category] = 0;
    }
    result[category] += amount;
  });
  return result;
}

// Change tab function
function changeTab(tabName) {
  // Update active tab button
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  const tabButton = document.getElementById(`tab-${tabName}`);
  if(tabButton) {
      tabButton.classList.add('active');
  } else {
      console.warn(`Tab button not found for: tab-${tabName}`);
      // Fallback to dashboard if requested tab is invalid
      document.getElementById('tab-dashboard')?.classList.add('active');
      tabName = 'dashboard';
  }


  // Clear previous content and render new content
  if (contentDiv) contentDiv.innerHTML = ''; // Clear content before rendering new tab
  else { console.error("Content container div not found!"); return; }

  // Render content based on tab name
  try {
    if (tabName === 'dashboard') {
      renderDashboard(contentDiv);
    } else if (tabName === 'income') {
      renderIncomeTracker(contentDiv);
    } else if (tabName === 'bills') {
      renderBillTracker(contentDiv);
    } else if (tabName === 'expenses') {
      renderExpenseTracker(contentDiv);
    }
  } catch (error) {
      console.error(`Error rendering tab '${tabName}':`, error);
      contentDiv.innerHTML = `<div class="card bg-red-900 text-white p-4">Error rendering this section. Please check the console or try reloading.</div>`;
  }
}


// Render dashboard
function renderDashboard(container) {
    const { totalIncome, totalBills, totalExpenses, balance, totalPaidBills, totalSavings } = calculateTotals();
    const expensesByCategory = getExpensesByCategory();

    // Calendar starts at the selected filter month, or current if 'All Time'
    const calendarYear = selectedFilterYear !== null ? selectedFilterYear : new Date().getFullYear();
    const calendarMonth = selectedFilterMonth !== null ? selectedFilterMonth : new Date().getMonth(); // 0-indexed

    container.dataset.calendarYear = calendarYear;
    container.dataset.calendarMonth = calendarMonth;

    const filterPeriodText = selectedFilterYear !== null ? `${MONTH_NAMES[selectedFilterMonth]} ${selectedFilterYear}` : 'All Time';

    let html = `
    <div class="card">
      <h2 class="card-title">Financial Summary (${filterPeriodText})</h2>
      <div class="stat-grid">
        <div class="stat-card"><h3 class="stat-label income-label">Income</h3><p class="stat-value income-value">${formatCurrency(totalIncome)}</p></div>
        <div class="stat-card"><h3 class="stat-label bills-label">Unpaid Bills</h3><p class="stat-value bills-value">${formatCurrency(totalBills)}</p></div>
        <div class="stat-card"><h3 class="stat-label expenses-label">Expenses</h3><p class="stat-value expenses-value">${formatCurrency(totalExpenses)}</p></div>
        <div class="stat-card"><h3 class="stat-label balance-label">Net Change</h3><p class="stat-value ${balance >= 0 ? 'balance-value-positive' : 'balance-value-negative'}">${formatCurrency(balance)}</p></div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Savings Summary (${filterPeriodText})</h2>
      <div class="stat-card w-full savings-card"><h3 class="stat-label savings-label">Total Saved</h3><p class="stat-value savings-value">${formatCurrency(totalSavings)}</p></div>
    </div>

    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="card-title m-0">Bills Calendar</h2>
        <div class="flex items-center">
          <button id="prev-month" class="calendar-nav-btn">❮</button>
          <h3 id="calendar-title" class="text-gray-300 mx-4">${MONTH_NAMES[calendarMonth]} ${calendarYear}</h3>
          <button id="next-month" class="calendar-nav-btn">❯</button>
        </div>
      </div>
      <div id="bills-calendar" class="calendar-container">
        <div class="calendar-header">${DAY_NAMES.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}</div>
        <div class="calendar-body"><!-- Calendar days generated by renderCalendarBody --></div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Expense Breakdown (${filterPeriodText})</h2>
      <div class="space-y-3">
  `; // Expense breakdown content follows

    const totalExpenseAmount = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    if (Object.keys(expensesByCategory).length > 0) {
        Object.entries(expensesByCategory).sort(([,a],[,b]) => b-a) // Sort by amount descending
          .forEach(([category, amount]) => {
            const percentage = totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0;
            const progressBarColor = category === 'Savings' ? '#3b82f6' : '#059669'; // Blue for Savings
            html += `
            <div>
              <div class="flex justify-between mb-1">
                <span class="font-medium text-gray-300">${category}</span>
                <span class="text-gray-300 ${category === 'Savings' ? 'savings-amount' : ''}">
                  ${formatCurrency(amount)} (${percentage.toFixed(1)}%)
                </span>
              </div>
              <div class="progress-container">
                <div class="progress-bar" style="width: ${percentage}%; background-color: ${progressBarColor};"></div>
              </div>
            </div>`;
        });
    } else {
        html += `<p class="text-gray-400">No expense data for this period.</p>`;
    }
    html += `</div></div>`; // Close Expense Breakdown card


    // Bills Due in Selected Month Section
    html += `<div class="card">
               <h2 class="card-title">Bills Due in ${filterPeriodText}</h2>
               <div class="space-y-3">`;

    let billsForSelectedMonth = [];
    if (selectedFilterYear !== null && selectedFilterMonth !== null) {
        // Use the filterDataByMonth helper function
        billsForSelectedMonth = filterDataByMonth(bills, 'dueDate')
            .sort((a, b) => { // Sort by due date within the month
                 try {
                    // Use UTC dates for comparison to avoid timezone issues
                    const dateA = new Date(Date.UTC(...(a.dueDate.split('-').map((n,i)=>i===1?n-1:n)))); // month is 0-indexed
                    const dateB = new Date(Date.UTC(...(b.dueDate.split('-').map((n,i)=>i===1?n-1:n))));
                    return dateA - dateB; // Ascending order
                 } catch { return 0; } // Keep order if dates are invalid
            });
    }

    if (billsForSelectedMonth.length > 0) {
        billsForSelectedMonth.forEach(bill => {
            const recurringIcon = bill.recurring ? `<span class="ml-2 text-blue-300 recurring-icon" title="Recurring: ${bill.recurrencePattern}">↻</span>` : '';
            const isPaid = bill.paid;
            const statusText = isPaid ? 'Paid' : 'Unpaid';
            const statusClass = isPaid ? 'text-green-300 paid-indicator-yes' : 'text-yellow-300 paid-indicator-no';

            html += `
                <div class="flex justify-between items-center border-b border-gray-700 pb-2 last:border-b-0">
                  <div>
                    <div class="font-medium text-gray-300 flex items-center">${bill.name}${recurringIcon}</div>
                    <div class="text-sm text-gray-400">Due: ${formatDate(bill.dueDate)}</div>
                  </div>
                  <div class="flex items-center space-x-3">
                     <span class="text-sm font-medium ${statusClass} w-12 text-center">${statusText}</span>
                     <div class="text-yellow-300 font-medium w-20 text-right">${formatCurrency(bill.amount)}</div>
                    ${!isPaid ? `
                    <button class="toggle-paid-btn mark-paid-btn" title="Mark ${bill.name} as Paid" onclick="toggleBillPaid('${bill.id}', true)">
                        Mark Paid
                    </button>
                    ` : `
                     <button class="toggle-paid-btn mark-unpaid-btn" title="Mark ${bill.name} as Unpaid" onclick="toggleBillPaid('${bill.id}', false)">
                        Mark Unpaid
                    </button>
                    `}
                  </div>
                </div>`;
        });
    } else {
        if (selectedFilterYear !== null) {
            html += `<p class="text-gray-400 p-2">No bills found due in ${filterPeriodText}.</p>`;
        } else {
            html += `<p class="text-gray-400 p-2">Select a specific month to see bills due in that period.</p>`;
        }
    }

    html += `</div></div>`; // Close Bills Due card

    container.innerHTML = html; // Set the generated HTML to the container

    // Render the calendar body AFTER the main HTML is set
    renderCalendarBody(calendarYear, calendarMonth);

    // Add event listeners for calendar navigation AFTER elements are in DOM
    document.getElementById('prev-month')?.addEventListener('click', () => navigateCalendar(container, 'prev'));
    document.getElementById('next-month')?.addEventListener('click', () => navigateCalendar(container, 'next'));
}

// Renders the body of the calendar for a given year and month
function renderCalendarBody(year, month) {
    const calendarBody = document.querySelector('.calendar-body');
    if (!calendarBody) { console.error("Calendar body not found for rendering."); return; }

    let html = '';
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month); // 0=Sun, 1=Mon,...
    const currentDate = new Date(); // For highlighting today

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        html += `<div class="calendar-day calendar-day-empty"></div>`;
    }

    // Add calendar days
    for (let day = 1; day <= daysInMonth; day++) {
        // Fetch bills for this specific day from the *unfiltered* list
        const dayBills = getBillsForDay(year, month, day);
        const hasUnpaidBills = dayBills.some(bill => !bill.paid);
        const totalDayAmount = dayBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);

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

        html += `<div class="${dayClass}">
                   <div class="calendar-day-number">${day}</div>`;

        if (dayBills.length > 0) {
            html += `<div class="calendar-day-amount">${formatCurrency(totalDayAmount)}</div>`;
            const shownBills = dayBills.slice(0, 2); // Show max 2 bills inline
            html += `<div class="calendar-day-bills">`;
            shownBills.forEach(bill => {
                const isPaid = bill.paid;
                const billNameShort = bill.name.length > 8 ? bill.name.substring(0, 6) + '...' : bill.name;
                html += `<div class="calendar-day-bill ${isPaid ? 'bill-paid' : 'bill-unpaid'}"
                              title="${bill.name}: ${formatCurrency(bill.amount)} (${isPaid ? 'Paid' : 'Unpaid'})">
                           ${billNameShort}
                         </div>`;
            });
            if (dayBills.length > 2) {
                html += `<div class="calendar-day-more">+${dayBills.length - 2} more</div>`;
            }
            html += `</div>`; // end calendar-day-bills
        }
        html += `</div>`; // end calendar-day
    }

    calendarBody.innerHTML = html;
}


// Navigate the calendar (only affects calendar display, not the main filter)
function navigateCalendar(container, direction) {
  if (!container || !container.dataset) return;
  let year = parseInt(container.dataset.calendarYear);
  let month = parseInt(container.dataset.calendarMonth); // 0-indexed
  if(isNaN(year) || isNaN(month)) { console.error("Invalid calendar year/month in dataset"); return; }

  const newDate = direction === 'prev' ? getPreviousMonth(year, month) : getNextMonth(year, month);

  // Update data attributes and title
  container.dataset.calendarYear = newDate.year;
  container.dataset.calendarMonth = newDate.month;
  const calendarTitle = document.getElementById('calendar-title');
  if (calendarTitle) {
      calendarTitle.textContent = `${MONTH_NAMES[newDate.month]} ${newDate.year}`;
  }

  // Regenerate calendar body
  renderCalendarBody(newDate.year, newDate.month);
}


// Render income tracker
function renderIncomeTracker(container) {
  let html = `
    <div class="card">
      <h2 class="card-title">Add New Income</h2>
      <div class="form-grid">
        <div><label class="form-label" for="income-source">Source</label><select id="income-source" class="form-select"><option value="Doctor Care">Doctor Care</option><option value="CORE">CORE</option><option value="Other">Other</option></select></div>
        <div id="custom-source-container" style="display: none;"><label class="form-label" for="income-custom-source">Specify Source</label><input type="text" id="income-custom-source" class="form-input" placeholder="Income source"></div>
        <div><label class="form-label" for="income-amount">Amount</label><input type="number" id="income-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01"></div>
        <div><label class="form-label" for="income-date">Date</label><input type="date" id="income-date" class="form-input" value="${formatDateForInput(new Date())}"></div>
      </div>
      <div class="mt-4"><button id="add-income-btn" class="btn btn-green">Add Income</button></div>
    </div>
    <div class="card">
      <h2 class="card-title">Income History (${selectedFilterYear !== null ? MONTH_NAMES[selectedFilterMonth] + ' ' + selectedFilterYear : 'All Time'})</h2>
      <div id="income-list"><!-- Income entries will be added here --></div>
    </div>`;
  container.innerHTML = html;

  const sourceSelect = document.getElementById('income-source');
  const customSourceContainer = document.getElementById('custom-source-container');
  if (sourceSelect && customSourceContainer) {
      sourceSelect.addEventListener('change', function() {
          customSourceContainer.style.display = this.value === 'Other' ? 'block' : 'none';
      });
  }

  renderIncomeList(); // Render the list for the current filter

  const addBtn = document.getElementById('add-income-btn');
  if (addBtn) {
      addBtn.addEventListener('click', async function() {
        if (!currentUser) return; // Safety check

        const source = sourceSelect ? sourceSelect.value : 'Other';
        const customSourceInput = document.getElementById('income-custom-source');
        const customSource = customSourceInput ? customSourceInput.value.trim() : '';
        const amountInput = document.getElementById('income-amount');
        const dateInput = document.getElementById('income-date');

        const amount = amountInput ? amountInput.value : '';
        const date = dateInput ? dateInput.value : ''; // YYYY-MM-DD

        if (!amount || !date) { alert('Please fill in amount and date.'); return; }
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) { alert('Please enter a valid positive amount.'); return; }

        const finalSource = source === 'Other' ? (customSource || 'Other Income') : source;

        const newIncome = {
          id: generateId(),
          source: finalSource,
          amount: numAmount,
          date: date
        };

        try {
          showLoading();
          await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(newIncome.id).set(newIncome);
          incomes.push(newIncome); // Add to local cache
          await logActivity(`Added income: ${finalSource} - ${formatCurrency(newIncome.amount)}`, 'income', { id: newIncome.id, source: newIncome.source, amount: newIncome.amount, date: newIncome.date });

          // Reset form
          if (sourceSelect) sourceSelect.value = 'Doctor Care';
          if (customSourceContainer) customSourceContainer.style.display = 'none';
          if (customSourceInput) customSourceInput.value = '';
          if (amountInput) amountInput.value = '';
          if (dateInput) dateInput.value = formatDateForInput(new Date()); // Reset to today

          hideLoading();
          renderIncomeList(); // Re-render the list (will be filtered)
        } catch (error) {
          hideLoading();
          console.error("Error adding income:", error);
          alert("Failed to add income. Please try again.");
        }
      });
  }
}

// Render income list (filtered)
function renderIncomeList() {
  const container = document.getElementById('income-list');
  if (!container) { console.error("Income list container not found."); return; }

  const filteredIncomes = filterDataByMonth(incomes, 'date');

  if (filteredIncomes.length > 0) {
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

    // Sort filtered incomes by date (newest first) using UTC for consistency
    const sortedIncomes = filteredIncomes.sort((a, b) => {
      try {
         const dateA = new Date(Date.UTC(...(a.date.split('-').map((n, i) => i === 1 ? n - 1 : n))));
         const dateB = new Date(Date.UTC(...(b.date.split('-').map((n, i) => i === 1 ? n - 1 : n))));
         return dateB - dateA; // Descending order
      } catch { return 0; } // Keep order if dates are invalid
    });

    sortedIncomes.forEach(income => {
      html += `
        <tr class="border-b border-gray-700 hover:bg-gray-700">
          <td class="p-2 text-gray-300">${income.source || 'N/A'}</td>
          <td class="p-2 text-gray-300">${formatDate(income.date)}</td>
          <td class="p-2 text-right text-green-300">${formatCurrency(income.amount)}</td>
          <td class="p-2 text-center">
            <button class="text-red-400 hover:text-red-300 px-2 py-1" title="Delete Income" onclick="deleteIncome('${income.id}')">
              Delete
            </button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  } else {
    container.innerHTML = `<p class="text-gray-400 p-4 text-center">No income entries found for this period.</p>`;
  }
}

// Delete income
async function deleteIncome(id) {
  if (!currentUser) return;
  if (!confirm("Are you sure you want to delete this income entry? This cannot be undone.")) return;

  const incomeIndex = incomes.findIndex(i => i.id === id);
    if (incomeIndex === -1) {
        console.warn("Income not found locally for deletion:", id);
        // Optionally try to delete from DB anyway, though it shouldn't happen
        // await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(id).delete();
        return;
    }
    const incomeToDelete = { ...incomes[incomeIndex] }; // Copy before deleting

  try {
    showLoading();
    // Delete from Firestore first
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(id).delete();

    // Then remove from local cache
    incomes.splice(incomeIndex, 1);

    await logActivity(`Deleted income: ${incomeToDelete.source} - ${formatCurrency(incomeToDelete.amount)}`, 'delete', { id: incomeToDelete.id, source: incomeToDelete.source });

    hideLoading();
    renderIncomeList(); // Update list view

    // If dashboard is active, re-render it too
    if (document.getElementById('tab-dashboard')?.classList.contains('active')) {
        renderDashboard(contentDiv);
    }
  } catch (error) {
    hideLoading();
    console.error("Error deleting income:", error);
    alert("Failed to delete income. Please try again.");
    // Note: Local array might be out of sync if DB delete failed but local succeeded before error
  }
}


// Render bill tracker
function renderBillTracker(container) {
    let html = `
    <div class="card">
      <h2 class="card-title">Add New Bill</h2>
      <div class="form-grid">
        <div><label class="form-label" for="bill-name">Bill Name</label><input type="text" id="bill-name" class="form-input" placeholder="e.g., Rent, Netflix"></div>
        <div><label class="form-label" for="bill-amount">Amount</label><input type="number" id="bill-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01"></div>
        <div><label class="form-label" for="bill-due-date">Due Date</label><input type="date" id="bill-due-date" class="form-input" value="${formatDateForInput(new Date())}"></div>
      </div>

      <div class="mt-4 flex items-center mb-4">
        <input type="checkbox" id="bill-recurring" class="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded">
        <label for="bill-recurring" class="form-label mb-0 cursor-pointer select-none">Is this a recurring bill?</label>
      </div>

      <div id="recurrence-options" class="mb-4 space-y-2" style="display: none;">
        <label class="form-label" for="recurrence-pattern">How often does it recur?</label>
        <select id="recurrence-pattern" class="form-select">
          <option value="${RECURRENCE_PATTERNS.MONTHLY}">Monthly</option>
          <option value="${RECURRENCE_PATTERNS.WEEKLY}">Weekly</option>
          <option value="${RECURRENCE_PATTERNS.BIWEEKLY}">Bi-weekly (Every 2 Weeks)</option>
          <option value="${RECURRENCE_PATTERNS.QUARTERLY}">Quarterly (Every 3 Months)</option>
          <option value="${RECURRENCE_PATTERNS.YEARLY}">Yearly</option>
        </select>
      </div>

      <div class="mt-4"><button id="add-bill-btn" class="btn btn-yellow">Add Bill</button></div>
    </div>

    <div class="card">
       <h2 class="card-title">Bill List (${selectedFilterYear !== null ? MONTH_NAMES[selectedFilterMonth] + ' ' + selectedFilterYear : 'All Time'})</h2>
       <div class="mb-4 flex justify-start items-center">
            <span class="mr-2 text-gray-400 font-medium">Filter:</span>
            <div class="inline-flex rounded-md shadow-sm" role="group">
                <button id="show-all-bills" data-filter="all" class="bill-filter-btn px-4 py-1 text-sm font-medium text-gray-300 bg-gray-700 rounded-l-lg border border-gray-600 hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-white active-filter">All</button>
                <button id="show-unpaid-bills" data-filter="unpaid" class="bill-filter-btn px-4 py-1 text-sm font-medium text-gray-300 bg-gray-700 border-t border-b border-gray-600 hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-white">Unpaid</button>
                <button id="show-paid-bills" data-filter="paid" class="bill-filter-btn px-4 py-1 text-sm font-medium text-gray-300 bg-gray-700 rounded-r-lg border border-gray-600 hover:bg-gray-600 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-white">Paid</button>
            </div>
        </div>
        <div id="bill-list"><!-- Bill entries will be added here --></div>
    </div>`;
    container.innerHTML = html;

    const recurringCheckbox = document.getElementById('bill-recurring');
    const recurrenceOptionsDiv = document.getElementById('recurrence-options');
    if (recurringCheckbox && recurrenceOptionsDiv) {
        recurringCheckbox.addEventListener('change', function() {
            recurrenceOptionsDiv.style.display = this.checked ? 'block' : 'none';
        });
    }

    document.querySelectorAll('.bill-filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.bill-filter-btn').forEach(btn => btn.classList.remove('active-filter', 'bg-gray-600'));
            this.classList.add('active-filter', 'bg-gray-600');
            renderBillList(this.dataset.filter);
        });
    });

    renderBillList('all'); // Initial render

    const addBtn = document.getElementById('add-bill-btn');
    if(addBtn) {
      addBtn.addEventListener('click', async function() {
        if (!currentUser) return;

        const nameInput = document.getElementById('bill-name');
        const amountInput = document.getElementById('bill-amount');
        const dueDateInput = document.getElementById('bill-due-date');
        const isRecurring = recurringCheckbox ? recurringCheckbox.checked : false;
        const recurrencePatternSelect = document.getElementById('recurrence-pattern');

        const name = nameInput ? nameInput.value.trim() : '';
        const amount = amountInput ? amountInput.value : '';
        const dueDate = dueDateInput ? dueDateInput.value : '';

        if (!name || !amount || !dueDate) { alert('Please fill in bill name, amount, and due date.'); return; }
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) { alert('Please enter a valid positive amount.'); return; }

        const newBill = {
          id: generateId(),
          name: name,
          amount: numAmount,
          dueDate: dueDate,
          paid: false,
          recurring: isRecurring,
          recurrencePattern: isRecurring && recurrencePatternSelect ? recurrencePatternSelect.value : RECURRENCE_PATTERNS.NONE
        };

        try {
          showLoading();
          await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(newBill.id).set(newBill);
          bills.push(newBill); // Add to local cache
          await logActivity(`Added ${newBill.recurring ? 'recurring ' : ''}bill: ${newBill.name} - ${formatCurrency(newBill.amount)}`, 'bill', { id: newBill.id, name: newBill.name, recurring: newBill.recurring });

          // Reset form
          if (nameInput) nameInput.value = '';
          if (amountInput) amountInput.value = '';
          if (dueDateInput) dueDateInput.value = formatDateForInput(new Date());
          if (recurringCheckbox) recurringCheckbox.checked = false;
          if (recurrenceOptionsDiv) recurrenceOptionsDiv.style.display = 'none';
          if (recurrencePatternSelect) recurrencePatternSelect.value = RECURRENCE_PATTERNS.MONTHLY;

          hideLoading();
          // Re-render list with current status filter
          const activeFilter = document.querySelector('.bill-filter-btn.active-filter')?.dataset.filter || 'all';
          renderBillList(activeFilter);

        } catch (error) {
          hideLoading();
          console.error("Error adding bill:", error);
          alert("Failed to add bill. Please try again.");
        }
      });
    }
}

// Render bill list (filtered by month and status)
function renderBillList(statusFilter = 'all') {
    const container = document.getElementById('bill-list');
    if (!container) { console.error("Bill list container not found."); return; }

    // 1. Filter by selected month/year
    let monthFilteredBills = filterDataByMonth(bills, 'dueDate');

    // 2. Filter by status (paid/unpaid/all)
    let finalFilteredBills = monthFilteredBills;
    if (statusFilter === 'paid') {
        finalFilteredBills = monthFilteredBills.filter(bill => bill.paid);
    } else if (statusFilter === 'unpaid') {
        finalFilteredBills = monthFilteredBills.filter(bill => !bill.paid);
    }
    // 'all' uses monthFilteredBills directly

    if (finalFilteredBills.length > 0) {
        let html = `
        <div class="overflow-x-auto">
            <table class="w-full">
            <thead>
                <tr class="text-left border-b border-gray-700">
                <th class="p-2 text-gray-300">Name</th>
                <th class="p-2 text-gray-300">Due Date</th>
                <th class="p-2 text-gray-300">Status</th>
                <th class="p-2 text-right text-gray-300">Amount</th>
                <th class="p-2 text-center text-gray-300 min-w-[150px]">Actions</th>
                </tr>
            </thead>
            <tbody>`;

        // Sort the final list by due date (UTC for consistency)
        const sortedBills = finalFilteredBills.sort((a, b) => {
             try {
                const dateA = new Date(Date.UTC(...(a.dueDate.split('-').map((n, i) => i === 1 ? n - 1 : n))));
                const dateB = new Date(Date.UTC(...(b.dueDate.split('-').map((n, i) => i === 1 ? n - 1 : n))));
                return dateA - dateB; // Ascending order by due date
             } catch { return 0;} // Keep original order if dates invalid
        });

        sortedBills.forEach(bill => {
            const recurringIcon = bill.recurring ?
                `<span class="ml-2 text-blue-300 recurring-icon" title="Recurring: ${bill.recurrencePattern}">↻</span>` : '';
            const statusClass = bill.paid ? 'text-green-300 paid-indicator-yes' : 'text-yellow-300 paid-indicator-no';
            const statusText = bill.paid ? 'Paid' : 'Unpaid';

            html += `
                <tr class="border-b border-gray-700 hover:bg-gray-700">
                  <td class="p-2 text-gray-300 flex items-center">${bill.name || 'N/A'}${recurringIcon}</td>
                  <td class="p-2 text-gray-300">${formatDate(bill.dueDate)}</td>
                  <td class="p-2"><span class="${statusClass}">${statusText}</span></td>
                  <td class="p-2 text-right text-yellow-300">${formatCurrency(bill.amount)}</td>
                  <td class="p-2 text-center">
                      <div class="flex justify-center items-center space-x-2">
                      ${!bill.paid ? `
                          <button class="toggle-paid-btn mark-paid-btn" title="Mark ${bill.name} as Paid" onclick="toggleBillPaid('${bill.id}', true)">
                          Mark Paid
                          </button>
                      ` : `
                          <button class="toggle-paid-btn mark-unpaid-btn" title="Mark ${bill.name} as Unpaid" onclick="toggleBillPaid('${bill.id}', false)">
                          Mark Unpaid
                          </button>
                      `}
                      <button class="text-red-400 hover:text-red-300 px-2 py-1" title="Delete Bill" onclick="deleteBill('${bill.id}')">
                          Delete
                      </button>
                      </div>
                  </td>
                </tr>`;
        });

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    } else {
        const filterText = statusFilter !== 'all' ? statusFilter : 'any';
        container.innerHTML = `<p class="text-gray-400 p-4 text-center">No ${filterText} bills found for this period.</p>`;
    }
}

// Toggle bill paid status
async function toggleBillPaid(id, paidStatus) {
  if (!currentUser) return;

  const billIndex = bills.findIndex(b => b.id === id);
  if (billIndex === -1) {
    console.warn("Bill not found locally:", id);
    return; // Bill not found in local cache
  }

  const billToUpdate = bills[billIndex];

  // Avoid redundant updates
  if (billToUpdate.paid === paidStatus) {
      console.log("Bill status already set to:", paidStatus);
      return;
  }

  // Get current status filter before potential changes
  const activeFilterButton = document.querySelector('.bill-filter-btn.active-filter');
  const statusFilter = activeFilterButton ? activeFilterButton.dataset.filter : 'all';

  try {
    showLoading();
    // Update Firestore first
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).update({ paid: paidStatus });

    // Update local cache
    billToUpdate.paid = paidStatus;

    await logActivity(`Marked bill '${billToUpdate.name}' as ${paidStatus ? 'Paid' : 'Unpaid'}`, 'bill', { id: billToUpdate.id, name: billToUpdate.name, paid: paidStatus });

    // Handle recurring bill generation ONLY if marking as PAID and it's recurring
    let nextBillCreated = false;
    if (paidStatus && billToUpdate.recurring && billToUpdate.recurrencePattern !== RECURRENCE_PATTERNS.NONE) {
      const nextBill = generateNextRecurringBill(billToUpdate);
      if (nextBill) {
        // Check if a bill with the same name, amount, and due date already exists
        const exists = bills.some(b =>
            b.name === nextBill.name &&
            b.dueDate === nextBill.dueDate &&
            Number(b.amount) === Number(nextBill.amount) &&
            b.id !== nextBill.id // Ensure it's not the same bill object if somehow IDs matched
        );
        if (!exists) {
            console.log("Generating next recurring bill:", nextBill);
            await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(nextBill.id).set(nextBill);
            bills.push(nextBill); // Add new recurring bill to local cache
            await logActivity(`Generated next recurring bill: ${nextBill.name} for ${formatDate(nextBill.dueDate)}`, 'bill', { id: nextBill.id, name: nextBill.name });
            nextBillCreated = true;
        } else {
             console.log("Next recurring bill already exists, skipping creation:", nextBill.name, nextBill.dueDate);
        }
      }
    }

    hideLoading();

    // Re-render the list with the original status filter
    renderBillList(statusFilter);

    // If dashboard is active, update it too
    if (document.getElementById('tab-dashboard')?.classList.contains('active')) {
      renderDashboard(contentDiv);
    }

  } catch (error) {
    // No need to revert local cache if DB update fails first
    hideLoading();
    console.error("Error updating bill status:", error);
    alert(`Failed to mark bill as ${paidStatus ? 'Paid' : 'Unpaid'}. Please try again.`);
    renderBillList(statusFilter); // Re-render to ensure UI consistency after error
  }
}

// Delete bill
async function deleteBill(id) {
  if (!currentUser) return;
   if (!confirm("Are you sure you want to delete this bill? This cannot be undone.")) return;

  const billIndex = bills.findIndex(b => b.id === id);
  if (billIndex === -1) {
    console.warn("Bill not found locally for deletion:", id);
    return;
  }
  const billToDelete = { ...bills[billIndex] }; // Copy before deleting

  // Get current status filter
  const activeFilterButton = document.querySelector('.bill-filter-btn.active-filter');
  const statusFilter = activeFilterButton ? activeFilterButton.dataset.filter : 'all';

  try {
    showLoading();
    // Delete from Firestore first
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).delete();

    // Then remove from local cache
    bills.splice(billIndex, 1);

    await logActivity(`Deleted bill: ${billToDelete.name} (${formatCurrency(billToDelete.amount)})`, 'delete', { id: billToDelete.id, name: billToDelete.name });

    hideLoading();
    // Re-render list with current filter
    renderBillList(statusFilter);

    // If dashboard is active, re-render it
    if (document.getElementById('tab-dashboard')?.classList.contains('active')) {
      renderDashboard(contentDiv);
    }
  } catch (error) {
     // No need to revert local delete if DB failed first
    hideLoading();
    console.error("Error deleting bill:", error);
    alert("Failed to delete bill. Please try again.");
    renderBillList(statusFilter); // Re-render to ensure UI consistency
  }
}

// Render expense tracker
function renderExpenseTracker(container) {
    let html = `
    <div class="card">
      <h2 class="card-title">Add New Expense</h2>
      <div class="form-grid">
        <div>
          <label class="form-label" for="expense-category">Category</label>
          <select id="expense-category" class="form-select">
            <option value="">-- Select Category --</option>
            <option value="Eating out">Eating out</option>
            <option value="Groceries">Groceries</option>
            <option value="Gas">Gas</option>
            <option value="Kyliee">Kyliee</option>
            <option value="Personal care">Personal care</option>
            <option value="Shopping">Shopping</option>
            <option value="Pets">Pets</option>
            <option value="Gifts">Gifts</option>
            <option value="Savings">Savings</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Utilities">Utilities (non-bill)</option>
            <option value="Transportation">Transportation (non-gas)</option>
            <option value="Health">Health</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div><label class="form-label" for="expense-amount">Amount</label><input type="number" id="expense-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01"></div>
        <div><label class="form-label" for="expense-date">Date</label><input type="date" id="expense-date" class="form-input" value="${formatDateForInput(new Date())}"></div>
      </div>

      <div class="mt-4"><label class="form-label" for="expense-notes">Notes (Optional)</label><textarea id="expense-notes" class="form-input h-20 resize-y" placeholder="e.g., Dinner with friends, Weekly groceries"></textarea></div>
      <div class="mt-4"><button id="add-expense-btn" class="btn btn-red">Add Expense</button></div>
    </div>

    <div class="card">
      <h2 class="card-title">Expense History (${selectedFilterYear !== null ? MONTH_NAMES[selectedFilterMonth] + ' ' + selectedFilterYear : 'All Time'})</h2>
      <div id="expense-list"><!-- Expense entries will be added here --></div>
    </div>`;
    container.innerHTML = html;

    renderExpenseList(); // Render list based on current filter

    const addBtn = document.getElementById('add-expense-btn');
    if(addBtn) {
      addBtn.addEventListener('click', async function() {
        if (!currentUser) return;

        const categorySelect = document.getElementById('expense-category');
        const amountInput = document.getElementById('expense-amount');
        const dateInput = document.getElementById('expense-date');
        const notesTextarea = document.getElementById('expense-notes');

        const category = categorySelect ? categorySelect.value : '';
        const amount = amountInput ? amountInput.value : '';
        const date = dateInput ? dateInput.value : '';
        const notes = notesTextarea ? notesTextarea.value.trim() : '';

        if (!category || !amount || !date) { alert('Please select a category and fill in amount and date.'); return; }
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) { alert('Please enter a valid positive amount.'); return; }

        const newExpense = {
          id: generateId(),
          category: category,
          amount: numAmount,
          date: date,
          notes: notes
        };

        try {
          showLoading();
          await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(newExpense.id).set(newExpense);
          expenses.push(newExpense); // Add to local cache
          await logActivity(`Added expense: ${category} - ${formatCurrency(newExpense.amount)}`, 'expense', { id: newExpense.id, category: newExpense.category, amount: newExpense.amount });

          // Reset form
          if(categorySelect) categorySelect.value = '';
          if(amountInput) amountInput.value = '';
          if(dateInput) dateInput.value = formatDateForInput(new Date());
          if(notesTextarea) notesTextarea.value = '';

          hideLoading();
          renderExpenseList(); // Re-render list (will be filtered)

        } catch (error) {
          hideLoading();
          console.error("Error adding expense:", error);
          alert("Failed to add expense. Please try again.");
        }
      });
    }
}

// Render expense list (filtered)
function renderExpenseList() {
  const container = document.getElementById('expense-list');
   if (!container) { console.error("Expense list container not found."); return; }

  const filteredExpenses = filterDataByMonth(expenses, 'date');

  if (filteredExpenses.length > 0) {
    let html = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-left border-b border-gray-700">
              <th class="p-2 text-gray-300">Category</th>
              <th class="p-2 text-gray-300">Date</th>
              <th class="p-2 text-gray-300">Notes</th>
              <th class="p-2 text-right text-gray-300">Amount</th>
              <th class="p-2 text-center text-gray-300 min-w-[150px]">Actions</th>
            </tr>
          </thead>
          <tbody>`;

    // Sort filtered expenses by date (newest first) using UTC
    const sortedExpenses = filteredExpenses.sort((a, b) => {
         try {
            const dateA = new Date(Date.UTC(...(a.date.split('-').map((n, i) => i === 1 ? n - 1 : n))));
            const dateB = new Date(Date.UTC(...(b.date.split('-').map((n, i) => i === 1 ? n - 1 : n))));
            return dateB - dateA; // Descending
         } catch {return 0;} // Keep order if dates invalid
    });

    sortedExpenses.forEach(expense => {
      const notesDisplay = expense.notes ? expense.notes : '-';
      // Use blue for Savings, red for others
      const amountClass = expense.category === 'Savings' ? 'savings-amount' : 'text-red-300';

      html += `
        <tr class="border-b border-gray-700 hover:bg-gray-700">
          <td class="p-2 text-gray-300">${expense.category || 'N/A'}</td>
          <td class="p-2 text-gray-300">${formatDate(expense.date)}</td>
          <td class="p-2 text-gray-400">
            <div class="note-text" title="${expense.notes || ''}">${notesDisplay}</div>
          </td>
          <td class="p-2 text-right ${amountClass}">${formatCurrency(expense.amount)}</td>
          <td class="p-2 text-center">
            <div class="flex justify-center items-center space-x-2">
              <button class="text-blue-400 hover:text-blue-300 px-2 py-1" title="Edit Notes" onclick="editExpenseNotes('${expense.id}')">
                Edit Notes
              </button>
              <button class="text-red-400 hover:text-red-300 px-2 py-1" title="Delete Expense" onclick="deleteExpense('${expense.id}')">
                Delete
              </button>
            </div>
          </td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  } else {
    container.innerHTML = `<p class="text-gray-400 p-4 text-center">No expense entries found for this period.</p>`;
  }
}

// Edit expense notes modal trigger
function editExpenseNotes(id) {
  const expense = expenses.find(e => e.id === id);
  if (!expense) { console.warn("Expense not found for editing notes:", id); return; }

  const modal = document.getElementById('edit-notes-modal');
  const expenseIdField = document.getElementById('edit-expense-id');
  const categoryDisplay = document.getElementById('edit-notes-category');
  const amountDisplay = document.getElementById('edit-notes-amount');
  const dateDisplay = document.getElementById('edit-notes-date');
  const notesTextarea = document.getElementById('edit-notes-textarea');

  if (!modal || !expenseIdField || !categoryDisplay || !amountDisplay || !dateDisplay || !notesTextarea) {
      console.error("One or more elements for edit notes modal not found.");
      return;
  }

  expenseIdField.value = id;
  categoryDisplay.textContent = expense.category || 'N/A';
  amountDisplay.textContent = formatCurrency(expense.amount);
  dateDisplay.textContent = formatDate(expense.date);
  notesTextarea.value = expense.notes || '';

  modal.style.display = 'flex';
  notesTextarea.focus(); // Focus textarea
}

// Save updated expense notes
async function saveExpenseNotes() {
  if (!currentUser) return;

  const expenseIdField = document.getElementById('edit-expense-id');
  const notesTextarea = document.getElementById('edit-notes-textarea');
  if (!expenseIdField || !notesTextarea) { console.error("Modal fields not found for saving notes."); return; }

  const id = expenseIdField.value;
  const newNotes = notesTextarea.value.trim();
  const expenseIndex = expenses.findIndex(e => e.id === id);

  if (expenseIndex === -1) {
      console.warn("Expense not found locally for notes update:", id);
      hideEditNotesModal();
      return;
  }
   // Only update if notes actually changed
   if (expenses[expenseIndex].notes === newNotes) {
       console.log("Notes haven't changed.");
       hideEditNotesModal();
       return;
   }

  try {
    showLoading();
    // Update Firestore first
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).update({ notes: newNotes });

    // Update local cache
    expenses[expenseIndex].notes = newNotes;

    await logActivity(`Updated notes for expense: ${expenses[expenseIndex].category}`, 'expense', { id: id, category: expenses[expenseIndex].category, notes: newNotes });

    hideLoading();
    hideEditNotesModal(); // Hide modal on success
    renderExpenseList(); // Update list view

  } catch (error) {
    // No need to revert local cache if DB update fails first
    hideLoading();
    console.error("Error updating expense notes:", error);
    alert("Failed to update notes. Please try again.");
    // Keep modal open for user to retry or copy notes
  }
}

// Hide edit notes modal
function hideEditNotesModal() {
  const modal = document.getElementById('edit-notes-modal');
  if (modal) {
      modal.style.display = 'none';
  }
  // Optionally clear fields if desired upon closing regardless of save state
  // const expenseIdField = document.getElementById('edit-expense-id');
  // const notesTextarea = document.getElementById('edit-notes-textarea');
  // if(expenseIdField) expenseIdField.value = '';
  // if(notesTextarea) notesTextarea.value = '';
}

// Delete expense
async function deleteExpense(id) {
  if (!currentUser) return;
   if (!confirm("Are you sure you want to delete this expense? This cannot be undone.")) return;

  const expenseIndex = expenses.findIndex(e => e.id === id);
  if (expenseIndex === -1) {
    console.warn("Expense not found locally for deletion:", id);
    return;
  }
   const expenseToDelete = { ...expenses[expenseIndex] }; // Copy before deleting

  try {
    showLoading();
    // Delete from Firestore first
    await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).delete();

    // Then remove from local cache
    expenses.splice(expenseIndex, 1);

    await logActivity(`Deleted expense: ${expenseToDelete.category} - ${formatCurrency(expenseToDelete.amount)}`, 'delete', { id: expenseToDelete.id, category: expenseToDelete.category });

    hideLoading();
    renderExpenseList(); // Update list view

    // If dashboard is active, update it
    if (document.getElementById('tab-dashboard')?.classList.contains('active')) {
      renderDashboard(contentDiv);
    }
  } catch (error) {
    hideLoading();
    console.error("Error deleting expense:", error);
    alert("Failed to delete expense. Please try again.");
    renderExpenseList(); // Re-render list to ensure consistency after error
  }
}

// Activity log functions
function showActivityLog() {
  const modal = document.getElementById('activity-log-modal');
  const logContent = document.getElementById('activity-log-content');
  if (!modal || !logContent) { console.error("Activity log modal elements not found."); return; }

  logContent.innerHTML = ''; // Clear previous content

  if (activityLog.length === 0) {
    logContent.innerHTML = `<p class="text-gray-400 text-center p-4">No recent activity recorded.</p>`;
  } else {
    let html = `<div class="space-y-3">`;
    // activityLog is assumed to be sorted newest first from loadData
    activityLog.forEach(log => {
      html += `
        <div class="log-entry">
          <div class="log-date">${formatDateTime(log.timestamp)}</div>
          <div class="log-action">${log.action || 'Unknown Action'}</div>
          <!-- Example: Display details (use cautiously) -->
          <!-- ${log.details && Object.keys(log.details).length > 0 ? `<pre class="text-xs text-gray-500 mt-1 overflow-auto">${JSON.stringify(log.details, null, 2)}</pre>` : ''} -->
        </div>`;
    });
    html += `</div>`;
    logContent.innerHTML = html;
  }

  modal.style.display = 'flex';
}

function hideActivityLog() {
  const modal = document.getElementById('activity-log-modal');
  if (modal) modal.style.display = 'none';
}

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM Content Loaded. Initializing app...");

  // Set up Firebase auth listener
  auth.onAuthStateChanged(user => {
    console.log("Auth state changed. User:", user ? user.uid : 'None');
    if (user) {
      if (!currentUser || currentUser.uid !== user.uid) { // Prevent re-init if user object instance changes but UID is same
          currentUser = user;
          showApp(); // Calls loadData inside
      } else {
          console.log("Auth state change for same user, skipping re-initialization.");
      }
    } else {
      if (currentUser) { // Only hide if there *was* a user before
          currentUser = null;
          hideApp();
      }
    }
  });

  // Login/Register button listeners
  const loginButton = document.getElementById('login-button');
  const registerButton = document.getElementById('register-button');
  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');

  if (loginButton && emailInput && passwordInput) {
      loginButton.addEventListener('click', () => {
          const email = emailInput.value; const password = passwordInput.value;
          if (!email || !password) { showError('Please enter email and password.'); return; }
          loginUser(email, password);
      });
  } else { console.warn("Login form elements missing."); }

  if (registerButton && emailInput && passwordInput) {
      registerButton.addEventListener('click', () => {
          const email = emailInput.value; const password = passwordInput.value;
          if (!email || !password) { showError('Please enter email and password.'); return; }
          if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }
          registerUser(email, password);
      });
  } else { console.warn("Register button or form elements missing."); }

  // Enter key for login
  if (passwordInput && loginButton) {
      passwordInput.addEventListener('keyup', function(event) {
          if (event.key === 'Enter') {
              loginButton.click();
          }
      });
  }

  // Month filter dropdown listener
  const filterSelect = document.getElementById('month-filter-select');
  if (filterSelect) {
      console.log("Adding 'change' event listener to month filter dropdown.");
      filterSelect.addEventListener('change', handleMonthFilterChange);
  } else {
      // This might happen if script runs before element is fully parsed, though DOMContentLoaded should prevent it.
      console.error("CRITICAL: Could not find #month-filter-select element to attach listener during DOMContentLoaded.");
  }


  // Close modals on Escape key
  document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
          hideActivityLog();
          hideEditNotesModal();
      }
  });

  console.log("App initialization complete.");
});

// Expose functions to global scope for inline HTML event handlers
// It's generally better practice to attach event listeners using JS (like we did for add buttons),
// but these are kept for the existing onclick="" attributes in the HTML.
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
