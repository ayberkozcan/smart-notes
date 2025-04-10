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

let currentPage = 1;

let hiddenNotesShow = false;

let notesData = [];
let sortField = null;
let sortDirection = "asc";

if (localStorage.getItem("theme") === "dark") {
    table.classList.add("table-dark");
    hiddenNotesBtn.classList = "btn btn-danger";
    settingsBtn.classList = "btn btn-info";
} else {
    table.classList.remove("table-dark");
}

function renderNotes() {
    tbody.innerHTML = "";

    let path = !hiddenNotesShow ? "notes" : "notes-private";

    fetch(`http://localhost:3000/${path}`)
        .then(response => response.json())
        .then(notes => {
            notesData = notes;

            drawNotes(notesData);
        })
        .catch(err => console.error("Error fetching notes:", err));
}

function drawNotes(notes) {
    tbody.innerHTML = "";

    if (notes.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `<td colspan="4" class="text-center">No notes found!</td>`;
        tbody.appendChild(emptyRow);
    } else {
        notes.forEach(item => {
            const row = document.createElement("tr");
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
    }
}

function sortNotes(field) {
    if (sortField === field) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
        sortField = field;
        sortDirection = "asc";
    }

    const sortedNotes = [...notesData].sort((a, b) => {
        if (a[field] < b[field]) return sortDirection === "asc" ? -1 : 1;
        if (a[field] > b[field]) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    drawNotes(sortedNotes);
}

document.querySelector("th:nth-child(1)").addEventListener("click", () => sortNotes("title"));
document.querySelector("th:nth-child(2)").addEventListener("click", () => sortNotes("category"));
document.querySelector("th:nth-child(3)").addEventListener("click", () => sortNotes("created_date"));

renderNotes();

function renderInfo() {
    
    fetch("http://localhost:3000/get-note-count")
        .then(response => response.json())
        .then(count => {
            noteCount.innerHTML = count["COUNT(id)"];
        })
        .catch(err => console.error("Error fetching note count:", err));

    fetch("http://localhost:3000/get-fav-category")
        .then(response => response.json())
        .then(category => {
            favCategory.innerHTML = category["MAX(category)"];
        })   
        .catch(err => console.error("Error fetching favourite category:", err));
}

renderInfo();

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

previousPageBtn.addEventListener("click", function (e) {
    currentPage = currentPage == 1 ? 1 : currentPage -= 1; 
    pageNumber.innerHTML = currentPage;
});

nextPageBtn.addEventListener("click", function (e) {
    if (parseFloat(noteCount.innerText) / (9 * currentPage) > 1) { // noteCount - hiddenNoteCount
        currentPage++;
    }
    pageNumber.innerHTML = currentPage;
});

settingsBtn.addEventListener("click", function(e) {
    window.location.href = "settings.html";
});

logoutBtn.addEventListener("click", function(e) {
    localStorage.setItem('isVerified', 'false');
    localStorage.removeItem('userData');
    window.location.href = "loginpage.html"; 
});