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

const sharedNotesBtn = document.getElementById("sharedNotesBtn");
const tableHeader = document.getElementById("tableHeader");
const createNoteBtn = document.getElementById("createNoteBtn");

const categoryTh = document.getElementById("category");

let currentPage = 1;

let hiddenNotesShow = false;
let sharedNotesShow = false;

let notesData = [];
let sortField = null;
let sortDirection = "asc";
let displayedNotes = [];

if (localStorage.getItem("theme") === "dark") {
    table.classList.add("table-dark");
    hiddenNotesBtn.classList = "btn btn-danger";
    settingsBtn.classList = "btn btn-info";
} else {
    table.classList.remove("table-dark");
}

document.addEventListener('DOMContentLoaded', () => {
    const username = "asd";

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
    tableHeader.innerText = sharedNotesShow ? "Shared Notes" : "My Notes";
    createNoteBtn.innerText = sharedNotesShow ? "Create a Shared Note" : "Create Note";
    
    if (createNoteBtn.innerText == "Create a Shared Note") {
        createNoteBtn.classList.add("share");
    } else {
        createNoteBtn.classList.remove("share");
    }

    renderNotes();
});

document.getElementById("searchInput").addEventListener("input", function () {
    const input = this.value.toLowerCase();
    console.log(input);

    const filteredNotes = notesData.filter(note => 
        note.title.toLowerCase().includes(input)
    );

    displayedNotes = filteredNotes;
    drawNotes(displayedNotes);
});

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
    
    fetch(`http://localhost:3000/${path}`)
        .then(response => response.json())
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
            index = 9 * (currentPage - 1);
        notes.slice(index, 9 * currentPage).forEach(item => {
            const row = document.createElement("tr");
            if (!sharedNotesShow) {
                categoryTh.innerHTML = `<i class="fa-solid fa-layer-group" style="color: #74C0FC;"></i> Category`;
                row.innerHTML = `
                    <td>${item.title}</td>
                    <td>${item.category}</td>
                    <td>${item.created_date}</td>
                    <td class="d-flex justify-content-center gap-3">
                        <button type="button" class="btn btn-info btn-sm viewNoteBtn" data-id="${item.id}">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-success btn-sm editNoteBtn" data-id="${item.id}">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn btn-danger btn-sm deleteNoteBtn" data-id="${item.id}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                `;
            } else {
                categoryTh.innerHTML = `<i class="fa-solid fa-person" style="color: #74C0FC;"></i> Users`;
                row.innerHTML = `
                    <td>${item.title}</td>
                    <td>${item.shared_user.split(",")[0]} & ${item.shared_user.split(",")[1]}</td>
                    <td>${item.created_date}</td>
                    <td class="d-flex justify-content-center gap-3">
                        <button type="button" class="btn btn-info btn-sm viewNoteBtn" data-id="${item.id}">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-success btn-sm editNoteBtn" data-id="${item.id}">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button type="button" class="btn btn-danger btn-sm deleteNoteBtn" data-id="${item.id}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                `;
            }

            const deleteNoteBtn = row.querySelector(".deleteNoteBtn");
            deleteNoteBtn.addEventListener("click", function() {
                const confirmation = window.confirm("Are you sure you want to delete this note?");
                if (confirmation) {
                    fetch(`http://localhost:3000/delete-note/${item.id}`, { method: "DELETE" })
                        .then(response => response.json())
                        .then(() => {
                            alert("Note deleted.");
                            renderNotes();
                        })
                        .catch(err => console.error("Error:", err));
                }
            });

            const editNoteBtn = row.querySelector(".editNoteBtn");
            editNoteBtn.addEventListener("click", function() {
                window.location.href = `editnotepage.html?id=${item.id}`;
            });

            tbody.appendChild(row);
        });
        const tfoot = document.createElement("tfoot");
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.style.textAlign = "center";
        cell.textContent = `${notesData.length} notes listed`;
        row.appendChild(cell);
        tfoot.appendChild(row);
        table.appendChild(tfoot);
    }
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

    fetch(`http://localhost:3000/todos`)
        .then(response => response.json())
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
                .then(res => res.json())
                .then(data => console.log("Updated:", data))
                .catch(err => {
                    console.error("Error:", err);
                    checkbox.checked = !isChecked;
                    span.classList.toggle("line-through", !isChecked);
                });
            });

            const deleteTodoBtn = row.querySelector(".deleteTodoBtn");
            deleteTodoBtn.addEventListener("click", function() {
                fetch(`http://localhost:3000/delete-todo/${item.id}`, { method: "DELETE" })
                    .then(response => response.json())
                    .then(() => {
                        renderNotes();
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

        if (hiddenNotesShow) {
            hiddenNotesBtn.innerText = "View All Notes";
            hiddenNotesBtn.className = "btn btn-outline-success";
        } else {
            hiddenNotesBtn.innerText = "View Hidden Notes";
            hiddenNotesBtn.className = "btn btn-outline-danger";
        }
    
        renderNotes();
    } else {
        window.location.href = "hiddennotesverification.html";
    }
});

document.getElementById("createNoteBtn").addEventListener("click", function(e) {
    window.location.href = "createnotepage.html";
});

document.getElementById("addTodo").addEventListener("click", function (e) {
    if (todosData.length == 6) {
        alert("You've reached task limit!");
    } else {
        let title = prompt("Enter task: ");
        if (title.length > 50) {
            alert("Task cannot be longer than 50 characters");
        } else {
            if (title && title.trim() !== "") {
                fetch(`http://localhost:3000/add-todo`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: title.trim() })
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => { throw new Error(err.error); });
                    }
                    return response.json();
                })
                .then(data => {
                    // alert("Task added successfully!");
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
    window.location.href = "loginpage.html"; 
});

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', function (e) {
        const viewBtn = e.target.closest('.viewNoteBtn');
        if (viewBtn) {
            const noteId = viewBtn.getAttribute('data-id');
            showNoteModal(noteId);
        }
    });

    const modal = document.getElementById("noteModal");
    // const closeBtn = document.getElementById("closeNoteModal");

    // closeBtn.onclick = function () {
    //     modal.style.display = "none";
    // };

    function showNoteModal(id) {
        const note = getNodeById(id);
        const color = (note) => {
            const colors = {
                Gray: "rgba(192, 192, 192, 0.822)",
                Yellow: "#faffcc",
                Blue: "#a1afff",
                Red: "#ffb3b3",
                Pink: "#ffb0ff"
            };
            return colors[note.color] || "#ffffff";
        };

        const noteColor = color(note);
        const modal = document.getElementById("noteModal");
        const modalContent = document.getElementById("noteModalContent");
        
        document.getElementById("noteContent").innerHTML = `
            <div class="preview-homepage" style="background-color:${noteColor}">
                <div class="form-group">
                    <p id="preview-title"><i class="fa-solid fa-heading" style="color:rgb(255, 255, 255); margin-top: 3px; margin-right: 5px;"></i> ${note.title}</p>
                </div>
                <hr>
                <div class="form-group">
                    <div id="preview-content" class="preview-box">${note.content}</div>
                </div>           
                
                <div class="form-group d-flex justify-content-between">
                    <p id="preview-category"><i class="fa-solid fa-layer-group" style="color:rgb(255, 255, 255); margin-top: 3px; margin-right: 7px;"></i>${note.category}</p>
                </div>
            </div>
        `;

        modal.style.display = "block";
        modalContent.classList.remove("fade-out");
        modalContent.classList.add("fade-in");

        
        window.onclick = function (event) {
            if (event.target === modal) {
                modalContent.classList.remove("fade-in");
                modalContent.classList.add("fade-out");
                
                setTimeout(() => {
                    modal.style.display = "none";
                    modalContent.classList.remove("fade-out");
                }, 300);
            }
        };
    }

    function getNodeById(id) {
        return notesData.find(n => n.id == id);
    }
});