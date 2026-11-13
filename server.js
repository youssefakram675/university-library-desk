const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// In-memory fallback store pre-populated with your exact database records
let loansData = [
    { id: 'LOAN-301', studentId: 'STU-12345', title: 'Introduction to Algorithms', type: 'Book', dueDate: '2027-01-15', status: 'ACTIVE' },
    { id: 'LOAN-302', studentId: 'STU-67890', title: 'Database Systems Handbook', type: 'Book', dueDate: '2027-01-20', status: 'ACTIVE' },
    { id: 'LOAN-303', studentId: 'STU-11223', title: 'MacBook Air 13-inch', type: 'Equipment', dueDate: '2026-05-10', status: 'OVERDUE' },
    { id: 'LOAN-304', studentId: 'STU-44556', title: 'Portable External SSD (1TB)', type: 'Equipment', dueDate: '2026-06-01', status: 'OVERDUE' }
];

// Open SQLite in read-only mode so it never crashes on Vercel's read-only file system
const dbPath = path.join(__dirname, 'library.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Running in memory mode (Vercel read-only environment).');
    } else {
        console.log('Connected to SQLite database in read-only mode.');
        db.all(`SELECT * FROM loans`, [], (dbErr, rows) => {
            if (!dbErr && rows && rows.length > 0) {
                loansData = rows;
            }
        });
    }
});

// API Endpoints synced with app.js
app.get('/api/loans', (req, res) => {
    res.json(loansData);
});

app.post('/api/loans', (req, res) => {
    const { id, studentId, title, type, dueDate, status } = req.body;
    
    if (!studentId || !title || !dueDate || !type) {
        return res.status(400).json({ error: 'All required loan fields must be provided.' });
    }

    const newLoan = {
        id: id || 'LOAN-' + Date.now().toString().slice(-5),
        studentId,
        title,
        type,
        dueDate,
        status: status || 'ACTIVE'
    };

    loansData.push(newLoan);
    res.json({ message: 'Success', id: newLoan.id });
});

app.patch('/api/loans/:id', (req, res) => {
    const { status, dueDate } = req.body;
    const { id } = req.params;

    const loan = loansData.find(l => l.id === id);
    if (!loan) {
        return res.status(404).json({ error: 'Loan not found.' });
    }

    if (dueDate) {
        loan.dueDate = dueDate;
        res.json({ message: 'Due date extended successfully' });
    } else if (status) {
        const validStatuses = ['ACTIVE', 'OVERDUE', 'RETURNED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value.' });
        }
        loan.status = status;
        res.json({ message: 'Status updated successfully' });
    } else {
        res.status(400).json({ error: 'No update parameters provided.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
