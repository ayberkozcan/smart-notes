import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import session from 'express-session';

const app = express();
const port = 3000;
let id = "1";

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
                    res.json({ message: "Signed up successfully", id: this.lastID });
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
                id = user.id;
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
    db.all("SELECT * FROM notes WHERE user_id = ?", [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get("/edit-note/:id", (req, res) => {
    const note_id = req.params;

    db.all("SELECT * FROM notes WHERE id = ? AND user_id = ?", [note_id.id, id], function (err, rows) {
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
        "UPDATE notes SET title = ?, content = ?, category = ?, color = ?, private = ?, created_date = ? WHERE id = ?",
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
        "INSERT INTO notes (user_id, title, content, category, color, private, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, title, content, category, color, isPrivate ? 1 : 0, date],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Note added successfully", id: this.lastID });
        }
    );
});

app.get("/get-note-count", (req, res) => {
    
    db.get("SELECT COUNT(id) FROM notes WHERE user_id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error: " + err.message });
        }
        res.json(row);
    });
});

app.get("/get-fav-category", (req, res) => {

    db.get("SELECT MAX(category) FROM notes WHERE user_id = ? GROUP BY category ORDER BY COUNT(category) DESC LIMIT 1", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error: " + err.message });
        }
        res.json(row);
    });
});

app.post("/password-validation", (req, res) => {
    const { password } = req.body;

    db.get("SELECT * FROM users WHERE id = ? AND password = ?", [id, password], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error: " + err.message });
        }
        if (!row) {
            return res.json({ success: false });
        }
        res.json({ success: true });
    });
});

app.delete("/delete-all-data", (req, res) => {

    db.run("DELETE FROM notes WHERE user_id = ?", [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Notes deleted successfully" });
    });
});

app.get("/categories", (req, res) => {

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

app.post("/edit-category", (req, res) => {
    const { category_index, newName } = req.body;

    db.get("SELECT categories FROM users WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "User not found" });
        }

        let categories = JSON.parse(row.categories);
        if (category_index < 0 || category_index >= categories.length) {
            return res.status(400).json({ error: "Invalid category index" });
        }

        categories[category_index] = newName;

        db.run(
            "UPDATE users SET categories = ? WHERE id = ?",
            [JSON.stringify(categories), id],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "Category deleted successfully", id });
            }
        );
    });
});

app.post("/add-category", (req, res) => {
    const { name } = req.body;

    db.get("SELECT categories FROM users WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "User not found" });
        }

        let categories = JSON.parse(row.categories);

        if (categories.length >= 10) {
            return res.status(400).json({ error: "Maximum number of categories reached" });
        }

        if (categories.includes(name)) {
            return res.status(400).json({ error: "This category already exists!" });
        }
        
        categories.push(name);

        db.run("UPDATE users SET categories = ? WHERE id = ?",
            [JSON.stringify(categories), id],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "Category added successfully", id });
            }
        );
    });
});

app.delete("/delete-category/:category_index", (req, res) => {
    const { category_index } = req.params;

    db.get("SELECT categories FROM users WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "User not found" });
        }

        let categories = JSON.parse(row.categories);
        if (category_index < 0 || category_index >= categories.length) {
            return res.status(400).json({ error: "Invalid category index" });
        }

        categories.splice(category_index, 1);

        db.run(
            "UPDATE users SET categories = ? WHERE id = ?",
            [JSON.stringify(categories), id],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "Category deleted successfully", id });
            }
        );
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});