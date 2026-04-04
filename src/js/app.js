const table = document.getElementById("notesTable");
const tbody = document.getElementById("note-list");
const tbodyHidden = document.getElementById("hidden-note-list");
const hiddenNotesBtn = document.getElementById("hiddenNotesBtn");
const settingsBtn = document.getElementById("settingsBtn");
const logoutBtn = document.getElementById("logoutBtn");

const noteCount = document.getElementById("note-count");
const favCategory = document.getElementById("fav-category");

const previousPageBtn = document.getElementById("previousPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageNumber = document.getElementById("pageNumber");

const todoContent = document.getElementById("to-do-content");
const addTodo = document.getElementById("addTodo");

const welcomePopup = document.getElementById("welcomePopup");
const welcomePopupContent = document.getElementById("welcomePopupContent");

const addSharedCodeBtn = document.getElementById("addSharedCodeBtn");
const sharedNotesBtn = document.getElementById("sharedNotesBtn");
const tableHeader = document.getElementById("tableHeader");
const createNoteBtn = document.getElementById("createNoteBtn");
const shareCodeModal = document.getElementById("shareCodeModal");
const closeShareCodeModal = document.getElementById("closeShareCodeModal");
const submitSharedCodeBtn = document.getElementById("submitSharedCodeBtn");
const sharedCodeInput = document.getElementById("sharedCodeInput");
const shareCodeStatus = document.getElementById("shareCodeStatus");

const categoryTh = document.getElementById("category");

let currentPage = 1;

let hiddenNotesShow = false;
let sharedNotesShow = false;

let notesData = [];
let sortField = null;
let sortDirection = "asc";
let displayedNotes = [];
let todosData = [];
let displayedTodos = [];

function updateHiddenNotesButton() {
    if (hiddenNotesShow) {
        hiddenNotesBtn.innerHTML = `<i class="fa-solid fa-lock-open"></i>`;
        hiddenNotesBtn.className = "btn btn-outline-success home-quick-action-btn";
        hiddenNotesBtn.setAttribute("title", "View All Notes");
        hiddenNotesBtn.setAttribute("aria-label", "View all notes");
    } else {
        hiddenNotesBtn.innerHTML = `<i class="fa-solid fa-lock"></i>`;
        hiddenNotesBtn.className = "btn btn-outline-danger home-quick-action-btn";
        hiddenNotesBtn.setAttribute("title", "Hidden Notes");
        hiddenNotesBtn.setAttribute("aria-label", "Hidden notes");
    }
}

if (localStorage.getItem("theme") === "dark") {
    table.classList.add("table-dark");
    settingsBtn.classList = "btn btn-info";
} else {
    table.classList.remove("table-dark");
}

updateHiddenNotesButton();

function syncSharedNotesView() {
    tableHeader.innerText = sharedNotesShow ? "Shared Notes" : "My Notes";
    createNoteBtn.innerText = sharedNotesShow ? "Create a Shared Note" : "Create Note";

    if (sharedNotesShow) {
        createNoteBtn.classList.add("share");
    } else {
        createNoteBtn.classList.remove("share");
    }
}

function openShareCodeModal() {
    shareCodeModal.style.display = "flex";
    shareCodeStatus.textContent = "";
    shareCodeStatus.className = "share-code-modal__status";
    sharedCodeInput.value = "";
    setTimeout(() => sharedCodeInput.focus(), 0);
}

function closeShareCodeModalPopup() {
    shareCodeModal.style.display = "none";
    shareCodeStatus.textContent = "";
    shareCodeStatus.className = "share-code-modal__status";
}

document.addEventListener('DOMContentLoaded', () => {
    const savedUserData = JSON.parse(localStorage.getItem("userData"));
    const username = savedUserData?.username || "there";

    if (sessionStorage.getItem("welcomeShown")) {
        welcomePopup.style.display = "none";
    } else {
        welcomePopupContent.textContent = `Welcome ${username}!`;

        welcomePopup.style.display = "block";
        welcomePopup.classList.remove("fade-out");
        welcomePopup.classList.add("fade-in");

        setTimeout(() => {
            welcomePopup.classList.remove("fade-in");
            welcomePopup.classList.add("fade-out");
            setTimeout(() => {
                welcomePopup.style.display = "none";
            }, 300);
        }, 2000);

        sessionStorage.setItem("welcomeShown", "true");
    }
});

sharedNotesBtn.addEventListener("click", function () {
    sharedNotesShow = sharedNotesShow ? false : true;
    syncSharedNotesView();
    renderNotes();
});

addSharedCodeBtn.addEventListener("click", openShareCodeModal);
closeShareCodeModal.addEventListener("click", closeShareCodeModalPopup);
submitSharedCodeBtn.addEventListener("click", submitSharedCode);
sharedCodeInput.addEventListener("input", function () {
    this.value = this.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 10);
});
sharedCodeInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        submitSharedCode();
    }
});

