import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import session from 'express-session';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectSrcDir = path.resolve(__dirname, "..");
const dbPath = path.join(__dirname, "notes.db");

const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET || "change-this-in-production";
const clientOrigin = process.env.CLIENT_ORIGIN || `http://localhost:${port}`;

const authAttempts = new Map();
const authWindowMs = 15 * 60 * 1000;
const authMaxAttempts = 10;

const writeAttempts = new Map();
const writeWindowMs = 60 * 1000;
const writeMaxAttempts = 15;
const reservedShareCodes = new Map();
const shareCodeReservationMs = 10 * 60 * 1000;

function getClientIp(req) {
    return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
}

function cleanupRateLimitStore(store, now, windowMs) {
    for (const [key, value] of store.entries()) {
        if (now - value.firstRequestAt > windowMs) {
            store.delete(key);
        }
    }
}

function cleanupReservedShareCodes() {
    const now = Date.now();

    for (const [code, reservedAt] of reservedShareCodes.entries()) {
        if (now - reservedAt > shareCodeReservationMs) {
            reservedShareCodes.delete(code);
        }
    }
}

function authRateLimiter(req, res, next) {
    const now = Date.now();
    cleanupRateLimitStore(authAttempts, now, authWindowMs);

    const identifier = `${getClientIp(req)}:${(req.body?.email || "").toLowerCase()}:${(req.body?.username || "").toLowerCase()}`;
    const current = authAttempts.get(identifier);

    if (!current) {
        authAttempts.set(identifier, {
            count: 1,
            firstRequestAt: now
        });
        return next();
    }

    if (now - current.firstRequestAt > authWindowMs) {
        authAttempts.set(identifier, {
            count: 1,
            firstRequestAt: now
        });
        return next();
    }

    current.count += 1;

    if (current.count > authMaxAttempts) {
        const retryAfterSeconds = Math.ceil((authWindowMs - (now - current.firstRequestAt)) / 1000);
        res.setHeader("Retry-After", retryAfterSeconds);
        return res.status(429).json({
            error: "Too many authentication attempts. Please try again later."
        });
    }

    next();
}

function writeRateLimiter(req, res, next) {
    const now = Date.now();
    cleanupRateLimitStore(writeAttempts, now, writeWindowMs);

    const identifier = `${getClientIp(req)}:${req.session?.userId || "guest"}:${req.path}`;
    const current = writeAttempts.get(identifier);

    if (!current) {
        writeAttempts.set(identifier, {
            count: 1,
            firstRequestAt: now
        });
        return next();
    }

    if (now - current.firstRequestAt > writeWindowMs) {
        writeAttempts.set(identifier, {
            count: 1,
            firstRequestAt: now
        });
        return next();
    }

    current.count += 1;

    if (current.count > writeMaxAttempts) {
        const retryAfterSeconds = Math.ceil((writeWindowMs - (now - current.firstRequestAt)) / 1000);
        res.setHeader("Retry-After", retryAfterSeconds);
        return res.status(429).json({
            error: "Too many create requests. Please slow down and try again."
        });
    }

    next();
}

function clearAuthRateLimit(req) {
    const identifier = `${getClientIp(req)}:${(req.body?.email || "").toLowerCase()}:${(req.body?.username || "").toLowerCase()}`;
    authAttempts.delete(identifier);
}

function normalizeAuthInput(value) {
    return String(value || "").trim();
}

function validateAuthInput(email, username, password) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !username || !password) {
        return "Email, username and password are required.";
    }

    if (!emailRegex.test(email)) {
        return "Invalid email format.";
    }

    if (username.length < 5 || username.length > 20) {
        return "Username must be between 5 and 20 characters.";
    }

    if (password.length < 8 || password.length > 64) {
        return "Password must be between 8 and 64 characters.";
    }

    return null;
}

function parsePositiveInt(value) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function validateTextField(value, fieldName, minLength, maxLength) {
    const normalizedValue = String(value || "").trim();

    if (normalizedValue.length < minLength || normalizedValue.length > maxLength) {
        return `${fieldName} must be between ${minLength} and ${maxLength} characters.`;
    }

    return null;
}

function validateNoteInput(title, content, category, color) {
    const normalizedTitle = String(title || "").trim();
    const normalizedContent = String(content || "").trim();
    const normalizedCategory = String(category || "").trim();
    const normalizedColor = String(color || "").trim();

    if (!normalizedTitle) {
        return "Title is required.";
    }

    if (normalizedTitle.length > 100) {
        return "Title cannot be longer than 100 characters.";
    }

    if (normalizedContent.length > 5000) {
        return "Content cannot be longer than 5000 characters.";
    }

    if (normalizedCategory.length > 30) {
        return "Category cannot be longer than 30 characters.";
    }

    if (normalizedColor.length > 20) {
        return "Color value is too long.";
    }

    return null;
}

