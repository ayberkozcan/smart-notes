import express from 'express';
import sqlite3 from 'sqlite3';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();
const port = 3000;

const db = new sqlite3.Database("notes.db", (err) => {
    if (err) {
        console.error("Database connection error: ", err.message);
    } else {
        console.log("Connected database");
    }
});

db.run(`
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        category TEXT,
        color TEXT,
        private BOOLEAN,
        date TEXT
    )    
`);

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_date TEXT DEFAULT (datetime('now'))
    )
`);

app.use(express.json());
app.use(cors());
app.use(bodyParser.json()); // delete

app.post("/signup", (req, res) => {
    const { email, username, password } = req.body;
    const date = new Date().toLocaleString();

    db.get(
        "SELECT * FROM users WHERE email = ? AND username = ?",
        [email, username],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: "Database error: " + err.message });
            }
            if (row) {
                return res.status(400).json({ error: "Email or username already exists!" });
            }

            db.run(
                "INSERT INTO users (email, username, password, created_date) VALUES (?, ?, ?, ?)",
                [email, username, password, date],
                function (err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ message: "User added successfully", id: this.lastID });
                }
            );
        }
    );
});

app.get("/login", (req, res) => {
    const { email, username, password } = req.query;
    
    db.all(
        "SELECT * FROM users WHERE email = ? AND username = ? AND password = ?", 
        [email, username, password], 
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (rows.length > 0) {
                res.json({ success: true, message: "User found" });
            } else {
                res.status(401).json({ success: false, message: "Invalid credentials" });
            }
        }
    );
});

app.get("/notes", (req, res) => {
    db.all("SELECT * FROM notes", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get("/edit-note/:id", (req, res) => {
    const { id } = req.params;
    db.all("SELECT * FROM notes WHERE id = ?", [id], function (err, rows) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post("/edit-note-submit", (req, res) => {
    const { id, title, content, category, color, isPrivate } = req.body;
    const date = new Date().toLocaleString();

    db.run(
        "UPDATE notes SET title = ?, content = ?, category = ?, color = ?, private = ?, date = ? WHERE id = ?", 
        [title, content, category, color, isPrivate, date, id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Note updated successfully", id: id });
        }
    );
});

app.delete("/delete-note/:id", (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM notes WHERE id = ?", [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Note deleted successfully. "});
    });
});

app.post("/add-note", (req, res) => {
    const { title, content, category, color, isPrivate } = req.body;
    const date = new Date().toLocaleString();

    db.run(
        "INSERT INTO notes (title, content, category, color, private, date) VALUES (?, ?, ?, ?, ?, ?)",
        [title, content, category, color, isPrivate ? 1 : 0, date],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Note added successfully", id: this.lastID });
        }
    );
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});