document.getElementById("searchInput").addEventListener("input", function () {
    const input = this.value.toLowerCase();

    if (input === "") {
        displayedNotes = [...notesData];
        drawNotes(displayedNotes);
        return;
    }

    const filteredNotes = notesData
        .filter(note => note.title.toLowerCase().includes(input))
        .sort((a, b) => {
            const aTitle = a.title.toLowerCase();
            const bTitle = b.title.toLowerCase();

            const aStartsWith = aTitle.startsWith(input);
            const bStartsWith = bTitle.startsWith(input);

            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;

            return aTitle.localeCompare(bTitle);
        });

    displayedNotes = filteredNotes;
    drawNotes(displayedNotes);
});

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (response.status === 401) {
        localStorage.setItem("isVerified", "false");
        localStorage.removeItem("userData");
        sessionStorage.removeItem("welcomeShown");
        window.location.href = "loginpage.html";
        throw new Error("Unauthorized");
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

async function submitSharedCode() {
    const enteredCode = sharedCodeInput.value.trim().toUpperCase();

    if (!enteredCode) {
        shareCodeStatus.textContent = "Please enter a share code.";
        shareCodeStatus.className = "share-code-modal__status error";
        return;
    }

    try {
        const data = await fetchJson("http://localhost:3000/accept-share-code", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ shareCode: enteredCode })
        });

        shareCodeStatus.textContent = data.message || "Shared note added successfully.";
        shareCodeStatus.className = "share-code-modal__status success";
        sharedNotesShow = true;
        syncSharedNotesView();
        renderNotes();

        setTimeout(() => {
            closeShareCodeModalPopup();
        }, 700);
    } catch (error) {
        shareCodeStatus.textContent = error.message;
        shareCodeStatus.className = "share-code-modal__status error";
    }
}

function renderNotes() {
    tbody.innerHTML = "";

    let path = "";
    
    if (hiddenNotesShow) {
        path = "notes-private";
    } else {
        if (!sharedNotesShow) {
            path = "notes";
        } else {
            path = "notes-shared";
        }
    }
    
    fetchJson(`http://localhost:3000/${path}`)
        .then(notes => {
            notesData = notes;
            displayedNotes = [...notesData];
            drawNotes(notesData);
        })
        .catch(err => console.error("Error fetching notes:", err));
}

