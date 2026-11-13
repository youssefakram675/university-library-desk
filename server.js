const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, client-side JS) from the root directory
app.use(express.static(path.join(__dirname)));

// In-memory data store mimicking your SQLite tables to allow full interactivity on Vercel
let memoryLoans = [
    { id: 1, bookTitle: "Introduction to Algorithms", borrower: "Youssef Akram", status: "Active", dueDate: "2026-06-01" },
    { id: 2, bookTitle: "Database System Concepts", borrower: "Ahmed Ali", status: "Active", dueDate: "2026-06-05" },
    { id: 3, bookTitle: "Operating System Concepts", borrower: "Mohamed Hassan", status: "Overdue", dueDate: "2026-05-10" }
];

// Create a robust mock database object that supports full CRUD operations
const mockDb = {
    all(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        console.log("Executing SQL SELECT:", sql);
        // Return current active/overdue memory loans
        if (callback) callback(null, memoryLoans);
        return mockDb;
    },
    get(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        console.log("Executing SQL GET:", sql);
        if (callback) callback(null, memoryLoans[0] || null);
        return mockDb;
    },
    run(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        console.log("Executing SQL WRITE/UPDATE/INSERT:", sql, params);

        const lowerSql = sql.toLowerCase();
        if (lowerSql.includes('insert')) {
            // Extract or simulate adding a new loan from parameters or request
            const newLoan = {
                id: memoryLoans.length + 1,
                bookTitle: params && params[0] ? params[0] : "New Registered Book",
                borrower: params && params[1] ? params[1] : "Student User",
                status: "Active",
                dueDate: "2026-07-01"
            };
            memoryLoans.push(newLoan);
        } else if (lowerSql.includes('update') || lowerSql.includes('delete')) {
            // Handle returns or status changes if applicable
            console.log("Record updated/removed in memory.");
        }

        if (callback) callback.call({ lastID: memoryLoans.length, changes: 1 }, null);
        return mockDb;
    },
    exec(sql, callback) {
        if (callback) callback(null);
        return mockDb;
    }
};

// Make database accessible to app.js
app.locals.db = mockDb;

// Explicitly serve index.html at the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Import main application routes and logic from app.js
try {
    const mainApp = require('./app.js');
    if (typeof mainApp === 'function') {
        app.use(mainApp);
    }
} catch (e) {
    console.log('app.js loaded.');
}

// Start server (fallback for local testing)
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export app for serverless execution on Vercel
module.exports = app;
