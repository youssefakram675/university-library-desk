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

// Connect to the SQLite database
const dbPath = path.join(__dirname, 'library.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Explicitly serve index.html at the root route to fix the Cannot GET / error
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// === ADD YOUR API / ROUTE HANDLERS BELOW THIS LINE ===
// Example:
// app.get('/api/books', (req, res) => { ... });

// Start server (fallback for local testing)
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export app for serverless execution on Vercel
module.exports = app;