function drawNotes(notes) {
    const oldTfoot = table.querySelector("tfoot");
    if (oldTfoot) {
        table.removeChild(oldTfoot);
    }

    tbody.innerHTML = "";

    if (notes.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `<td colspan="4" class="text-center">No notes found!</td>`;
        tbody.appendChild(emptyRow);
    } else {
        let index = 0;
        if (currentPage != 1)
            index = 6 * (currentPage - 1);
        notes.slice(index, 6 * currentPage).forEach(item => {
            const row = document.createElement("tr");
            const noteColor = getNoteColor(item.color);
            const canDelete = Number(item.is_owner) === 1;
            const deleteButtonHtml = canDelete ? `
                        <button type="button" class="btn btn-danger btn-sm home-table-action deleteNoteBtn" data-id="${item.id}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
            ` : "";
            if (!sharedNotesShow) {
                categoryTh.innerHTML = `<i class="fa-solid fa-layer-group" style="color: #74C0FC;"></i> Category`;
                row.innerHTML = `
                    <td class="home-note-title-cell">
                        <span class="home-note-title-wrap">
                            <span class="home-note-color" style="background:${noteColor};"></span>
                            <span class="home-note-title">${item.title}</span>
                        </span>
                    </td>
                    <td>
                        <span class="home-note-tag">${item.category}</span>
                    </td>
                    <td class="home-note-date">${item.created_date}</td>
                    <td>
                        <div class="home-table-actions">
                        <button type="button" class="btn btn-info btn-sm home-table-action viewNoteBtn" data-id="${item.id}">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-success btn-sm home-table-action editNoteBtn" data-id="${item.id}">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        ${deleteButtonHtml}
                        </div>
                    </td>
                `;
            } else {
                categoryTh.innerHTML = `<i class="fa-solid fa-link" style="color: #74C0FC;"></i> Share Code`;
                row.innerHTML = `
                    <td class="home-note-title-cell">
                        <span class="home-note-title-wrap">
                            <span class="home-note-color" style="background:${noteColor};"></span>
                            <span class="home-note-title">${item.title}</span>
                        </span>
                    </td>
                    <td>
                        <span class="home-note-tag home-note-tag--shared">${item.share_code || "No code"}</span>
                    </td>
                    <td class="home-note-date">${item.created_date}</td>
                    <td>
                        <div class="home-table-actions">
                        <button type="button" class="btn btn-info btn-sm home-table-action viewNoteBtn" data-id="${item.id}">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-success btn-sm home-table-action editNoteBtn" data-id="${item.id}">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        ${deleteButtonHtml}
                        </div>
                    </td>
                `;
            }

            const deleteNoteBtn = row.querySelector(".deleteNoteBtn");
            if (deleteNoteBtn) {
                deleteNoteBtn.addEventListener("click", function() {
                    const confirmation = window.confirm("Are you sure you want to delete this note?");
                    if (confirmation) {
                        fetchJson(`http://localhost:3000/delete-note/${item.id}`, { method: "DELETE" })
                            .then(() => {
                                alert("Note deleted.");
                                renderNotes();
                            })
                            .catch(err => console.error("Error:", err));
                    }
                });
            }

            const editNoteBtn = row.querySelector(".editNoteBtn");
            editNoteBtn.addEventListener("click", function() {
                window.location.href = `editnotepage.html?id=${item.id}`;
            });

            row.addEventListener("click", function (event) {
                if (event.target.closest(".home-table-action")) {
                    return;
                }

                showNoteModal(item.id);
            });

            tbody.appendChild(row);
        });
        const tfoot = document.createElement("tfoot");
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.style.textAlign = "center";
        cell.textContent = `${notesData.length} notes total`;
        row.appendChild(cell);
        tfoot.appendChild(row);
        table.appendChild(tfoot);
    }
}

function getNoteColor(colorName) {
    const colors = {
        Gray: "rgba(192, 192, 192, 0.822)",
        Yellow: "#faffcc",
        Blue: "#a1afff",
        Red: "#ffb3b3",
        Pink: "#ffb0ff"
    };

    return colors[colorName] || "#ffffff";
}

function getNodeById(id) {
    return notesData.find(n => n.id == id);
}

function closeNoteModal() {
    const modal = document.getElementById("noteModal");
    const modalContent = document.getElementById("noteModalContent");

    modalContent.classList.remove("fade-in");
    modalContent.classList.add("fade-out");

    setTimeout(() => {
        modal.style.display = "none";
        modalContent.classList.remove("fade-out");
    }, 300);
}

