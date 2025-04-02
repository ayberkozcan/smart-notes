const table = document.getElementById("notesTable");
const tbody = document.getElementById("note-list");
const tbodyHidden = document.getElementById("hidden-note-list");
const hiddenNotesBtn = document.getElementById("hiddenNotesBtn");
const settingsBtn = document.getElementById("settingsBtn");

const noteCount = document.getElementById("note-count");
const favCategory = document.getElementById("fav-category");

let hiddenNotesShow = false;

if (localStorage.getItem("theme") === "dark") {
    table.classList.add("table-dark");
    hiddenNotesBtn.classList = "btn btn-danger";
    settingsBtn.classList = "btn btn-info";
} else {
    table.classList.remove("table-dark");
}

// Temporary (need verification using backend)

let hiddenNotes = [
    { title: "My Hidden Note", category: "Personal", date: "17.03.2025" }
];

function renderNotes() {
    tbody.innerHTML = "";

    fetch("http://localhost:3000/notes")
        .then(response => response.json())
        .then(notes => {
            notes.forEach(item => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${item.title}</td>
                    <td>${item.category}</td>
                    <td>${item.created_date}</td>
                    <td class="d-flex justify-content-center gap-3">
                        <button type="button" class="btn btn-info btn-sm editNoteBtn" data-id="${item.id}">
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
        })
        .catch(err => console.error("Error fetching notes:", err));
}

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

settingsBtn.addEventListener("click", function(e) {
    window.location.href = "settings.html";
});