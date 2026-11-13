const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Allows cloud host to assign dynamic port

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const db = new sqlite3.Database(path.join(__dirname, 'library.db'), (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create table and seed only if empty (prevents wiping runtime additions on restart)
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS loans (
        id TEXT PRIMARY KEY,
        studentId TEXT,
        title TEXT,
        type TEXT,
        dueDate TEXT,
        status TEXT
    )`, () => {
        db.get(`SELECT COUNT(*) as count FROM loans`, [], (err, row) => {
            if (!err && row.count === 0) {
                const stmt = db.prepare(`INSERT INTO loans (id, studentId, title, type, dueDate, status) VALUES (?, ?, ?, ?, ?, ?)`);
                stmt.run('LOAN-301', 'STU-12345', 'Introduction to Algorithms', 'Book', '2027-01-15', 'ACTIVE');
                stmt.run('LOAN-302', 'STU-67890', 'Database Systems Handbook', 'Book', '2027-01-20', 'ACTIVE');
                stmt.run('LOAN-303', 'STU-11223', 'MacBook Air 13-inch', 'Equipment', '2026-05-10', 'OVERDUE');
                stmt.run('LOAN-304', 'STU-44556', 'Portable External SSD (1TB)', 'Equipment', '2026-06-01', 'OVERDUE');
                stmt.finalize();
                console.log('Database seeded with initial loans.');
            }
        });
    });
});

app.get('/api/loans', (req, res) => {
    db.all(`SELECT * FROM loans`, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/loans', (req, res) => {
    const { id, studentId, title, type, dueDate, status } = req.body;
    
    if (!studentId || !title || !dueDate || !type) {
        return res.status(400).json({ error: 'All required loan fields must be provided.' });
    }

    const query = `INSERT INTO loans (id, studentId, title, type, dueDate, status) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(query, [id, studentId, title, type, dueDate, status], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Success', id });
    });
});

app.patch('/api/loans/:id', (req, res) => {
    const { status, dueDate } = req.body;
    const { id } = req.params;

    if (dueDate) {
        db.run(`UPDATE loans SET dueDate = ? WHERE id = ?`, [dueDate, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Due date extended successfully' });
        });
    } else if (status) {
        const validStatuses = ['ACTIVE', 'OVERDUE', 'RETURNED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value.' });
        }
        db.run(`UPDATE loans SET status = ? WHERE id = ?`, [status, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Status updated successfully' });
        });
    } else {
        res.status(400).json({ error: 'No update parameters provided.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});