function validateCategoryName(name) {
    const normalizedName = String(name || "").trim();

    if (!normalizedName) {
        return "Category name is required.";
    }

    if (normalizedName.length > 30) {
        return "Category name cannot be longer than 30 characters.";
    }

    return null;
}

function generateShareCodeValue(length = 10) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(length);
    let code = "";

    for (let index = 0; index < length; index += 1) {
        code += alphabet[bytes[index] % alphabet.length];
    }

    return code;
}

function generateUniqueShareCode(callback) {
    cleanupReservedShareCodes();

    const candidate = generateShareCodeValue();
    if (reservedShareCodes.has(candidate)) {
        return generateUniqueShareCode(callback);
    }

    db.get("SELECT id FROM notes WHERE share_code = ?", [candidate], (err, row) => {
        if (err) {
            return callback(err);
        }

        if (row) {
            return generateUniqueShareCode(callback);
        }

        reservedShareCodes.set(candidate, Date.now());
        callback(null, candidate);
    });
}

function consumeReservedShareCode(code) {
    reservedShareCodes.delete(String(code || "").trim().toUpperCase());
}

function validateShareCode(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();

    if (!normalizedCode) {
        return null;
    }

    if (!/^[A-Z2-9]{10}$/.test(normalizedCode)) {
        return "Invalid share code.";
    }

    return null;
}

function parseSharedUsers(value) {
    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function buildSharedUsersValue(users) {
    return Array.from(new Set(users.map((item) => String(item || "").trim()).filter(Boolean))).join(",");
}

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
        share_code TEXT UNIQUE,
        shared_user TEXT,
        created_date TEXT DEFAULT (datetime('now'))
    )
`);

db.all("PRAGMA table_info(notes)", (err, columns) => {
    if (err) {
        return console.error("Notes schema read error: ", err.message);
    }

    const hasShareCodeColumn = columns.some((column) => column.name === "share_code");
    const ensureShareCodeIndex = () => {
        db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_share_code ON notes(share_code)", (indexErr) => {
            if (indexErr) {
                console.error("Failed to create share_code index: ", indexErr.message);
            }
        });
    };

    if (hasShareCodeColumn) {
        ensureShareCodeIndex();
        return;
    }

    db.run("ALTER TABLE notes ADD COLUMN share_code TEXT", (alterErr) => {
        if (alterErr) {
            console.error("Failed to add share_code column: ", alterErr.message);
            return;
        }

        ensureShareCodeIndex();
    });
});

db.run(`
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        isDone BOOLEAN,
        created_date TEXT DEFAULT (datetime('now'))
    )    
