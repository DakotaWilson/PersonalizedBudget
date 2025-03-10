import React, { useState } from 'react';

function BudgetApp() {
  // Tab state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [incomes, setIncomes] = useState([
    { id: 1, source: "Doctor Care", amount: 1500, date: "2025-02-25" },
    { id: 2, source: "CORE", amount: 300, date: "2025-03-07" }
  ]);
  
  const [bills, setBills] = useState([
    { id: 1, name: "Rent", amount: 1200, dueDate: "2025-03-01" },
    { id: 2, name: "Internet", amount: 100, dueDate: "2025-03-11" }
  ]);
  
  const [expenses, setExpenses] = useState([
    { id: 1, category: "Groceries", amount: 120, date: "2025-03-05" },
    { id: 2, category: "Shopping", amount: 45, date: "2025-03-01" }
  ]);
  
  // Form states
  const [newIncome, setNewIncome] = useState({ source: "Doctor Care", customSource: "", amount: "", date: "" });
  const [newBill, setNewBill] = useState({ name: "", amount: "", dueDate: "" });
  const [newExpense, setNewExpense] = useState({ category: "", amount: "", date: "" });
  
  // Activity log
  const [activityLog, setActivityLog] = useState([]);
  const [showLog, setShowLog] = useState(false);
  
  // Constants
  const sources = ["Doctor Care", "CORE", "Other"];
  const categories = ["Groceries", "Shopping", "Dining", "Transportation", "Entertainment", "Utilities", "Other"];
  
  // Calculate totals
  const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalBills = bills.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = totalIncome - totalBills - totalExpenses;
  
  // Helpers
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Log activity
  const logActivity = (action, type, data) => {
    const newLog = {
      id: activityLog.length + 1,
      timestamp: new Date().toISOString(),
      action,
      type,
      data
    };
    setActivityLog([newLog, ...activityLog]);
  };
  
  // Handlers
  const handleAddIncome = () => {
    if (!newIncome.amount || !newIncome.date) return;
    
    // Handle custom source
    const source = newIncome.source === "Other" ? 
      (newIncome.customSource || "Other Income") : 
      newIncome.source;
    
    const newId = Math.max(0, ...incomes.map(i => i.id)) + 1;
    const newEntry = {
      id: newId,
      source,
      amount: Number(newIncome.amount),
      date: newIncome.date
    };
    
    setIncomes([...incomes, newEntry]);
    logActivity(`Added income: ${source}`, "income", newEntry);
    setNewIncome({ source: "Doctor Care", customSource: "", amount: "", date: "" });
  };
  
  const handleAddBill = () => {
    if (!newBill.name || !newBill.amount || !newBill.dueDate) return;
    
    const newId = Math.max(0, ...bills.map(b => b.id)) + 1;
    const newEntry = {
      id: newId,
      name: newBill.name,
      amount: Number(newBill.amount),
      dueDate: newBill.dueDate
    };
    
    setBills([...bills, newEntry]);
    logActivity(`Added bill: ${newBill.name}`, "bill", newEntry);
    setNewBill({ name: "", amount: "", dueDate: "" });
  };
  
  const handleAddExpense = () => {
    if (!newExpense.category || !newExpense.amount || !newExpense.date) return;
    
    const newId = Math.max(0, ...expenses.map(e => e.id)) + 1;
    const newEntry = {
      id: newId,
      category: newExpense.category,
      amount: Number(newExpense.amount),
      date: newExpense.date
    };
    
    setExpenses([...expenses, newEntry]);
    logActivity(`Added expense: ${newExpense.category}`, "expense", newEntry);
    setNewExpense({ category: "", amount: "", date: "" });
  };
  
  const handleDeleteIncome = (id) => {
    const incomeToDelete = incomes.find(i => i.id === id);
    setIncomes(incomes.filter(i => i.id !== id));
    logActivity(`Deleted income: ${incomeToDelete.source}`, "delete", incomeToDelete);
  };
  
  const handleDeleteBill = (id) => {
    const billToDelete = bills.find(b => b.id === id);
    setBills(bills.filter(b => b.id !== id));
    logActivity(`Deleted bill: ${billToDelete.name}`, "delete", billToDelete);
  };
  
  const handleDeleteExpense = (id) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    setExpenses(expenses.filter(e => e.id !== id));
    logActivity(`Deleted expense: ${expenseToDelete.category}`, "delete", expenseToDelete);
  };
  
  // Group expenses by category for pie chart
  const expensesByCategory = {};
  expenses.forEach(expense => {
    const category = expense.category;
    if (!expensesByCategory[category]) {
      expensesByCategory[category] = 0;
    }
    expensesByCategory[category] += Number(expense.amount);
  });
  
  // Dashboard component
  const Dashboard = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gray-800 rounded-lg shadow p-6 border border-green-900">
        <h2 className="text-xl font-bold mb-4 text-green-300">Financial Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg border border-green-800">
            <h3 className="text-sm text-green-400 uppercase font-semibold mb-2">Income</h3>
            <p className="text-2xl font-bold text-green-300">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg border border-green-800">
            <h3 className="text-sm text-yellow-400 uppercase font-semibold mb-2">Bills</h3>
            <p className="text-2xl font-bold text-yellow-300">{formatCurrency(totalBills)}</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg border border-green-800">
            <h3 className="text-sm text-red-400 uppercase font-semibold mb-2">Expenses</h3>
            <p className="text-2xl font-bold text-red-300">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg border border-green-800">
            <h3 className="text-sm text-purple-300 uppercase font-semibold mb-2">Balance</h3>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Expense Breakdown */}
      <div className="bg-gray-800 rounded-lg shadow p-6 border border-green-900">
        <h2 className="text-xl font-bold mb-4 text-green-300">Expense Breakdown</h2>
        {Object.keys(expensesByCategory).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(expensesByCategory).map(([category, amount]) => {
              const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              return (
                <div key={category}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-300">{category}</span>
                    <span className="text-gray-300">
                      {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400">No expense data to display</p>
        )}
      </div>
      
      {/* Upcoming Bills */}
      <div className="bg-gray-800 rounded-lg shadow p-6 border border-green-900">
        <h2 className="text-xl font-bold mb-4 text-green-300">Upcoming Bills</h2>
        {bills.length > 0 ? (
          <div className="space-y-3">
            {bills
              .filter(bill => new Date(bill.dueDate) >= new Date())
              .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
              .slice(0, 5)
              .map(bill => (
                <div key={bill.id} className="flex justify-between border-b border-gray-700 pb-2">
                  <div>
                    <div className="font-medium text-gray-300">{bill.name}</div>
                    <div className="text-sm text-gray-400">Due: {formatDate(bill.dueDate)}</div>
                  </div>
                  <div className="text-yellow-300 font-medium">{formatCurrency(bill.amount)}</div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-400">No upcoming bills</p>
        )}
      </div>
    </div>
  );
  
  // Income tracker component
  const IncomeTracker = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg shadow p-6 border border-green-900">
        <h2 className="text-xl font-bold mb-4 text-green-300">Add New Income</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Source</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
              value={newIncome.source}
              onChange={(e) => setNewIncome({...newIncome, source: e.target.value})}
            >
              {sources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
          
          {newIncome.source === "Other" && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Specify Source</label>
              <input
                type="text"
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                placeholder="Income source"
                value={newIncome.customSource}
                onChange={(e) => setNewIncome({...newIncome, customSource: e.target.value})}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Amount</label>
            <input
              type="number"
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
              placeholder="0.00"
              value={newIncome.amount}
              onChange={(e) => setNewIncome({...newIncome, amount: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Date</label>
            <input
              type="date"
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
              value={newIncome.date}
              onChange={(e) => setNewIncome({...newIncome, date: e.target.value})}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            className="bg-green-700 hover:bg-green-600 text-white py-2 px-4 rounded"
            onClick={handleAddIncome}
          >
            Add Income
          </button>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-lg shadow p-6 border border-green-900">
        <h2 className="text-xl font-bold mb-4 text-green-300">Income History</h2>
        {incomes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="p-2 text-gray-300">Source</th>
                  <th className="p-2 text-gray-300">Date</th>
                  <th className="p-2 text-right text-gray-300">Amount</th>
                  <th className="p-2 text-center text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map(income => (
                  <tr key={income.id} className="border-b border-gray-700">
                    <td className="p-2 text-gray-300">{income.source}</td>
                    <td className="p-2 text-gray-300">{formatDate(income.date)}</td>
                    <td className="p-2 text-right text-green-300">{formatCurrency(income.amount)}</td>
                    <td className="p-2 text-center">
                      <button
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleDeleteIncome(income.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">No income entries yet</p>
        )}
      </div>
    </div>
  );
  
  // Bills tracker component
  const BillTracker = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg shadow p-6 border border-green-900">
        <h2 className="text-xl font-bold mb-4 text-green-300">Add New Bill</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Bill Name</label>
            <input
              type="text"
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
              placeholder="Bill name"
              value={newBill.name}
              onChange={(e) => setNewBill({...newBill, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Amount</label>
            <input
              type="number"
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
              placeholder="0.00"
              value={newBill.amount}
              onChange={(e) => setNewBill({...newBill, amount: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Due Date</label>
            <input
              type="date"
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
              value={newBill.dueDate}
              onChange={(e) => setNewBill({...newBill, dueDate: e.target.value})}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            className="bg-yellow-700 hover:bg-yellow-600 text-white py-2 px-4 rounded"
            onClick={handleAddBill}
          >
            Add Bill
          </button>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-lg shadow p-6 border border-green-900">
        <h2 className="text-xl font-bold mb-4 text-green-300">Bill List</h2>
        {bills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="p-2 text-gray-300">Bill Name</th>
                  <th className="p-2 text-gray-300">Due Date</th>
                  <th className="p-2 text-right text-gray-300">Amount</th>
                  <th className="p-2 text-center text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill.id} className="border-b border-gray-700">
                    <td className="p-2 text-gray-300">{bill.name}</td>
                    <td className="p-2 text-gray-300">{formatDate(bill.dueDate)}</td>
                    <td className="p-2 text-right text-yellow-300">{formatCurrency(bill.amount)}</td>
                    <td className="p-2 text-center">
                      <button
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleDeleteBill(bill.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">No bills yet</p>
        )}
      </div>
    </div>
  );
  
  // Expense tracker component
  const ExpenseTracker = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg shadow p-6 border border-green-900">
        <h2 className="text-xl font-bold mb-4 text-green-300">Add New Expense</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Category</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
              value={newExpense.category}
              onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Amount</label>
            <input
              type="number"
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
              placeholder="0.00"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Date</label>
            <input
              type="date"
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
              value={newExpense.date}
              onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            className="bg-red-700 hover:bg-red-600 text-white py-2 px-4 rounded"
            onClick={handleAddExpense}
          >
            Add Expense
          </button>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-lg shadow p-6 border border-green-900">
        <h2 className="text-xl font-bold mb-4 text-green-300">Expense History</h2>
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-700">
                  <th className="p-2 text-gray-300">Category</th>
                  <th className="p-2 text-gray-300">Date</th>
                  <th className="p-2 text-right text-gray-300">Amount</th>
                  <th className="p-2 text-center text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id} className="border-b border-gray-700">
                    <td className="p-2 text-gray-300">{expense.category}</td>
                    <td className="p-2 text-gray-300">{formatDate(expense.date)}</td>
                    <td className="p-2 text-right text-red-300">{formatCurrency(expense.amount)}</td>
                    <td className="p-2 text-center">
                      <button
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">No expenses yet</p>
        )}
      </div>
    </div>
  );
  
  // Activity log component
  const ActivityLogModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg border border-green-600 max-w-2xl w-full max-h-screen overflow-hidden flex flex-col">
        <div className="p-4 bg-green-900 border-b border-green-600 flex justify-between items-center">
          <h2 className="text-xl font-bold text-green-300">Activity Log</h2>
          <button 
            className="text-green-300 hover:text-white"
            onClick={() => setShowLog(false)}
          >
            ✕
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 flex-grow">
          {activityLog.length === 0 ? (
            <p className="text-gray-400 text-center">No activity recorded yet</p>
          ) : (
            <div className="space-y-3">
              {activityLog.map(log => (
                <div key={log.id} className="bg-gray-700 p-3 rounded">
                  <div className="text-sm text-gray-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                  <div className="font-medium text-gray-200">{log.action}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <button
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
            onClick={() => setShowLog(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-green-900 rounded-lg shadow p-6 mb-6 border border-green-600 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-green-300">Serpent's Vault</h1>
            <p className="text-green-400 italic">Master your finances with cunning</p>
          </div>
          <button 
            className="bg-gray-800 hover:bg-gray-700 text-green-300 py-2 px-4 rounded border border-green-500"
            onClick={() => setShowLog(true)}
          >
            Activity Log
          </button>
        </div>
        
        {/* Navigation */}
        <div className="mb-6">
          <div className="flex border-b border-green-600">
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'dashboard' ? 'bg-green-900 text-green-300 border-b-2 border-green-300' : 'text-gray-400 hover:text-green-300'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'income' ? 'bg-green-900 text-green-300 border-b-2 border-green-300' : 'text-gray-400 hover:text-green-300'}`}
              onClick={() => setActiveTab('income')}
            >
              Income
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'bills' ? 'bg-green-900 text-green-300 border-b-2 border-green-300' : 'text-gray-400 hover:text-green-300'}`}
              onClick={() => setActiveTab('bills')}
            >
              Bills
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'expenses' ? 'bg-green-900 text-green-300 border-b-2 border-green-300' : 'text-gray-400 hover:text-green-300'}`}
              onClick={() => setActiveTab('expenses')}
            >
              Expenses
            </button>
          </div>
        </div>
        
        {/* Content */}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'income' && <IncomeTracker />}
        {activeTab === 'bills' && <BillTracker />}
        {activeTab === 'expenses' && <ExpenseTracker />}
        
        {/* Activity Log Modal */}
        {showLog && <ActivityLogModal />}
      </div>
    </div>
  );
}

export default BudgetApp;
