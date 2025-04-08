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
const VERSION = "2.5.0"; // Updated version for rollover feature
const COLLECTIONS = {
    INCOMES: "incomes",
    BILLS: "bills",
    EXPENSES: "expenses",
    ACTIVITY_LOG: "activityLog"
};

// Recurrence pattern options
const RECURRENCE_PATTERNS = {
    NONE: "none", MONTHLY: "monthly", WEEKLY: "weekly", BIWEEKLY: "biweekly", QUARTERLY: "quarterly", YEARLY: "yearly"
};

// Month names
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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

// --- Loading/Error/Auth Functions (Mostly Unchanged) ---
function showLoading() { loadingIndicator.style.display = 'flex'; }
function hideLoading() { loadingIndicator.style.display = 'none'; }
function showError(message) { loginError.textContent = message; loginError.classList.remove('hidden'); setTimeout(() => loginError.classList.add('hidden'), 5000); }
async function registerUser(email, password) { try { showLoading(); const uc = await auth.createUserWithEmailAndPassword(email, password); currentUser = uc.user; await initializeUserData(currentUser.uid); hideLoading(); showApp(); } catch (error) { hideLoading(); showError(`Registration failed: ${error.message}`); } }
async function loginUser(email, password) { try { showLoading(); const uc = await auth.signInWithEmailAndPassword(email, password); currentUser = uc.user; hideLoading(); showApp(); } catch (error) { hideLoading(); showError(`Login failed: ${error.message}`); } }
function logout() { auth.signOut().then(() => { currentUser = null; incomes = []; bills = []; expenses = []; activityLog = []; hideApp(); }).catch((error) => console.error("Logout failed:", error)); }
// --- End Loading/Error/Auth ---

// --- Data Initialization/Loading (Mostly Unchanged) ---
async function initializeUserData(userId) { /* ... same as before ... */ try {const sampleIncomes=[{id:generateId(),source:"Doctor Care",amount:1500,date:"2025-02-25"},{id:generateId(),source:"CORE",amount:300,date:"2025-03-07"}];const sampleBills=[{id:generateId(),name:"Rent",amount:1200,dueDate:"2025-03-01",paid:!1,recurring:!0,recurrencePattern:RECURRENCE_PATTERNS.MONTHLY},{id:generateId(),name:"Internet",amount:100,dueDate:"2025-03-11",paid:!1,recurring:!1,recurrencePattern:RECURRENCE_PATTERNS.NONE}];const sampleExpenses=[{id:generateId(),category:"Groceries",amount:120,date:"2025-03-05",notes:"Weekly grocery shopping"},{id:generateId(),category:"Shopping",amount:45,date:"2025-03-01",notes:"New clothes"},{id:generateId(),category:"Savings",amount:200,date:"2025-03-02",notes:"Monthly savings deposit"}];const incomesSnapshot=await db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).limit(1).get();if(incomesSnapshot.empty){const batch=db.batch();sampleIncomes.forEach(item=>batch.set(db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).doc(item.id),item));sampleBills.forEach(item=>batch.set(db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).doc(item.id),item));sampleExpenses.forEach(item=>batch.set(db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).doc(item.id),item));const logEntry={id:generateId(),timestamp:(new Date).toISOString(),action:"Account created with sample data",type:"auth"};batch.set(db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(logEntry.id),logEntry);await batch.commit();console.log("User data initialized with samples.")}else console.log("User data already exists. Skipping initialization.")}catch(error){console.error("Error initializing user data:",error)} }
async function loadData() { try { showLoading(); if (!currentUser) { hideLoading(); return; } const userId = currentUser.uid; const [incomesSnap, billsSnap, expensesSnap, activityLogSnap] = await Promise.all([ db.collection(`users/${userId}/${COLLECTIONS.INCOMES}`).get(), db.collection(`users/${userId}/${COLLECTIONS.BILLS}`).get(), db.collection(`users/${userId}/${COLLECTIONS.EXPENSES}`).get(), db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).orderBy('timestamp', 'desc').limit(50).get() ]); incomes = incomesSnap.docs.map(doc => doc.data()); bills = billsSnap.docs.map(doc => ({ ...doc.data(), paid: doc.data().paid ?? false, recurring: doc.data().recurring ?? false, recurrencePattern: doc.data().recurrencePattern || RECURRENCE_PATTERNS.NONE })); expenses = expensesSnap.docs.map(doc => ({ ...doc.data(), notes: doc.data().notes || "" })); activityLog = activityLogSnap.docs.map(doc => doc.data()); hideLoading(); userEmailDisplay.textContent = currentUser.email; changeTab('dashboard'); } catch (error) { console.error("Error loading data:", error); hideLoading(); showError("Failed to load data."); } }
// --- End Data Initialization/Loading ---