`);

app.set("trust proxy", 1);

app.use(express.json({ limit: "200kb" }));
app.use(cors({
    origin: clientOrigin,
    credentials: true
}));
app.use(session({
    name: "smartnotes.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: 1000 * 60 * 60 * 24
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
    if (!req.session || !Number.isInteger(req.session.userId) || req.session.userId <= 0) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    next();
}

app.post("/signup", authRateLimiter, (req, res) => {
    const email = normalizeAuthInput(req.body.email).toLowerCase();
    const username = normalizeAuthInput(req.body.username);
    const password = normalizeAuthInput(req.body.password);
    const date = new Date().toLocaleString();

    const validationError = validateAuthInput(email, username, password);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

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

            bcrypt.hash(password, 12, (hashErr, hashedPassword) => {
                if (hashErr) {
                    return res.status(500).json({ error: "Error hashing password" });
                }

                db.run(
                    "INSERT INTO users (email, username, password, created_date) VALUES (?, ?, ?, ?)",
                    [email, username, hashedPassword, date],
                    function (insertErr) {
                        if (insertErr) {
                            return res.status(500).json({ error: insertErr.message });
                        }

                        req.session.regenerate((sessionErr) => {
                            if (sessionErr) {
                                return res.status(500).json({ error: "Session initialization failed" });
                            }

                            req.session.userId = this.lastID;
                            clearAuthRateLimit(req);

                            res.json({
                                success: true,
                                message: "Signed up successfully",
                                id: this.lastID
                            });
                        });
                    }
                );
            });
        }
    );
});

app.post("/login", authRateLimiter, (req, res) => {
    const email = normalizeAuthInput(req.body.email).toLowerCase();
    const username = normalizeAuthInput(req.body.username);
    const password = normalizeAuthInput(req.body.password);
    
    if (!email || !username || !password) {
        return res.status(400).json({ error: "Email, username and password are required." });
    }

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

            bcrypt.compare(password, user.password, (compareErr, result) => {
                if (compareErr) {
                    return res.status(500).json({ error: "Error comparing passwords" });
                }
                if (!result) {
                    return res.status(401).json({ success: false, message: "Invalid credentials" });
                }

                req.session.regenerate((sessionErr) => {
                    if (sessionErr) {
                        return res.status(500).json({ error: "Session initialization failed" });
                    }

                    req.session.userId = user.id;
                    clearAuthRateLimit(req);

                    res.json({
                        success: true,
                        user: { id: user.id, email: user.email, username: user.username }
                    });
                });
            });
        }
    );
});

app.post("/logout", requireAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Logout failed" });
        }
        res.clearCookie("smartnotes.sid");
        res.json({ success: true });
    });
});

app.post("/generate-share-code", requireAuth, writeRateLimiter, (req, res) => {
    generateUniqueShareCode((err, shareCode) => {
        if (err) {
            return res.status(500).json({ error: "Failed to generate share code" });
        }

        res.json({ shareCode });
    });
});

app.get("/notes", requireAuth, (req, res) => {
    const userId = req.session.userId;

    db.all("SELECT *, CASE WHEN user_id = ? THEN 1 ELSE 0 END AS is_owner FROM notes WHERE user_id = ? AND private = 0 AND shared_user IS NULL ORDER BY created_date DESC", [userId, userId], (err, rows) => {
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
            `SELECT *,
                    CASE WHEN user_id = ? THEN 1 ELSE 0 END AS is_owner
             FROM notes 
             WHERE private = 0
             AND (
                (user_id = ? AND share_code IS NOT NULL AND share_code != '')
                OR
                (shared_user IS NOT NULL AND shared_user != '' AND shared_user LIKE ?)
             )
             ORDER BY created_date DESC`,
            [userId, userId, `%${username}%`],
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json(rows);
            }
        );
    });
});

app.post("/accept-share-code", requireAuth, writeRateLimiter, (req, res) => {
    const userId = req.session.userId;
    const normalizedShareCode = String(req.body?.shareCode || "").trim().toUpperCase();
    const shareCodeValidationError = validateShareCode(normalizedShareCode);

    if (shareCodeValidationError) {
        return res.status(400).json({ error: shareCodeValidationError });
    }

    db.get("SELECT username FROM users WHERE id = ?", [userId], (userErr, currentUser) => {
        if (userErr) {
            return res.status(500).json({ error: "Database error: " + userErr.message });
        }

        if (!currentUser) {
            return res.status(404).json({ error: "Current user not found" });
        }

        db.get("SELECT * FROM notes WHERE share_code = ? AND private = 0", [normalizedShareCode], (noteErr, note) => {
            if (noteErr) {
                return res.status(500).json({ error: "Database error: " + noteErr.message });
            }

            if (!note) {
                return res.status(404).json({ error: "Share code could not be found." });
            }

            if (note.user_id === userId) {
                return res.status(400).json({ error: "You already own this shared note." });
            }

            const sharedUsers = parseSharedUsers(note.shared_user);
            if (sharedUsers.includes(currentUser.username)) {
                return res.status(400).json({ error: "This shared note is already in your list." });
            }

            db.get("SELECT username FROM users WHERE id = ?", [note.user_id], (ownerErr, owner) => {
                if (ownerErr) {
                    return res.status(500).json({ error: "Database error: " + ownerErr.message });
                }

                const updatedSharedUsers = buildSharedUsersValue([
                    owner?.username,
                    ...sharedUsers,
                    currentUser.username
                ]);

                db.run(
                    "UPDATE notes SET shared_user = ? WHERE id = ?",
                    [updatedSharedUsers, note.id],
                    function (updateErr) {
                        if (updateErr) {
                            return res.status(500).json({ error: updateErr.message });
                        }

                        res.json({ message: "Shared note added successfully." });
                    }
                );
            });
        });
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

    db.all("SELECT *, 1 AS is_owner FROM notes WHERE user_id = ? AND private = 1 ORDER BY created_date DESC", [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get("/edit-note/:id", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const note_id = req.params;

    const parsedNoteId = parsePositiveInt(note_id.id);
    if (!parsedNoteId) {
        return res.status(400).json({ error: "Invalid note id" });
    }

    db.get("SELECT username FROM users WHERE id = ?", [userId], function (userErr, currentUser) {
        if (userErr) {
            return res.status(500).json({ error: "Database error: " + userErr.message });
        }

        if (!currentUser) {
            return res.status(404).json({ error: "Current user not found" });
        }

        db.all(
            "SELECT * FROM notes WHERE id = ? AND (user_id = ? OR (shared_user IS NOT NULL AND shared_user != '' AND shared_user LIKE ?))",
            [parsedNoteId, userId, `%${currentUser.username}%`],
            function (err, rows) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json(rows);
            }
        );
    });
});

app.post("/edit-note-submit", requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { noteId, title, content, category, color, isPrivate } = req.body;
    const date = new Date().toLocaleString();

    const parsedNoteId = parsePositiveInt(noteId);
    if (!parsedNoteId) {
        return res.status(400).json({ error: "Invalid note id" });
    }

    const noteValidationError = validateNoteInput(title, content, category, color);
    if (noteValidationError) {
        return res.status(400).json({ error: noteValidationError });
    }

    db.run(
        "UPDATE notes SET title = ?, content = ?, category = ?, color = ?, private = ?, created_date = ?, share_code = NULL, shared_user = NULL WHERE id = ? AND user_id = ?",
        [String(title).trim(), String(content || "").trim(), String(category || "").trim(), String(color || "").trim(), isPrivate ? 1 : 0, date, parsedNoteId, userId],
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
    const { noteId, title, content, category, color, shareCode, isPrivate } = req.body;
    const date = new Date().toLocaleString();
    const parsedNoteId = parsePositiveInt(noteId);

    if (!parsedNoteId) {
        return res.status(400).json({ error: "Invalid note id" });
    }

    const noteValidationError = validateNoteInput(title, content, category, color);
    if (noteValidationError) {
        return res.status(400).json({ error: noteValidationError });
    }

    const shareCodeValidationError = validateShareCode(shareCode);
    if (shareCodeValidationError) {
        return res.status(400).json({ error: shareCodeValidationError });
    }

    const normalizedShareCode = String(shareCode || "").trim().toUpperCase();
    
    db.get("SELECT username FROM users WHERE id = ?", [userId], function (userErr, currentUser) {
        if (userErr) {
            return res.status(500).json({ error: "Database error: " + userErr.message });
        }

        if (!currentUser) {
            return res.status(404).json({ error: "Current user not found" });
        }

        db.get(
            "SELECT * FROM notes WHERE id = ? AND (user_id = ? OR (shared_user IS NOT NULL AND shared_user != '' AND shared_user LIKE ?))",
            [parsedNoteId, userId, `%${currentUser.username}%`],
            function (err, note) {
                if (err) {
                    return res.status(500).json({ error: "Database error: " + err.message });
                }

                if (!note) {
                    return res.status(404).json({ error: "Note not found" });
                }

                const isOwner = note.user_id === userId;
                if (!isOwner && isPrivate) {
                    return res.status(403).json({ error: "Only the owner can make a shared note private." });
                }

                const nextPrivateValue = isOwner && isPrivate ? 1 : 0;
                const nextShareCode = isOwner && isPrivate ? null : normalizedShareCode;
                const nextSharedUsers = isOwner && isPrivate ? null : note.shared_user;

                db.run(
                    "UPDATE notes SET title = ?, content = ?, category = ?, color = ?, private = ?, created_date = ?, share_code = ?, shared_user = ? WHERE id = ?",
                    [
                        String(title).trim(),
                        String(content || "").trim(),
                        String(category || "").trim(),
                        String(color || "").trim(),
                        nextPrivateValue,
                        date,
                        nextShareCode,
                        nextSharedUsers,
                        parsedNoteId
                    ],
                    function (updateErr) {
                        if (updateErr) {
                            return res.status(500).json({ error: updateErr.message });
                        }

                        consumeReservedShareCode(normalizedShareCode);
                        res.json({ message: "Note updated successfully", id: parsedNoteId });
                    }
                );
            }
        );
    });
});

app.delete("/delete-note/:id", requireAuth, (req, res) => {
    const noteId = req.params.id;
    const userId = req.session.userId;

    const parsedNoteId = parsePositiveInt(noteId);
    if (!parsedNoteId) {
        return res.status(400).json({ error: "Invalid note id" });
    }

    db.run("DELETE FROM notes WHERE id = ? AND user_id = ?", [parsedNoteId, userId], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Note deleted successfully. "});
    });
});

app.delete("/delete-todo/:id", requireAuth, (req, res) => {
    const todoId = req.params.id;
    const userId = req.session.userId;

    const parsedTodoId = parsePositiveInt(todoId);
    if (!parsedTodoId) {
        return res.status(400).json({ error: "Invalid todo id" });
    }
    
    db.run("DELETE FROM todos WHERE id = ? AND user_id = ?", [parsedTodoId, userId], function (err) {
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

app.post("/add-note", requireAuth, writeRateLimiter, (req, res) => {
    const userId = req.session.userId;
    const { title, content, category, color, isPrivate } = req.body;
    const date = new Date().toLocaleString();

    const noteValidationError = validateNoteInput(title, content, category, color);
    if (noteValidationError) {
        return res.status(400).json({ error: noteValidationError });
    }

    db.run(
        "INSERT INTO notes (user_id, title, content, category, color, private, created_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [userId, String(title).trim(), String(content || "").trim(), String(category || "").trim(), String(color || "").trim(), isPrivate ? 1 : 0, date],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Note added successfully", id: this.lastID });
        }
    );
});

app.post("/add-shared-note", requireAuth, writeRateLimiter, (req, res) => {
    const userId = req.session.userId;
    const { title, content, category, color, shareCode } = req.body;
    const date = new Date().toLocaleString();
    const noteValidationError = validateNoteInput(title, content, category, color);
    if (noteValidationError) {
        return res.status(400).json({ error: noteValidationError });
    }

    const shareCodeValidationError = validateShareCode(shareCode);
    if (shareCodeValidationError) {
        return res.status(400).json({ error: shareCodeValidationError });
    }

    const normalizedShareCode = String(shareCode || "").trim().toUpperCase();

    db.run(
        "INSERT INTO notes (user_id, title, content, category, color, private, created_date, share_code, shared_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)",
        [userId, String(title).trim(), String(content || "").trim(), String(category || "").trim(), String(color || "").trim(), 0, date, normalizedShareCode],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            consumeReservedShareCode(normalizedShareCode);
            res.json({ message: "Shared note created successfully", id: this.lastID, shareCode: normalizedShareCode });
        }
    );
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

app.post("/add-todo", requireAuth, writeRateLimiter, (req, res) => {
    const userId = req.session.userId;
    const { title } = req.body;
    const date = new Date().toLocaleString();
    const isDone = 0;

    const todoValidationError = validateTextField(title, "Title", 1, 50);
    if (todoValidationError) {
        return res.status(400).json({ error: todoValidationError });
    }

    db.run(
        "INSERT INTO todos (user_id, title, isDone, created_date) VALUES (?, ?, ?, ?)",
        [userId, String(title).trim(), isDone, date],
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

    const normalizedPassword = String(password || "").trim();
    if (!normalizedPassword) {
        return res.status(400).json({ error: "Password is required." });
    }

    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error: " + err.message });
        }
        if (!row) {
            return res.status(404).json({ success: false });
        }

        bcrypt.compare(normalizedPassword, row.password, (compareErr, result) => {
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

    const parsedCategoryIndex = Number.parseInt(category_index, 10);
    if (!Number.isInteger(parsedCategoryIndex) || parsedCategoryIndex < 0) {
        return res.status(400).json({ error: "Invalid category index" });
    }

    const categoryValidationError = validateCategoryName(newName);
    if (categoryValidationError) {
        return res.status(400).json({ error: categoryValidationError });
    }

    db.get("SELECT categories FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "User not found" });
        }

        let categories = JSON.parse(row.categories);
        if (parsedCategoryIndex < 0 || parsedCategoryIndex >= categories.length) {
            return res.status(400).json({ error: "Invalid category index" });
        }

        categories[parsedCategoryIndex] = String(newName).trim();

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

    const categoryValidationError = validateCategoryName(name);
    if (categoryValidationError) {
        return res.status(400).json({ error: categoryValidationError });
    }

    const normalizedCategoryName = String(name).trim();

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

        if (categories.includes(normalizedCategoryName)) {
            return res.status(400).json({ error: "This category already exists!" });
        }
        
        categories.push(normalizedCategoryName);

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

    const parsedCategoryIndex = Number.parseInt(category_index, 10);
    if (!Number.isInteger(parsedCategoryIndex) || parsedCategoryIndex < 0) {
        return res.status(400).json({ error: "Invalid category index" });
    }

    db.get("SELECT categories FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "User not found" });
        }

        let categories = JSON.parse(row.categories);
        if (parsedCategoryIndex < 0 || parsedCategoryIndex >= categories.length) {
            return res.status(400).json({ error: "Invalid category index" });
        }

        categories.splice(parsedCategoryIndex, 1);

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
