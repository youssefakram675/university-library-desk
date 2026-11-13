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

// Connect to the SQLite database in read-only mode for Vercel's serverless environment
const dbPath = path.join(__dirname, 'library.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database in read-only mode.');
    }
});

// Make database accessible globally or pass to app if needed
app.locals.db = db;

// Explicitly serve index.html at the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Import your main application routes and logic from app.js
try {
    const mainApp = require('./app.js');
    if (typeof mainApp === 'function') {
        app.use(mainApp);
    }
} catch (e) {
    console.log('app.js loaded or running independently.');
}

// Start server (fallback for local testing)
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export app for serverless execution on Vercel
module.exports = app;
