import express from 'express';
import sqlite3 from 'sqlite3';
import bodyParser from 'body-parser';
import cors from 'cors';
import session from 'express-session';

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
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        categories TEXT DEFAULT '["Personal", "Work", "Ideas"]',
        created_date TEXT DEFAULT (datetime('now'))
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        content TEXT,
        category TEXT,
        color TEXT,
        private BOOLEAN,
        created_date TEXT DEFAULT (datetime('now'))
    )    
`);

app.use(express.json());
app.use(cors());
app.use(bodyParser.json()); // delete

app.use(session({
    secret: "aaa",
    resave: false,
    saveUninitialized: true
}));

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

app.post("/login", (req, res) => {
    const { email, username, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE email = ? AND username = ? AND password = ?", 
        [email, username, password], 
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: "Database error: " + err.message });
            }
            if (user) {
                req.session.user_id = user.id;
                res.json({
                    success: true,
                    user: { id: user.id, email: user.email, username: user.username }
                });
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

app.get("/categories", (req, res) => {
    const id = req.session?.user_id;
    if (!id) return res.status(401).json({ error: "Unauthorized" });

    db.get("SELECT categories FROM users WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error: " + err.message });
        }
        
        let categories = [];
        if (row?.categories) {
            try {
                categories = JSON.parse(row.categories);
            } catch {
                categories = row.categories.split(",");
            }
        }

        res.json(categories);
    });
});

app.post("/delete-category", (req, res) => {
    const {user_id, category} = req.body;
    
    db.get("SELECT categories FROM users WHERE id = ?", [user_id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "User not found" });
        }

        let categories = JSON.parse(row.categories);
        categories = categories.filter(cat => cat !== category);

        db.run(
            "UPDATE users SET categories = ? WHERE id = ?",
            [JSON.stringify(categories), user_id],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "Category deleted successfully", user_id });
            }
        );
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});