function showNoteModal(id) {
    const modal = document.getElementById("noteModal");
    const modalContent = document.getElementById("noteModalContent");
    const note = getNodeById(id);

    if (!note) {
        return;
    }

    const noteColor = getNoteColor(note.color);
    const sharedUsers = note.shared_user
        ? note.shared_user.split(",").filter(Boolean).join(" / ")
        : "";
    const visibilityBadge = note.private
        ? "Private"
        : (note.share_code || sharedUsers ? "Shared" : "Visible");
    
    document.getElementById("noteContent").innerHTML = `
        <article class="note-preview-card home-note-preview-card" style="--preview-accent:${noteColor}; background-color:${noteColor};">
            <div class="note-preview-card__stripe"></div>
            <div class="note-preview-card__body">
                <div class="note-preview-card__header">
                    <div>
                        <p class="note-preview-card__eyebrow">Note Preview</p>
                        <h2 class="note-preview-card__title">${note.title}</h2>
                    </div>
                    <span class="note-preview-card__badge">${visibilityBadge}</span>
                </div>

                <div class="note-preview-card__meta">
                    <span class="note-preview-card__meta-item">
                        <i class="fa-solid fa-layer-group"></i>
                        ${note.category || "None"}
                    </span>
                    <span class="note-preview-card__meta-item">
                        <i class="fa-solid fa-calendar-days"></i>
                        ${note.created_date}
                    </span>
                    ${sharedUsers ? `
                    <span class="note-preview-card__meta-item">
                        <i class="fa-solid fa-user-group"></i>
                        ${sharedUsers}
                    </span>` : ""}
                </div>

                <div class="note-preview-card__content">
                    ${note.content && note.content.trim() !== "" ? note.content.replace(/\n/g, "<br>") : "<span class=\"note-preview-card__empty\">No content added.</span>"}
                </div>
            </div>
        </article>
    `;

    modal.style.display = "block";
    modalContent.classList.remove("fade-out");
    modalContent.classList.add("fade-in");

    window.onclick = function (event) {
        if (event.target === modal) {
            closeNoteModal();
        }
    };
}

function sortNotes(field) {
    if (sortField === field) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
        sortField = field;
        sortDirection = "asc";
    }

    displayedNotes = [...notesData].sort((a, b) => {
        if (a[field] < b[field]) return sortDirection === "asc" ? -1 : 1;
        if (a[field] > b[field]) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    drawNotes(displayedNotes);
}

document.querySelector("th:nth-child(1)").addEventListener("click", () => sortNotes("title"));
document.querySelector("th:nth-child(2)").addEventListener("click", () => sortNotes("category"));
document.querySelector("th:nth-child(3)").addEventListener("click", () => sortNotes("created_date"));

renderNotes();
renderToDos();

function renderToDos() {
    todoContent.innerHTML = "";

    fetchJson(`http://localhost:3000/todos`)
        .then(todos => {
            todosData = todos;
            displayedTodos = [...todosData];
            drawTodos(todosData);
        })
        .catch(err => console.error("Error fetching notes:", err));
}

function drawTodos(todos) {
    const todoContent = document.getElementById("to-do-content");
    todoContent.innerHTML = "";

    if (todos.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `<td colspan="1" class="text-center text-muted">No tasks found!</td>`;
        todoContent.appendChild(emptyRow);
    } else {
        todos.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center justify-content-between gap-2">
                        <div class="d-flex align-items-center gap-2">
                            <div class="form-check m-0">
                                <input class="form-check-input todoCheck" type="checkbox" role="switch" data-id="${item.id}" ${item.isDone == 1 ? "checked" : ""}>
                            </div>
                            <span class="${item.isDone == 1 ? "line-through" : ""}">${item.title}</span>
                        </div>
                    </div>
                </td>
                <td class="todo-action">
                    <button type="button" class="btn btn-outline-danger p-0 d-flex align-items-center justify-content-center rounded-circle deleteTodoBtn"
                            style="width: 20px; height: 20px; font-size: 10px;" data-id="${item.id}">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </td>
            `;

            const checkbox = row.querySelector('input[type="checkbox"]');
            const span = row.querySelector('span');

            checkbox.addEventListener("change", (e) => {
                const isChecked = checkbox.checked;
                span.classList.toggle("line-through", isChecked);

                fetch(`http://localhost:3000/task-toggle/${item.id}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        isDone: isChecked ? 1 : 0
                    })
                })
                .then(res => {
                    if (res.status === 401) {
                        localStorage.setItem("isVerified", "false");
                        localStorage.removeItem("userData");
                        sessionStorage.removeItem("welcomeShown");
                        window.location.href = "loginpage.html";
                        throw new Error("Unauthorized");
                    }

                    return res.json().then(data => {
                        if (!res.ok) {
                            throw new Error(data.error || "Request failed");
                        }

                        return data;
                    });
                })
                .then(data => console.log("Updated:", data))
                .catch(err => {
                    console.error("Error:", err);
                    checkbox.checked = !isChecked;
                    span.classList.toggle("line-through", !isChecked);
                });
            });

            const deleteTodoBtn = row.querySelector(".deleteTodoBtn");
            deleteTodoBtn.addEventListener("click", function() {
                fetchJson(`http://localhost:3000/delete-todo/${item.id}`, { method: "DELETE" })
                    .then(() => {
                        renderToDos();
                    })
                    .catch(err => console.error("Error:", err));
            });

            todoContent.appendChild(row);
        });
    }
}

