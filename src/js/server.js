const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");

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

app.use(bodyParser.json());

app.post("/add-note", (req, res) => {
    const { title, content, category, color, private } = req.body;
    const date = new Date().toLocaleString();

    db.run(
        "INSERT INTO notes (title, content, category, color, private, date) VALUES (?, ?, ?, ?, ?, ?)",
        [title, content, category, color, private, date ? 1 : 0, date],
        function (err) {
            if (err) {
                return res.status(500).json({error: err.message});
            }
            res.json({ message: "Note added successfully", id: this.lastID });
        }
    );
});

app.listen(port, () => {
    console.log("Server is running on http://localhost:${port}");
});