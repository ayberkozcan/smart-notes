import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const tempRoot = path.resolve(".tmp-tests");
await fs.mkdir(tempRoot, { recursive: true });
const tempDir = await fs.mkdtemp(path.join(tempRoot, "backend-"));
const dbFile = path.join(tempDir, "test-notes.db");

process.env.DB_PATH = dbFile;
process.env.SESSION_SECRET = "test-secret";
process.env.NODE_ENV = "test";

const serverModuleUrl = new URL(`../src/js/server.js?test=${Date.now()}`, import.meta.url);
const { app, dbReady, closeDatabase } = await import(serverModuleUrl);

await dbReady;

let server;
let baseUrl;
let cookieHeader = "";

function getSessionCookie(response) {
    const setCookieHeader = response.headers.get("set-cookie");
    return setCookieHeader ? setCookieHeader.split(";")[0] : "";
}

async function request(pathname, options = {}) {
    const headers = new Headers(options.headers || {});

    if (cookieHeader) {
        headers.set("Cookie", cookieHeader);
    }

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${baseUrl}${pathname}`, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const nextCookie = getSessionCookie(response);
    if (nextCookie) {
        cookieHeader = nextCookie;
    }

    return response;
}

test.before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    await closeDatabase();
    await fs.rm(tempDir, { recursive: true, force: true });
});

test("GET /notes returns 401 without session", async () => {
    const response = await request("/notes");
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.deepEqual(body, { error: "Unauthorized" });
});

test("POST /signup validates auth payload", async () => {
    const response = await request("/signup", {
        method: "POST",
        body: {
            email: "invalid-email",
            username: "demoUser",
            password: "password123"
        }
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "Invalid email format.");
});

test("signup creates a session and authenticated note flow works", async () => {
    cookieHeader = "";

    const signupResponse = await request("/signup", {
        method: "POST",
        body: {
            email: "demo@example.com",
            username: "demoUser",
            password: "password123"
        }
    });
    const signupBody = await signupResponse.json();

    assert.equal(signupResponse.status, 200);
    assert.equal(signupBody.success, true);
    assert.ok(cookieHeader.includes("smartnotes.sid="));

    const invalidAddResponse = await request("/add-note", {
        method: "POST",
        body: {
            title: "x".repeat(101),
            content: "test",
            category: "Work",
            color: "#ffffff",
            isPrivate: false
        }
    });
    const invalidAddBody = await invalidAddResponse.json();

    assert.equal(invalidAddResponse.status, 400);
    assert.equal(invalidAddBody.error, "Title cannot be longer than 100 characters.");

    const addResponse = await request("/add-note", {
        method: "POST",
        body: {
            title: "First note",
            content: "Body",
            category: "Work",
            color: "#ffffff",
            isPrivate: false
        }
    });
    const addBody = await addResponse.json();

    assert.equal(addResponse.status, 200);
    assert.equal(addBody.message, "Note added successfully");

    const notesResponse = await request("/notes");
    const notesBody = await notesResponse.json();

    assert.equal(notesResponse.status, 200);
    assert.equal(notesBody.length, 1);
    assert.equal(notesBody[0].title, "First note");
});

test("GET /edit-note/:id returns 403 for another user's private note", async () => {
    cookieHeader = "";

    const firstUserSignup = await request("/signup", {
        method: "POST",
        body: {
            email: "owner@example.com",
            username: "ownerUser",
            password: "password123"
        }
    });

    assert.equal(firstUserSignup.status, 200);

    const addResponse = await request("/add-note", {
        method: "POST",
        body: {
            title: "Owner private note",
            content: "Secret",
            category: "Work",
            color: "#ffffff",
            isPrivate: true
        }
    });
    const addBody = await addResponse.json();

    assert.equal(addResponse.status, 200);

    await request("/logout", { method: "POST" });
    cookieHeader = "";

    const secondUserSignup = await request("/signup", {
        method: "POST",
        body: {
            email: "viewer@example.com",
            username: "viewerUser",
            password: "password123"
        }
    });

    assert.equal(secondUserSignup.status, 200);

    const forbiddenResponse = await request(`/edit-note/${addBody.id}`);
    const forbiddenBody = await forbiddenResponse.json();

    assert.equal(forbiddenResponse.status, 403);
    assert.equal(forbiddenBody.error, "You do not have permission to view this note.");
});

test("GET /editnotepage.html redirects away for another user's private note", async () => {
    cookieHeader = "";

    const firstUserSignup = await request("/signup", {
        method: "POST",
        body: {
            email: "page-owner@example.com",
            username: "pageOwner",
            password: "password123"
        }
    });

    assert.equal(firstUserSignup.status, 200);

    const addResponse = await request("/add-note", {
        method: "POST",
        body: {
            title: "Hidden page note",
            content: "Secret",
            category: "Work",
            color: "#ffffff",
            isPrivate: true
        }
    });
    const addBody = await addResponse.json();

    assert.equal(addResponse.status, 200);

    await request("/logout", { method: "POST" });
    cookieHeader = "";

    const secondUserSignup = await request("/signup", {
        method: "POST",
        body: {
            email: "page-viewer@example.com",
            username: "pageViewer",
            password: "password123"
        }
    });

    assert.equal(secondUserSignup.status, 200);

    const pageResponse = await request(`/editnotepage.html?id=${addBody.id}`, {
        redirect: "manual"
    });

    assert.equal(pageResponse.status, 302);
    assert.equal(pageResponse.headers.get("location"), "/homepage.html");
});