hiddenNotesBtn.addEventListener("click", function(e) {
    if (localStorage.getItem('isVerified') === 'true') {
        hiddenNotesShow = !hiddenNotesShow;
        updateHiddenNotesButton();
    
        renderNotes();
    } else {
        window.location.href = "hiddennotesverify.html";
    }
});

document.getElementById("createNoteBtn").addEventListener("click", function(e) {
    window.location.href = "createnotepage.html";
});

document.getElementById("addTodo").addEventListener("click", function (e) {
    if (todosData.length == 9) {
        alert("You've reached task limit!");
    } else {
        let title = prompt("Enter task: ");
        if (title === null) {
            return;
        }
        if (title.length > 50) {
            alert("Task cannot be longer than 50 characters");
        } else {
            if (title && title.trim() !== "") {
                fetchJson(`http://localhost:3000/add-todo`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: title.trim() })
                })
                .then(data => {
                    renderToDos();
                })
                .catch(err => {
                    alert("Error: " + err.message);
                });
            }
        }
    }
});

previousPageBtn.addEventListener("click", function (e) {
    currentPage = currentPage == 1 ? 1 : currentPage -= 1; 
    pageNumber.innerHTML = currentPage;
    drawNotes(displayedNotes);
});

nextPageBtn.addEventListener("click", function (e) {
    if (notesData.length / (9 * currentPage) > 1) { 
        currentPage++;
    }
    pageNumber.innerHTML = currentPage;
    drawNotes(displayedNotes);
});

settingsBtn.addEventListener("click", function(e) {
    window.location.href = "settings.html";
});

logoutBtn.addEventListener("click", function(e) {
    localStorage.setItem('isVerified', 'false');
    localStorage.removeItem('userData');
    sessionStorage.removeItem("welcomeShown");

    fetch("http://localhost:3000/logout", {
        method: "POST"
    })
    .catch(err => console.error("Logout error:", err))
    .finally(() => {
        window.location.href = "loginpage.html";
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const closeModalBtn = document.getElementById("closeNoteModal");

    closeModalBtn.addEventListener("click", closeNoteModal);
    document.body.addEventListener("click", function (e) {
        const viewBtn = e.target.closest(".viewNoteBtn");
        if (viewBtn) {
            showNoteModal(viewBtn.getAttribute("data-id"));
        }
    });
    window.addEventListener("click", function (event) {
        if (event.target === shareCodeModal) {
            closeShareCodeModalPopup();
        }
    });
});