// --- Activity Log / ID / Save Indicator (Unchanged) ---
async function logActivity(action, type, details = {}) { if (!currentUser) return; try { const userId = currentUser.uid; const newLog = { id: generateId(), timestamp: new Date().toISOString(), action, type, details }; await db.collection(`users/${userId}/${COLLECTIONS.ACTIVITY_LOG}`).doc(newLog.id).set(newLog); activityLog.unshift(newLog); if (activityLog.length > 50) activityLog.pop(); showSaveIndicator(); } catch (error) { console.error("Error logging activity:", error); } }
function generateId() { return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`; }
function showSaveIndicator() { const indicator = document.getElementById('save-indicator'); indicator.classList.add('visible'); setTimeout(() => indicator.classList.remove('visible'), 2000); }
// --- End Activity Log / ID / Save Indicator ---

// --- Recurring Bill Generation (Unchanged) ---
function generateNextRecurringBill(bill) { if (!bill.dueDate || !bill.recurring || bill.recurrencePattern === RECURRENCE_PATTERNS.NONE) return null; const [year, month, day] = bill.dueDate.split('-').map(Number); if (isNaN(year) || isNaN(month) || isNaN(day)) return null; const newBill = { ...bill, id: generateId(), paid: false }; const dueDate = new Date(Date.UTC(year, month - 1, day)); switch (bill.recurrencePattern) { case RECURRENCE_PATTERNS.MONTHLY: dueDate.setUTCMonth(dueDate.getUTCMonth() + 1); break; case RECURRENCE_PATTERNS.WEEKLY: dueDate.setUTCDate(dueDate.getUTCDate() + 7); break; case RECURRENCE_PATTERNS.BIWEEKLY: dueDate.setUTCDate(dueDate.getUTCDate() + 14); break; case RECURRENCE_PATTERNS.QUARTERLY: dueDate.setUTCMonth(dueDate.getUTCMonth() + 3); break; case RECURRENCE_PATTERNS.YEARLY: dueDate.setUTCFullYear(dueDate.getUTCFullYear() + 1); break; default: return null; } newBill.dueDate = `${dueDate.getUTCFullYear()}-${String(dueDate.getUTCMonth() + 1).padStart(2, '0')}-${String(dueDate.getUTCDate()).padStart(2, '0')}`; return newBill; }
// --- End Recurring Bill Generation ---

// --- UI Show/Hide (Unchanged) ---
function showApp() { loginScreen.style.display = 'none'; budgetApp.style.display = 'block'; loadData(); }
function hideApp() { budgetApp.style.display = 'none'; loginScreen.style.display = 'block'; document.getElementById('email-input').value = ''; document.getElementById('password-input').value = ''; loginError.classList.add('hidden'); }
// --- End UI Show/Hide ---

// --- Formatting Helpers (Unchanged) ---
function formatCurrency(amount) { const numericAmount = Number(amount); return isNaN(numericAmount) ? "$0.00" : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numericAmount); }
function formatDate(dateString) { if (!dateString || typeof dateString !== 'string') return "Invalid Date"; try { const [year, month, day] = dateString.split('-').map(Number); if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) return "Invalid Date"; const date = new Date(Date.UTC(year, month - 1, day)); return date.toLocaleDateString('en-US', { timeZone: 'UTC' }); } catch (e) { console.error("Error formatting date:", dateString, e); return "Invalid Date"; } }
function formatDateTime(dateString) { if (!dateString) return ""; try { const date = new Date(dateString); return date.toLocaleString('en-US'); } catch (e) { return "Invalid Timestamp"; } }
// --- End Formatting Helpers ---

// --- Calendar Helpers (Unchanged) ---
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function getPreviousMonth(year, month) { return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }; }
function getNextMonth(year, month) { return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }; }
// --- End Calendar Helpers ---

// --- Date Check Helper (Unchanged) ---
function isDateInMonth(dateString, year, month) { if (!dateString) return false; const [itemYear, itemMonth] = dateString.split('-').map(Number); return itemYear === year && (itemMonth - 1) === month; }
// --- End Date Check Helper ---


// --- *** NEW ***: Calculate Rollover from Previous Month ---
function calculatePreviousMonthRollover(currentYear, currentMonth) {
    const { year: prevYear, month: prevMonth } = getPreviousMonth(currentYear, currentMonth);

    // Calculate income for the previous month
    const prevIncome = incomes
        .filter(item => isDateInMonth(item.date, prevYear, prevMonth))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // Calculate expenses for the previous month
    const prevExpenses = expenses
        .filter(item => isDateInMonth(item.date, prevYear, prevMonth))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // Calculate *PAID* bills for the previous month
    const prevPaidBills = bills
        .filter(bill => isDateInMonth(bill.dueDate, prevYear, prevMonth) && bill.paid === true)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const prevBalance = prevIncome - prevExpenses - prevPaidBills;

    // Only return positive balances as rollover
    return prevBalance > 0 ? prevBalance : 0;
}
// --- *** END NEW FUNCTION *** ---


// --- *** MODIFIED ***: Calculate totals for a specific month, accepting rollover ---
function calculateTotals(year, month, rolloverAmount = 0) { // Added rolloverAmount parameter
    // Filter data for the *current* month and year
    const monthlyIncomes = incomes.filter(item => isDateInMonth(item.date, year, month));
    const monthlyBills = bills.filter(item => isDateInMonth(item.dueDate, year, month));
    const monthlyExpenses = expenses.filter(item => isDateInMonth(item.date, year, month));

    // *** Add rollover to this month's income ***
    const totalIncome = monthlyIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0) + rolloverAmount;

    // Unpaid bills due in this month
    const totalUnpaidBills = monthlyBills
        .filter(bill => !bill.paid)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // Expenses incurred this month
    const totalExpenses = monthlyExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    // Balance reflects income (incl. rollover) minus this month's unpaid bills and expenses
    const balance = totalIncome - totalUnpaidBills - totalExpenses;

    // Savings specifically for this month
    const totalSavings = monthlyExpenses
        .filter(expense => expense.category === "Savings")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return { totalIncome, totalBills: totalUnpaidBills, totalExpenses, balance, totalSavings };
}
// --- *** END MODIFIED FUNCTION *** ---


// --- Group expenses by category for a specific month (Unchanged from previous step) ---
function getExpensesByCategory(year, month) {
    const monthlyExpenses = expenses.filter(item => isDateInMonth(item.date, year, month));
    const result = {};
    monthlyExpenses.forEach(expense => {
        const category = expense.category || "Uncategorized";
        result[category] = (result[category] || 0) + Number(expense.amount || 0);
    });
    return result;
}
// --- End Group Expenses ---

// --- Change Tab Function (Unchanged from previous step) ---
function changeTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    const activeTabElement = document.getElementById(`tab-${tabName}`);
    if (activeTabElement) activeTabElement.classList.add('active');
    else { console.warn(`Tab element not found: tab-${tabName}`); document.getElementById('tab-dashboard')?.classList.add('active'); tabName = 'dashboard'; }
    const contentDiv = document.getElementById('content'); contentDiv.innerHTML = '';
    if (tabName === 'dashboard') { const currentDate = new Date(); renderDashboard(contentDiv, currentDate.getFullYear(), currentDate.getMonth()); }
    else if (tabName === 'income') { renderIncomeTracker(contentDiv); }
    else if (tabName === 'bills') { renderBillTracker(contentDiv); }
    else if (tabName === 'expenses') { renderExpenseTracker(contentDiv); }
}
// --- End Change Tab ---

// --- *** MODIFIED ***: Render dashboard for a specific month, showing rollover ---
function renderDashboard(container, year, month) { // year, month are for the month being displayed
    // *** Calculate rollover from the PREVIOUS month ***
    const rolloverAmount = calculatePreviousMonthRollover(year, month);

    // *** Calculate totals for the CURRENT month, passing the rollover ***
    const { totalIncome, totalBills, totalExpenses, balance, totalSavings } = calculateTotals(year, month, rolloverAmount);
    const expensesByCategory = getExpensesByCategory(year, month);

    if (container) { container.dataset.calendarYear = year; container.dataset.calendarMonth = month; }
    else { console.error("Dashboard container not found."); return; }

    // *** Prepare rollover display string ***
    const rolloverDisplay = rolloverAmount > 0
        ? `<p class="text-xs text-green-400 mt-1 font-medium">(Includes ${formatCurrency(rolloverAmount)} rollover)</p>`
        : ''; // Empty string if no rollover

    let html = `
    <div class="card">
      <h2 class="card-title">Financial Summary for ${MONTH_NAMES[month]} ${year}</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <h3 class="stat-label income-label">Income</h3>
          <p class="stat-value income-value">${formatCurrency(totalIncome)}</p>
          ${rolloverDisplay} {/* *** Insert rollover display here *** */}
        </div>
        <div class="stat-card">
          <h3 class="stat-label bills-label">Unpaid Bills Due</h3>
          <p class="stat-value bills-value">${formatCurrency(totalBills)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label expenses-label">Expenses</h3>
          <p class="stat-value expenses-value">${formatCurrency(totalExpenses)}</p>
        </div>
        <div class="stat-card">
          <h3 class="stat-label balance-label">Est. Net</h3>
          <p class="stat-value ${balance >= 0 ? 'balance-value-positive' : 'balance-value-negative'}">
            ${formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Savings for ${MONTH_NAMES[month]} ${year}</h2>
      <div class="stat-card w-full">
        <h3 class="stat-label savings-label">Total Savings</h3>
        <p class="stat-value savings-value">${formatCurrency(totalSavings)}</p>
      </div>
    </div>

    <div class="card">
      <div class="flex justify-between items-center mb-4">
        <h2 class="card-title m-0">Calendar View</h2>
        <div class="flex items-center">
          <button id="prev-month" class="calendar-nav-btn" type="button">❮</button>
          <h3 id="calendar-title" class="text-gray-300 mx-4 font-semibold">${MONTH_NAMES[month]} ${year}</h3>
          <button id="next-month" class="calendar-nav-btn" type="button">❯</button>
        </div>
      </div>
      <div id="bills-calendar" class="calendar-container">
        <div class="calendar-header">${DAY_NAMES.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}</div>
        <div class="calendar-body">${generateCalendarDays(year, month)}</div>
      </div>
    </div>

    <div class="card">
      <h2 class="card-title">Expense Breakdown for ${MONTH_NAMES[month]} ${year}</h2>
      <div class="space-y-3">
  `; // Expense Breakdown HTML Generation (Unchanged)
    const totalMonthlyExpenseAmount = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
    if (Object.keys(expensesByCategory).length > 0 && totalMonthlyExpenseAmount > 0) { Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a).forEach(([category, amount]) => { const percentage = (amount / totalMonthlyExpenseAmount) * 100; const progressBarColor = category === 'Savings' ? '#3b82f6' : '#059669'; html += `<div><div class="flex justify-between mb-1"><span class="font-medium text-gray-300">${category}</span><span class="text-gray-300">${formatCurrency(amount)} (${percentage.toFixed(1)}%)</span></div><div class="progress-container"><div class="progress-bar" style="width: ${percentage}%; background-color: ${progressBarColor};"></div></div></div>`; }); } else { html += `<p class="text-gray-400">No expense data for ${MONTH_NAMES[month]} ${year}.</p>`; } html += `</div></div>`;
  // Bills Due This Month HTML Generation (Unchanged)
    html += `<div class="card"><h2 class="card-title">Bills Due in ${MONTH_NAMES[month]} ${year}</h2><div class="space-y-3">`; const billsDueThisMonth = bills.filter(bill => isDateInMonth(bill.dueDate, year, month)).sort((a, b) => { try { const dayA = parseInt((a.dueDate || '').split('-')[2], 10); const dayB = parseInt((b.dueDate || '').split('-')[2], 10); if (isNaN(dayA) || isNaN(dayB)) return 0; return dayA - dayB; } catch { return 0; } }); if (billsDueThisMonth.length > 0) { billsDueThisMonth.forEach(bill => { const recurringIcon = bill.recurring ? `<span class="ml-2 text-blue-300 recurring-icon" title="Recurring: ${bill.recurrencePattern}">↻</span>` : ''; const isPaid = bill.paid; html += `<div class="flex justify-between items-center border-b border-gray-700 pb-2"><div><div class="font-medium text-gray-300">${bill.name || 'Unnamed Bill'}${recurringIcon}</div><div class="text-sm text-gray-400">Due: ${formatDate(bill.dueDate)}</div></div><div class="flex items-center"><div class="${isPaid ? 'text-green-300' : 'text-yellow-300'} font-medium mr-4">${formatCurrency(bill.amount)}</div> ${!isPaid ? `<button class="toggle-paid-btn mark-paid-btn" onclick="toggleBillPaid('${bill.id}', true)" type="button">Mark Paid</button>` : `<span class="text-sm paid-indicator-yes">(Paid)</span><button class="ml-2 toggle-paid-btn mark-unpaid-btn text-xs" onclick="toggleBillPaid('${bill.id}', false)" type="button">Unpay</button>`}</div></div>`; }); } else { html += `<p class="text-gray-400">No bills due in ${MONTH_NAMES[month]} ${year}.</p>`; } html += `</div></div>`;

    container.innerHTML = html;

    // Re-attach event listeners
    document.getElementById('prev-month')?.addEventListener('click', () => navigateCalendar(container, 'prev'));
    document.getElementById('next-month')?.addEventListener('click', () => navigateCalendar(container, 'next'));
}
// --- *** END MODIFIED FUNCTION *** ---


// --- Calendar Day Generation (Unchanged from previous step) ---
function generateCalendarDays(year, month) { let html = ''; const daysInMonth = getDaysInMonth(year, month); const firstDayOfMonth = getFirstDayOfMonth(year, month); const today = new Date(); const todayYear = today.getFullYear(); const todayMonth = today.getMonth(); const todayDay = today.getDate(); for (let i = 0; i < firstDayOfMonth; i++) html += `<div class="calendar-day calendar-day-empty"></div>`; for (let day = 1; day <= daysInMonth; day++) { const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const dayBills = bills.filter(bill => bill.dueDate === dateStr); const hasUnpaidBills = dayBills.some(bill => !bill.paid); const totalDayAmount = dayBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0); let dayClass = "calendar-day"; if (hasUnpaidBills) dayClass += " calendar-day-has-bills"; if (year === todayYear && month === todayMonth && day === todayDay) dayClass += " calendar-day-today"; html += `<div class="${dayClass}" data-date="${dateStr}"><div class="calendar-day-number">${day}</div>`; if (dayBills.length > 0) { html += `<div class="calendar-day-amount">${formatCurrency(totalDayAmount)}</div><div class="calendar-day-bills">`; dayBills.slice(0, 2).forEach(bill => { html += `<div class="calendar-day-bill ${bill.paid ? 'bill-paid' : 'bill-unpaid'}" title="${bill.name}: ${formatCurrency(bill.amount)} (${bill.paid ? 'Paid' : 'Unpaid'})">${bill.name && bill.name.length > 8 ? bill.name.substring(0, 6) + '...' : (bill.name || 'Bill')}</div>`; }); if (dayBills.length > 2) html += `<div class="calendar-day-more">+${dayBills.length - 2} more</div>`; html += `</div>`; } html += `</div>`; } const totalCells = firstDayOfMonth + daysInMonth; const remainingCells = (7 - (totalCells % 7)) % 7; for (let i = 0; i < remainingCells; i++) html += `<div class="calendar-day calendar-day-empty"></div>`; return html; }
// --- End Calendar Day Generation ---


// --- Calendar Navigation (Unchanged from previous step) ---
function navigateCalendar(container, direction) { if (!container || !container.dataset || container.dataset.calendarYear === undefined || container.dataset.calendarMonth === undefined) { console.error("Cannot navigate: container/dataset missing."); return; } let year = parseInt(container.dataset.calendarYear, 10); let month = parseInt(container.dataset.calendarMonth, 10); if (isNaN(year) || isNaN(month)) { console.error("Invalid year/month in dataset:", container.dataset.calendarYear, container.dataset.calendarMonth); const now = new Date(); year = now.getFullYear(); month = now.getMonth(); } if (direction === 'prev') { ({ year, month } = getPreviousMonth(year, month)); } else if (direction === 'next') { ({ year, month } = getNextMonth(year, month)); } renderDashboard(container, year, month); } // Re-renders the whole dashboard
// --- End Calendar Navigation ---


// --- Income Tracker Rendering/Adding (Unchanged from previous step) ---
function renderIncomeTracker(container) { /* ... same as before ... */ let html=`<div class="card"><h2 class="card-title">Add New Income</h2><form id="add-income-form"><div class="form-grid"><div><label for="income-source" class="form-label">Source</label><select id="income-source" class="form-select" required><option value="Doctor Care">Doctor Care</option><option value="CORE">CORE</option><option value="Other">Other</option></select></div><div id="custom-source-container" style="display:none"><label for="income-custom-source" class="form-label">Specify Source</label><input type="text" id="income-custom-source" class="form-input" placeholder="Income source"></div><div><label for="income-amount" class="form-label">Amount</label><input type="number" id="income-amount" class="form-input" placeholder="0.00" step="0.01" min="0" required></div><div><label for="income-date" class="form-label">Date</label><input type="date" id="income-date" class="form-input" required></div></div><div class="mt-4"><button type="submit" id="add-income-btn" class="btn btn-green">Add Income</button></div></form></div><div class="card"><h2 class="card-title">Income History (All Time)</h2><div id="income-list" class="mt-4"></div></div>`;container.innerHTML=html;const sourceSelect=document.getElementById("income-source"),customSourceContainer=document.getElementById("custom-source-container"),customSourceInput=document.getElementById("income-custom-source");sourceSelect.addEventListener("change",(function(){const e="Other"===this.value;customSourceContainer.style.display=e?"block":"none",customSourceInput.required=e}));renderIncomeList();document.getElementById("add-income-form").addEventListener("submit",(async function(e){e.preventDefault();const t=sourceSelect.value,n=customSourceInput.value.trim(),o=document.getElementById("income-amount").value,a=document.getElementById("income-date").value;if("Other"===t&&!n)return void alert("Please specify the source.");const s="Other"===t?n:t,i={id:generateId(),source:s,amount:Number(o),date:a};if(!currentUser)return void alert("Not logged in.");try{showLoading(),await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(i.id).set(i),incomes.push(i),await logActivity(`Added income: ${s} - ${formatCurrency(i.amount)}`,"income",i),this.reset(),customSourceContainer.style.display="none",hideLoading(),renderIncomeList();const r=document.getElementById("tab-dashboard");if(r.classList.contains("active")&&isDateInMonth(i.date,parseInt(document.getElementById("content").dataset.calendarYear),parseInt(document.getElementById("content").dataset.calendarMonth)))renderDashboard(document.getElementById("content"),parseInt(document.getElementById("content").dataset.calendarYear),parseInt(document.getElementById("content").dataset.calendarMonth))}catch(e){hideLoading(),console.error("Error adding income:",e),alert("Failed to add income.")}}))}
function renderIncomeList() { /* ... same as before ... */ const container=document.getElementById("income-list");if(container){if(incomes.length>0){let e=`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left border-b border-gray-700"><th class="p-2 text-gray-300">Source</th><th class="p-2 text-gray-300">Date</th><th class="p-2 text-right text-gray-300">Amount</th><th class="p-2 text-center text-gray-300">Actions</th></tr></thead><tbody>`;const t=[...incomes].sort(((e,t)=>new Date(t.date)-new Date(e.date)));t.forEach((t=>{e+=`<tr class="border-b border-gray-700 hover:bg-gray-700"><td class="p-2 text-gray-300">${t.source||"N/A"}</td><td class="p-2 text-gray-300">${formatDate(t.date)}</td><td class="p-2 text-right text-green-300 font-medium">${formatCurrency(t.amount)}</td><td class="p-2 text-center"><button class="text-red-400 hover:text-red-300 text-xs px-2 py-1" onclick="deleteIncome('${t.id}')" type="button">Delete</button></td></tr>`})),e+="</tbody></table></div>",container.innerHTML=e}else container.innerHTML='<p class="text-gray-400 text-center">No income entries yet.</p>'} }
// --- End Income Tracker ---

// --- Delete Income (Conditional Dashboard Update Logic Unchanged from previous step) ---
async function deleteIncome(id) { if (!currentUser || !confirm("Delete this income entry?")) return; try { showLoading(); const incomeToDelete = incomes.find(i => i.id === id); await db.collection(`users/${currentUser.uid}/${COLLECTIONS.INCOMES}`).doc(id).delete(); incomes = incomes.filter(i => i.id !== id); const logAction = incomeToDelete ? `Deleted income: ${incomeToDelete.source} - ${formatCurrency(incomeToDelete.amount)}` : `Deleted income (ID: ${id})`; await logActivity(logAction, 'delete', incomeToDelete || { id }); hideLoading(); renderIncomeList(); const dashboardTab = document.getElementById('tab-dashboard'); const contentEl = document.getElementById('content'); if(dashboardTab?.classList.contains('active') && contentEl?.dataset.calendarYear && incomeToDelete && isDateInMonth(incomeToDelete.date, parseInt(contentEl.dataset.calendarYear), parseInt(contentEl.dataset.calendarMonth))) { renderDashboard(contentEl, parseInt(contentEl.dataset.calendarYear), parseInt(contentEl.dataset.calendarMonth)); } } catch (error) { hideLoading(); console.error("Error deleting income:", error); alert("Failed to delete income."); } }
// --- End Delete Income ---


// --- Bill Tracker Rendering/Adding (Conditional Dashboard Update Logic Unchanged) ---
function renderBillTracker(container) { /* ... same as before ... */ let html=`<div class="card"><h2 class="card-title">Add New Bill</h2><form id="add-bill-form"><div class="form-grid"><div><label for="bill-name" class="form-label">Bill Name</label><input type="text" id="bill-name" class="form-input" placeholder="e.g., Rent" required></div><div><label for="bill-amount" class="form-label">Amount</label><input type="number" id="bill-amount" class="form-input" placeholder="0.00" step="0.01" min="0" required></div><div><label for="bill-due-date" class="form-label">Due Date</label><input type="date" id="bill-due-date" class="form-input" required></div></div><div class="mt-4 flex items-center mb-4"><input type="checkbox" id="bill-recurring" class="mr-2 h-4 w-4 accent-blue-500"><label for="bill-recurring" class="form-label mb-0 cursor-pointer">Recurring Bill</label></div><div id="recurrence-options" class="mb-4" style="display: none;"><label for="recurrence-pattern" class="form-label">Recurrence Pattern</label><select id="recurrence-pattern" class="form-select"><option value="${RECURRENCE_PATTERNS.MONTHLY}">Monthly</option><option value="${RECURRENCE_PATTERNS.WEEKLY}">Weekly</option><option value="${RECURRENCE_PATTERNS.BIWEEKLY}">Bi-weekly</option><option value="${RECURRENCE_PATTERNS.QUARTERLY}">Quarterly</option><option value="${RECURRENCE_PATTERNS.YEARLY}">Yearly</option></select></div><div class="mt-4"><button type="submit" id="add-bill-btn" class="btn btn-yellow">Add Bill</button></div></form></div><div class="card"><h2 class="card-title">Bill List (All Time)</h2><div class="mb-4"><div class="flex border border-gray-600 rounded overflow-hidden"><button id="show-all-bills" type="button" class="bg-gray-700 text-white px-3 py-1 hover:bg-gray-600 active-filter">All</button><button id="show-unpaid-bills" type="button" class="bg-gray-700 text-white px-3 py-1 border-l border-r border-gray-600 hover:bg-gray-600">Unpaid</button><button id="show-paid-bills" type="button" class="bg-gray-700 text-white px-3 py-1 hover:bg-gray-600">Paid</button></div></div><div id="bill-list" class="mt-4"></div></div>`;container.innerHTML=html;const recurringCheckbox=document.getElementById("bill-recurring"),recurrenceOptions=document.getElementById("recurrence-options"),recurrenceSelect=document.getElementById("recurrence-pattern");recurringCheckbox.addEventListener("change",(function(){recurrenceOptions.style.display=this.checked?"block":"none",recurrenceSelect.required=this.checked}));const filterButtons=container.querySelectorAll("#show-all-bills, #show-unpaid-bills, #show-paid-bills");filterButtons.forEach((e=>{e.addEventListener("click",(function(){filterButtons.forEach((e=>{e.classList.remove("active-filter")})),this.classList.add("active-filter");let e=this.id.replace("show-","").replace("-bills","");renderBillList(e)}))})),renderBillList("all"),document.getElementById("add-bill-form").addEventListener("submit",(async function(e){e.preventDefault();const t=document.getElementById("bill-name").value.trim(),n=document.getElementById("bill-amount").value,o=document.getElementById("bill-due-date").value,a=recurringCheckbox.checked,s=a?recurrenceSelect.value:RECURRENCE_PATTERNS.NONE,i={id:generateId(),name:t,amount:Number(n),dueDate:o,paid:!1,recurring:a,recurrencePattern:s};if(!currentUser)return void alert("Not logged in.");try{showLoading(),await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(i.id).set(i),bills.push(i),await logActivity(`Added ${a?"recurring":""} bill: ${t} - ${formatCurrency(i.amount)}`,"bill",i),this.reset(),recurrenceOptions.style.display="none",hideLoading();const l=document.querySelector(".active-filter")?.id.replace("show-","").replace("-bills","")||"all";renderBillList(l);const r=document.getElementById("tab-dashboard"),c=document.getElementById("content");if(r?.classList.contains("active")&&c?.dataset.calendarYear&&isDateInMonth(i.dueDate,parseInt(c.dataset.calendarYear),parseInt(c.dataset.calendarMonth)))renderDashboard(c,parseInt(c.dataset.calendarYear),parseInt(c.dataset.calendarMonth))}catch(e){hideLoading(),console.error("Error adding bill:",e),alert("Failed to add bill.")}}))}
function renderBillList(filter = 'all') { /* ... same as before ... */ const container=document.getElementById("bill-list");if(container){let e=[...bills];"paid"===filter?e=e.filter((e=>e.paid)):"unpaid"===filter&&(e=e.filter((e=>!e.paid)));if(e.length>0){let t=`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left border-b border-gray-700"><th class="p-2 text-gray-300">Bill Name</th><th class="p-2 text-gray-300">Due Date</th><th class="p-2 text-gray-300">Status</th><th class="p-2 text-right text-gray-300">Amount</th><th class="p-2 text-center text-gray-300">Actions</th></tr></thead><tbody>`;const n=e.sort(((e,t)=>new Date(e.dueDate)-new Date(t.dueDate)));n.forEach((e=>{const n=e.recurring?`<span class="ml-1 text-blue-300 recurring-icon text-xs" title="Recurring: ${e.recurrencePattern}">↻</span>`:"";const o=e.paid?"text-green-300 paid-indicator-yes":"text-yellow-300 paid-indicator-no";t+=`<tr class="border-b border-gray-700 hover:bg-gray-700"><td class="p-2 text-gray-300 flex items-center">${e.name||"Unnamed Bill"}${n}</td><td class="p-2 text-gray-300">${formatDate(e.dueDate)}</td><td class="p-2"><span class="${o}">${e.paid?"Paid":"Unpaid"}</span></td><td class="p-2 text-right text-yellow-300 font-medium">${formatCurrency(e.amount)}</td><td class="p-2 text-center"><div class="flex justify-center items-center space-x-2">${e.paid?`<button class="toggle-paid-btn mark-unpaid-btn text-xs" onclick="toggleBillPaid('${e.id}', false)" type="button">Unpay</button>`:`<button class="toggle-paid-btn mark-paid-btn text-xs" onclick="toggleBillPaid('${e.id}', true)" type="button">Pay</button>`}<button class="text-red-400 hover:text-red-300 text-xs px-1" onclick="deleteBill('${e.id}')" type="button">Del</button></div></td></tr>`})),t+="</tbody></table></div>",container.innerHTML=t}else container.innerHTML=`<p class="text-gray-400 text-center">No ${"all"===filter?"":filter} bills found.</p>`}}
// --- End Bill Tracker ---

// --- Toggle Bill Paid (Conditional Dashboard Update Logic Unchanged) ---
async function toggleBillPaid(id, paidStatus) { if (!currentUser) { alert("Not logged in."); return; } try { showLoading(); const billIndex = bills.findIndex(b => b.id === id); const bill = bills[billIndex] || { id: id, name: `Bill ID ${id}` }; await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).update({ paid: paidStatus }); if (billIndex !== -1) bills[billIndex].paid = paidStatus; await logActivity(`Marked bill '${bill.name}' as ${paidStatus ? 'paid' : 'unpaid'}`, 'bill', { id: bill.id, name: bill.name, paid: paidStatus, amount: bill.amount }); let nextBill = null; if (paidStatus && bill.recurring && bill.recurrencePattern !== RECURRENCE_PATTERNS.NONE) { nextBill = generateNextRecurringBill(bill); if (nextBill) { await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(nextBill.id).set(nextBill); bills.push(nextBill); await logActivity(`Generated next recurring bill: ${nextBill.name} due ${formatDate(nextBill.dueDate)}`, 'bill', nextBill); } } hideLoading(); if (document.getElementById('tab-bills').classList.contains('active')) { const currentFilter = document.querySelector('#bill-list')?.closest('.card')?.querySelector('.active-filter')?.id.replace('show-', '').replace('-bills', '') || 'all'; renderBillList(currentFilter); } const dashboardTab = document.getElementById('tab-dashboard'); const contentEl = document.getElementById('content'); if(dashboardTab?.classList.contains('active') && contentEl?.dataset.calendarYear) { const displayedYear = parseInt(contentEl.dataset.calendarYear); const displayedMonth = parseInt(contentEl.dataset.calendarMonth); const billInDisplayedMonth = isDateInMonth(bill.dueDate, displayedYear, displayedMonth); const nextBillInDisplayedMonth = nextBill && isDateInMonth(nextBill.dueDate, displayedYear, displayedMonth); if (billInDisplayedMonth || nextBillInDisplayedMonth) { renderDashboard(contentEl, displayedYear, displayedMonth); } } } catch (error) { hideLoading(); console.error("Error updating bill status:", error); alert(`Failed to update bill status.`); } }
// --- End Toggle Bill Paid ---

// --- Delete Bill (Conditional Dashboard Update Logic Unchanged) ---
async function deleteBill(id) { if (!currentUser || !confirm("Delete this bill?")) return; try { showLoading(); const billToDelete = bills.find(b => b.id === id); await db.collection(`users/${currentUser.uid}/${COLLECTIONS.BILLS}`).doc(id).delete(); bills = bills.filter(b => b.id !== id); const logAction = billToDelete ? `Deleted bill: ${billToDelete.name} - ${formatCurrency(billToDelete.amount)}` : `Deleted bill (ID: ${id})`; await logActivity(logAction, 'delete', billToDelete || { id }); hideLoading(); if (document.getElementById('tab-bills').classList.contains('active')) { const currentFilter = document.querySelector('#bill-list')?.closest('.card')?.querySelector('.active-filter')?.id.replace('show-', '').replace('-bills', '') || 'all'; renderBillList(currentFilter); } const dashboardTab = document.getElementById('tab-dashboard'); const contentEl = document.getElementById('content'); if(dashboardTab?.classList.contains('active') && contentEl?.dataset.calendarYear && billToDelete && isDateInMonth(billToDelete.dueDate, parseInt(contentEl.dataset.calendarYear), parseInt(contentEl.dataset.calendarMonth))) { renderDashboard(contentEl, parseInt(contentEl.dataset.calendarYear), parseInt(contentEl.dataset.calendarMonth)); } } catch (error) { hideLoading(); console.error("Error deleting bill:", error); alert("Failed to delete bill."); } }
// --- End Delete Bill ---

// --- Expense Tracker Rendering/Adding (Conditional Dashboard Update Logic Unchanged) ---
function renderExpenseTracker(container) { /* ... same as before ... */ let html=`<div class="card"><h2 class="card-title">Add New Expense</h2><form id="add-expense-form"><div class="form-grid"><div><label for="expense-category" class="form-label">Category</label><select id="expense-category" class="form-select" required><option value="">-- Select --</option><option value="Eating out">Eating out</option><option value="Groceries">Groceries</option><option value="Gas">Gas</option><option value="Kyliee">Kyliee</option><option value="Personal care">Personal care</option><option value="Shopping">Shopping</option><option value="Pets">Pets</option><option value="Gifts">Gifts</option><option value="Savings">Savings</option><option value="Entertainment">Entertainment</option><option value="Utilities">Utilities</option><option value="Transportation">Transportation</option><option value="Healthcare">Healthcare</option><option value="Other">Other</option></select></div><div><label for="expense-amount" class="form-label">Amount</label><input type="number" id="expense-amount" class="form-input" placeholder="0.00" step="0.01" min="0" required></div><div><label for="expense-date" class="form-label">Date</label><input type="date" id="expense-date" class="form-input" required></div></div><div class="mt-4"><label for="expense-notes" class="form-label">Notes (Optional)</label><textarea id="expense-notes" class="form-input h-20" placeholder="Details..."></textarea></div><div class="mt-4"><button type="submit" id="add-expense-btn" class="btn btn-red">Add Expense</button></div></form></div><div class="card"><h2 class="card-title">Expense History (All Time)</h2><div id="expense-list" class="mt-4"></div></div>`;container.innerHTML=html;renderExpenseList();document.getElementById("add-expense-form").addEventListener("submit",(async function(e){e.preventDefault();const t=document.getElementById("expense-category").value,n=document.getElementById("expense-amount").value,o=document.getElementById("expense-date").value,a=document.getElementById("expense-notes").value.trim(),s={id:generateId(),category:t,amount:Number(n),date:o,notes:a};if(!currentUser)return void alert("Not logged in.");try{showLoading(),await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(s.id).set(s),expenses.push(s),await logActivity(`Added expense: ${t} - ${formatCurrency(s.amount)}`,"expense",s),this.reset(),hideLoading(),renderExpenseList();const i=document.getElementById("tab-dashboard"),l=document.getElementById("content");if(i?.classList.contains("active")&&l?.dataset.calendarYear&&isDateInMonth(s.date,parseInt(l.dataset.calendarYear),parseInt(l.dataset.calendarMonth)))renderDashboard(l,parseInt(l.dataset.calendarYear),parseInt(l.dataset.calendarMonth))}catch(e){hideLoading(),console.error("Error adding expense:",e),alert("Failed to add expense.")}}))}
function renderExpenseList() { /* ... same as before ... */ const container=document.getElementById("expense-list");if(container){if(expenses.length>0){let e=`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left border-b border-gray-700"><th class="p-2 text-gray-300">Category</th><th class="p-2 text-gray-300">Date</th><th class="p-2 text-gray-300">Notes</th><th class="p-2 text-right text-gray-300">Amount</th><th class="p-2 text-center text-gray-300">Actions</th></tr></thead><tbody>`;const t=[...expenses].sort(((e,t)=>new Date(t.date)-new Date(e.date)));t.forEach((t=>{const n=t.notes?t.notes:"-";const o="Savings"===t.category?"text-blue-300 savings-amount":"text-red-300";e+=`<tr class="border-b border-gray-700 hover:bg-gray-700"><td class="p-2 text-gray-300">${t.category||"N/A"}</td><td class="p-2 text-gray-300">${formatDate(t.date)}</td><td class="p-2 text-gray-400"><div class="note-text" title="${t.notes||""}">${n}</div></td><td class="p-2 text-right ${o} font-medium">${formatCurrency(t.amount)}</td><td class="p-2 text-center"><div class="flex justify-center space-x-2"><button class="text-blue-400 hover:text-blue-300 text-xs px-1" onclick="editExpenseNotes('${t.id}')" type="button">Edit</button><button class="text-red-400 hover:text-red-300 text-xs px-1" onclick="deleteExpense('${t.id}')" type="button">Del</button></div></td></tr>`})),e+="</tbody></table></div>",container.innerHTML=e}else container.innerHTML='<p class="text-gray-400 text-center">No expense entries yet.</p>'}}
// --- End Expense Tracker ---

// --- Edit/Save Expense Notes (Conditional Dashboard Update Logic Unchanged) ---
function editExpenseNotes(id) { /* ... same as before ... */ const expense=expenses.find((e=>e.id===id));if(expense){const t=document.getElementById("edit-notes-modal"),e=document.getElementById("edit-notes-textarea"),n=document.getElementById("edit-expense-id");e.value=expense.notes||"",n.value=id,document.getElementById("edit-notes-category").textContent=expense.category||"N/A",document.getElementById("edit-notes-amount").textContent=formatCurrency(expense.amount),document.getElementById("edit-notes-date").textContent=formatDate(expense.date),t.style.display="flex",e.focus()}else alert("Expense not found.")}
async function saveExpenseNotes() { /* ... same as before ... */ if(!currentUser)return void alert("Not logged in.");const id=document.getElementById("edit-expense-id").value,newNotes=document.getElementById("edit-notes-textarea").value.trim(),expenseIndex=expenses.findIndex((e=>e.id===id));if(-1===expenseIndex)return alert("Expense not found locally."),void hideEditNotesModal();const expense=expenses[expenseIndex];if(expense.notes===newNotes)return void hideEditNotesModal();try{showLoading(),await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).update({notes:newNotes}),expenses[expenseIndex].notes=newNotes,await logActivity(`Updated notes for expense: ${expense.category}`,"expense",{id:expense.id,category:expense.category,notes:newNotes}),hideLoading(),hideEditNotesModal(),renderExpenseList();const t=document.getElementById("tab-dashboard"),n=document.getElementById("content");if(t?.classList.contains("active")&&n?.dataset.calendarYear&&isDateInMonth(expense.date,parseInt(n.dataset.calendarYear),parseInt(n.dataset.calendarMonth)))renderDashboard(n,parseInt(n.dataset.calendarYear),parseInt(n.dataset.calendarMonth))}catch(e){hideLoading(),console.error("Error updating notes:",e),alert("Failed to update notes.")}}
function hideEditNotesModal() { /* ... same as before ... */ const modal=document.getElementById("edit-notes-modal");modal&&(modal.style.display="none");const expenseIdField=document.getElementById("edit-expense-id");expenseIdField&&(expenseIdField.value="");const notesTextarea=document.getElementById("edit-notes-textarea");notesTextarea&&(notesTextarea.value="")}
// --- End Edit/Save Notes ---

// --- Delete Expense (Conditional Dashboard Update Logic Unchanged) ---
async function deleteExpense(id) { if (!currentUser || !confirm("Delete this expense?")) return; try { showLoading(); const expenseToDelete = expenses.find(e => e.id === id); await db.collection(`users/${currentUser.uid}/${COLLECTIONS.EXPENSES}`).doc(id).delete(); expenses = expenses.filter(e => e.id !== id); const logAction = expenseToDelete ? `Deleted expense: ${expenseToDelete.category} - ${formatCurrency(expenseToDelete.amount)}` : `Deleted expense (ID: ${id})`; await logActivity(logAction, 'delete', expenseToDelete || { id }); hideLoading(); renderExpenseList(); const dashboardTab = document.getElementById('tab-dashboard'); const contentEl = document.getElementById('content'); if(dashboardTab?.classList.contains('active') && contentEl?.dataset.calendarYear && expenseToDelete && isDateInMonth(expenseToDelete.date, parseInt(contentEl.dataset.calendarYear), parseInt(contentEl.dataset.calendarMonth))) { renderDashboard(contentEl, parseInt(contentEl.dataset.calendarYear), parseInt(contentEl.dataset.calendarMonth)); } } catch (error) { hideLoading(); console.error("Error deleting expense:", error); alert("Failed to delete expense."); } }
// --- End Delete Expense ---

// --- Activity Log Show/Hide (Unchanged) ---
function showActivityLog() { const modal = document.getElementById('activity-log-modal'); const logContent = document.getElementById('activity-log-content'); if (!modal || !logContent) return; modal.style.display = 'flex'; if (activityLog.length === 0) { logContent.innerHTML = `<p class="text-gray-400 text-center py-4">No activity recorded yet.</p>`; return; } let html = `<div class="space-y-2">`; activityLog.forEach(log => { html += `<div class="log-entry text-sm"><div class="log-date text-xs">${formatDateTime(log.timestamp)}</div><div class="log-action">${log.action || 'Unknown action'}</div></div>`; }); html += `</div>`; logContent.innerHTML = html; logContent.scrollTop = 0; }
function hideActivityLog() { const modal = document.getElementById('activity-log-modal'); if (modal) modal.style.display = 'none'; }
// --- End Activity Log ---

// --- Initialize App (Unchanged) ---
function initializeApp() { auth.onAuthStateChanged(user => { if (user) { if (!currentUser || currentUser.uid !== user.uid) { currentUser = user; showApp(); } } else { if (currentUser) { currentUser = null; hideApp(); } } }, error => { console.error("Auth listener error:", error); showError("Authentication error."); hideLoading(); hideApp(); }); document.getElementById('login-button')?.addEventListener('click', () => { const e = document.getElementById('email-input').value, p = document.getElementById('password-input').value; if (!e || !p) { showError('Email and password required'); return; } loginUser(e, p); }); document.getElementById('register-button')?.addEventListener('click', () => { const e = document.getElementById('email-input').value, p = document.getElementById('password-input').value; if (!e || !p) { showError('Email and password required'); return; } if (p.length < 6) { showError('Password must be at least 6 characters'); return; } registerUser(e, p); }); document.getElementById('password-input')?.addEventListener('keyup', (event) => { if (event.key === 'Enter' && document.getElementById('email-input').value) { document.getElementById('login-button').click(); } }); window.addEventListener('click', (event) => { if (event.target === document.getElementById('activity-log-modal')) hideActivityLog(); if (event.target === document.getElementById('edit-notes-modal')) hideEditNotesModal(); }); document.querySelector('#activity-log-modal .modal-close')?.addEventListener('click', hideActivityLog); document.querySelector('#edit-notes-modal .modal-close')?.addEventListener('click', hideEditNotesModal); document.querySelector('#edit-notes-modal button[onclick="hideEditNotesModal()"]')?.addEventListener('click', hideEditNotesModal); const appSubtitle = document.querySelector('.app-subtitle'); if(appSubtitle) appSubtitle.textContent = `v${VERSION}`; }
document.addEventListener('DOMContentLoaded', initializeApp);
// --- End Initialize App ---

// --- Global Function Exposure (Unchanged) ---
window.changeTab = changeTab; window.deleteIncome = deleteIncome; window.deleteBill = deleteBill; window.deleteExpense = deleteExpense; window.showActivityLog = showActivityLog; window.hideActivityLog = hideActivityLog; window.logout = logout; window.toggleBillPaid = toggleBillPaid; window.editExpenseNotes = editExpenseNotes; window.saveExpenseNotes = saveExpenseNotes; window.hideEditNotesModal = hideEditNotesModal;
// --- End Global Exposure ---
