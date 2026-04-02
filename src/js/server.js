import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import session from 'express-session';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectSrcDir = path.resolve(__dirname, "..");
const dbPath = path.join(__dirname, "notes.db");

const db = new sqlite3.Database(dbPath, (err) => {
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
        categories TEXT DEFAULT '["None", "Personal", "Work", "Ideas", "Other"]',
        friend_requests TEXT,
        pending_request TEXT,
        friends TEXT,
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
        shared_user TEXT,
        created_date TEXT DEFAULT (datetime('now'))
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        isDone BOOLEAN,
        created_date TEXT DEFAULT (datetime('now'))
    )    
`);

app.use(express.json());
app.use(cors());
app.use(session({
    secret: "smart-notes-dev-session",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax"
    }
}));

const protectedPages = new Set([
    "/homepage.html",
    "/createnotepage.html",
    "/editnotepage.html",
    "/hiddennotesverify.html",
    "/managecategories.html",
    "/settings.html"
]);

app.use((req, res, next) => {
    if (protectedPages.has(req.path) && !req.session.userId) {
        return res.redirect("/loginpage.html");
    }

    next();
});

app.use(express.static(projectSrcDir));

app.get("/", (req, res) => {
    res.sendFile(path.join(projectSrcDir, "loginpage.html"));
});

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    next();
}

app.post("/signup", (req, res) => {
    const { email, username, password } = req.body;
    const date = new Date().toLocaleString();

    db.get(
        "SELECT * FROM users WHERE email = ? OR username = ?",
        [email, username],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: "Database error: " + err.message });
            }
            if (row) {
                return res.status(400).json({ error: "Email or username already exists!" });
            }

            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    return res.status(500).json({ error: "Error hashing password" });
                }

                db.run(
                    "INSERT INTO users (email, username, password, created_date) VALUES (?, ?, ?, ?)",
                    [email, username, hashedPassword, date],
                    function (err) {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        req.session.userId = this.lastID;
                        res.json({ message: "Signed up successfully", id: this.lastID });
                    }
                );
            });
        }
    );
});

app.post("/login", (req, res) => {
    const { email, username, password } = req.body;
    db.get(
        "SELECT * FROM users WHERE email = ? AND username = ?",
        [email, username],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: "Database error: " + err.message });
            }
            if (!user) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }

            bcrypt.compare(password, user.password, (err, result) => {
                if (err) {
                    return res.status(500).json({ error: "Error comparing passwords" });
                }
                if (result) {
                    req.session.userId = user.id;
                    res.json({
                        success: true,
                        user: { id: user.id, email: user.email, username: user.username }
                    });
                } else {
                    res.status(401).json({ success: false, message: "Invalid credentials" });
                }
            });
        }
    );
});

app.post("/logout", requireAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Logout failed" });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
    });
});

app.get("/notes", requireAuth, (req, res) => {
    const userId = req.session.userId;

    db.all("SELECT * FROM notes WHERE user_id = ? AND private = 0 AND shared_user IS NULL ORDER BY created_date DESC", [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get("/notes-shared", requireAuth, (req, res) => {
    const userId = req.session.userId;

    db.get("SELECT username FROM users WHERE id = ?", [userId], function (err, row) {
        if (err) {
            return res.status(500).json({ error: "Database error: " + err.message });
        }

        const username = row.username;

        db.all(
            `SELECT * FROM notes 
             WHERE private = 0 
             AND shared_user IS NOT NULL 
             AND shared_user != '' 
             AND shared_user LIKE ? 
             ORDER BY created_date DESC`,
            [`%${username}%`],
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json(rows);
            }
        );
    });
});

app.get("/todos", requireAuth, (req, res) => {
    const userId = req.session.userId;

    db.all("SELECT * FROM todos WHERE user_id = ? ORDER BY created_date DESC", [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get("/notes-private", requireAuth, (req, res) => {
    const userId = req.session.userId;

    db.all("SELECT * FROM notes WHERE user_id = ? AND private = 1 ORDER BY created_date DESC", [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get("/edit-note/:id", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const note_id = req.params;

    db.all("SELECT * FROM notes WHERE id = ? AND user_id = ?", [note_id.id, userId], function (err, rows) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post("/edit-note-submit", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { noteId, title, content, category, color, isPrivate } = req.body;
    const date = new Date().toLocaleString();

    db.run(
            "UPDATE notes SET title = ?, content = ?, category = ?, color = ?, private = ?, created_date = ? WHERE id = ? AND user_id = ?",
            [title, content, category, color, isPrivate, date, noteId, userId],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
            res.json({ message: "Note updated successfully", id: req.session.userId });
        }
    );
});

app.post("/edit-shared-note-submit", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { noteId, title, content, category, color, isPrivate, username } = req.body;
    const date = new Date().toLocaleString();
    
    db.get("SELECT username FROM users WHERE id = ?", [userId], function (err, row) {
        if (err) {
            return res.status(500).json({ error: "Database error: " + err.message });
        }

        const creatorUsername = row.username;

        db.run(
            "UPDATE notes SET title = ?, content = ?, category = ?, color = ?, private = ?, created_date = ?, shared_user = ? WHERE id = ?",
            [title, content, category, color, 0, date, creatorUsername + "," + username, noteId],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "Note updated successfully", id: this.lastID });
            }
        );
    });
});

app.delete("/delete-note/:id", requireAuth, (req, res) => {
    const noteId = req.params.id;
    const userId = req.session.userId;

    db.run("DELETE FROM notes WHERE id = ? AND user_id = ?", [noteId, userId], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Note deleted successfully. "});
    });
});

app.delete("/delete-todo/:id", requireAuth, (req, res) => {
    const todoId = req.params.id;
    const userId = req.session.userId;

    db.run("DELETE FROM todos WHERE id = ? AND user_id = ?", [todoId, userId], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Task deleted successfully. "});
    });
});

app.get("/get-categories", requireAuth, (req, res) => {
    const userId = req.session.userId;
    
    db.get("SELECT categories FROM users WHERE id = ?", [userId], (err, row) => {
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
    })
});

// app.get("/get-friends", (req, res) => {
    
//     db.get("SELECT friends FROM users WHERE id = ?", [id], (err, row) => {
//         if (err) {
//             return res.status(500).json({ error: "Database error: " + err.message });
//         }

//         let friends = [];
//         if (row?.friends) {
//             try {
//                 friends = JSON.parse(row.friends);
//             } catch {
//                 friends = row.friends.split(",");
//             }
//         }

//         res.json(friends);
//     })
// });

app.post("/add-note", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { title, content, category, color, isPrivate } = req.body;
    const date = new Date().toLocaleString();

    db.run(
        "INSERT INTO notes (user_id, title, content, category, color, private, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [userId, title, content, category, color, isPrivate ? 1 : 0, date],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Note added successfully", id: this.lastID });
        }
    );
});

app.post("/add-shared-note", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { title, content, category, color, isPrivate, username } = req.body;
    const date = new Date().toLocaleString();

    db.get("SELECT username FROM users WHERE id = ?", [userId], function (err, row) {
        if (err) {
            return res.status(500).json({ error: "Database error: " + err.message });
        }

        const creatorUsername = row.username;

        db.run(
            "INSERT INTO notes (user_id, title, content, category, color, private, created_date, shared_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [userId, title, content, category, color, 0, date, creatorUsername + "," + username],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "Note added successfully", id: this.lastID });
            }
        );
    });
});

app.get("/check-username/:username", requireAuth, (req, res) => {
    const username = req.params.username;
    const userId = req.session.userId;

    db.get("SELECT * FROM users WHERE id = ?", [userId], function (currentUserErr, currentUser) {
        if (currentUserErr) {
            return res.status(500).json({ error: currentUserErr.message });
        }
        if (!currentUser) {
            return res.status(404).json({ error: "Current user not found" });
        }

        if (currentUser.username === username) {
            return res.json({ found: false, self: true });
        }

        db.get("SELECT * FROM users WHERE username = ? AND id IS NOT ?", [username, userId], function (err, row) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.json({ found: false, self: false });
            }
            res.json({ found: true, self: false, user: row });
        });
    });
});

app.post("/add-todo", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { title } = req.body;
    const date = new Date().toLocaleString();
    const isDone = 0;

    db.run(
        "INSERT INTO todos (user_id, title, isDone, created_date) VALUES (?, ?, ?, ?)",
        [userId, title, isDone, date],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Todo added successfully", id: this.lastID });
        }
    );
});

// app.post("/add-friend", (req, res) => {
//     const { name } = req.body;
    
//     db.get("SELECT friend_requests FROM users WHERE id = ?", [id], (err, row1) => {
//         if (err) return res.status(500).json({ error: err.message });
//         if (!row1) return res.status(404).json({ error: "User not found (sender)" });

//         let friendRequests = JSON.parse(row1.friend_requests || "[]");

//         if (friendRequests.includes(name)) {
//             return res.status(400).json({ error: "This request already exists!" });
//         }

//         friendRequests.push(name);

//         db.run("UPDATE users SET friend_requests = ? WHERE id = ?",
//             [JSON.stringify(friendRequests), id], function (err) {
//                 if (err) return res.status(500).json({ error: err.message });

//                 db.get("SELECT pending_requests FROM users WHERE username = ?", [name], (err, row2) => {
//                     if (err) return res.status(500).json({ error: err.message });
//                     if (!row2) return res.status(404).json({ error: "User not found (receiver)" });

//                     let pendingRequests = JSON.parse(row2.pending_requests || "[]");

//                     db.get("SELECT username FROM users WHERE id = ?", [id], (err, row3) => {
//                         if (err) return res.status(500).json({ error: err.message });
//                         if (!row3) return res.status(404).json({ error: "Sender username not found" });

//                         const senderUsername = row3.username;

//                         if (pendingRequests.includes(senderUsername)) {
//                             return res.status(400).json({ error: "This pending request already exists!" });
//                         }

//                         pendingRequests.push(senderUsername);

//                         db.run("UPDATE users SET pending_requests = ? WHERE username = ?",
//                             [JSON.stringify(pendingRequests), name], function (err) {
//                                 if (err) return res.status(500).json({ error: err.message });

//                                 res.json({ message: "Request successfully sent!" });
//                             });
//                     });
//                 });
//             });
//     });
// });

app.get("/get-note-count", requireAuth, (req, res) => {
    const userId = req.session.userId;
    
    db.get("SELECT COUNT(id) FROM notes WHERE user_id = ?", [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error: " + err.message });
        }
        res.json(row);
    });
});

app.get("/get-fav-category", requireAuth, (req, res) => {
    const userId = req.session.userId;

    db.get("SELECT MAX(category) FROM notes WHERE user_id = ? GROUP BY category ORDER BY COUNT(category) DESC LIMIT 1", [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error: " + err.message });
        }
        res.json(row);
    });
});

app.post("/password-validation", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { password } = req.body;

    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error: " + err.message });
        }
        if (!row) {
            return res.status(404).json({ success: false });
        }

        bcrypt.compare(password, row.password, (compareErr, result) => {
            if (compareErr) {
                return res.status(500).json({ error: "Error comparing passwords" });
            }

            res.json({ success: result });
        });
    });
});

app.delete("/delete-all-data", requireAuth, (req, res) => {
    const userId = req.session.userId;

    db.run("DELETE FROM notes WHERE user_id = ?", [userId], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Notes deleted successfully" });
    });
});

app.get("/categories", requireAuth, (req, res) => {
    const userId = req.session.userId;

    db.get("SELECT categories FROM users WHERE id = ?", [userId], (err, row) => {
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

app.post("/edit-category", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { category_index, newName } = req.body;

    db.get("SELECT categories FROM users WHERE id = ?", [userId], (err, row) => {
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
            [JSON.stringify(categories), userId],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "Category deleted successfully", id: userId });
            }
        );
    });
});

app.post("/task-toggle/:id", requireAuth, (req, res) => {
    const todoId = req.params.id;
    const userId = req.session.userId;
    const { isDone } = req.body;

    db.run("UPDATE todos SET isDone = ? WHERE id = ? AND user_id = ?",
        [isDone, todoId, userId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Successful", id: req.session.userId });
        }
    );
});

app.post("/add-category", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { name } = req.body;

    db.get("SELECT categories FROM users WHERE id = ?", [userId], (err, row) => {
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
            [JSON.stringify(categories), userId],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: "Category added successfully", id: userId });
            }
        );
    });
});

app.delete("/delete-category/:category_index", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { category_index } = req.params;

    db.get("SELECT categories FROM users WHERE id = ?", [userId], (err, row) => {
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
            [JSON.stringify(categories), userId],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                let placeholders = categories.map(() => '?').join(', ');

                db.all(`SELECT * FROM notes WHERE category NOT IN (${placeholders}) AND user_id = ?`, [...categories, userId], (err, rows) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    let noteIds = rows.map(row => row.id);
                    
                    let placeholders = noteIds.map(() => '?').join(', ');
              
                    db.run(`UPDATE notes SET category = 'None' WHERE id IN (${placeholders}) AND user_id = ?`, [...noteIds, userId], function (err) {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }

                        res.json({ message: "Category deleted successfully", id: userId });
                    });
                });
            }
        );
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
