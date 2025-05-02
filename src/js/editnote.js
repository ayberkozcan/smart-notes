const form = document.getElementById("form");
const title = document.getElementById("title");
const content = document.getElementById("content");
const color = document.getElementById("color");
const checkbox = document.getElementById("checkbox");
const contentLength = document.getElementById("content-length");
const contentWords = document.getElementById("content-words");

const previewBox = document.querySelector(".preview");
const previewTitle = document.getElementById("preview-title");
const previewContent = document.getElementById("preview-content");
const previewCategory = document.getElementById("preview-category");
const previewHidden = document.getElementById("preview-hidden");

const urlParams = new URLSearchParams(window.location.search);
const noteId = urlParams.get("id");

const categoriesSelectBox = document.getElementById("category");

const noteCount = document.getElementById("note-count");
const favCategory = document.getElementById("fav-category");

const checkboxShare = document.getElementById("checkboxShare");
const inputShare = document.getElementById("inputShare");
const shareUsername = document.getElementById("shareUsername");

let noteSuccessTitle = false;
let noteSuccessUsername = false;

function renderCategories() {
    categoriesSelectBox.innerHTML = "";

    fetch("http://localhost:3000/get-categories")
        .then(response => response.json())
        .then(categories => {
            categories.forEach(item => {
                let i = 1;
                const option = document.createElement("option");
                option.innerHTML = `
                    <option value="${i}">${item}</option>
                `;
                categoriesSelectBox.appendChild(option);
            });
        })
}

renderCategories();

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

function getNote() {
    const id = noteId;

    fetch(`http://localhost:3000/edit-note/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const note = data[0];

                title.value = note.title;
                previewTitle.innerHTML = title.value.trim() === "" ? "..." : title.value;

                content.value = note.content;
                loadContent();

                checkbox.checked = note.private ? true : false;
                previewHidden.innerHTML = checkbox.checked ? `<i class="fa-solid fa-lock" style="padding: 5px;"></i>` : ``;
                category.value = note.category;
                color.value = note.color;
                previewCategory.innerHTML = note.category
                
                changeColor(color.options[color.selectedIndex].text);
            } else {
                console.log("Note cannot be found.");
            }
        })
        .catch(error => console.error("Error: ", error));
}

getNote();

function error(input, message) {
    input.className = "form-control is-invalid";
    const div = input.nextElementSibling;
    div.innerText = message;
    div.className = "invalid-feedback";
}

function success(input) {
    input.className = "form-control is-valid"
}

function checkRequired(input) {
    if (input.value === "") {
        error(input, `Title is required!`);
        noteSuccessTitle = false;
    } else {
        success(title);
        noteSuccessTitle = true;
    }

    if (checkboxShare.checked) {
        if (shareUsername.value === "") {
            error(shareUsername, `Username is required!`);
            noteSuccessUsername = false;
        } else {
            success(shareUsername);
        }
    }
}

async function checkUsername(username) {
    try {
        const response = await fetch(`http://localhost:3000/check-username/${encodeURIComponent(username)}`);
        const data = await response.json();

        if (!data.found) {
            alert("User cannot be found!");
            return false;
        }
        
        return true;
    } catch (err) {
        console.error("Error fetching user:", err);
        return false;
    }
}

title.addEventListener("input", function () {
    previewTitle.innerHTML = title.value.trim() === "" ? "..." : title.value;
});

content.addEventListener("input", function () {
    loadContent();
});

function loadContent() {
    let words = content.value.trim().split(/\s+/).filter(word => word.length > 0);
    let charCount = content.value.length;
    let wordCount = words.length;

    contentLength.innerHTML = `${charCount} characters`;
    contentWords.innerHTML = `${wordCount} words`;

    previewContent.innerHTML = content.value.trim() === "" ? "..." : content.value;
}

category.addEventListener("change", function () {
    let selectedText = category.options[category.selectedIndex].text;
    previewCategory.innerHTML = selectedText;
});

color.addEventListener("change", function () {
    let selectedColor = color.options[color.selectedIndex].text;
    changeColor(selectedColor);
});

function changeColor(selectedColor) {
    switch (selectedColor) {
        case "Gray":
            previewBox.style.backgroundColor = "rgba(192, 192, 192, 0.822)";
            break;
        case "Yellow":
            previewBox.style.backgroundColor = "#faffcc";
            break;
        case "Blue":
            previewBox.style.backgroundColor = "#a1afff";
            break;
        case "Red":
            previewBox.style.backgroundColor = "#ffb3b3";
            break;
        case "Pink":
            previewBox.style.backgroundColor = "#ffb0ff";
            break;
        default:
            previewBox.style.backgroundColor = "#ffffff";
            break;
    }
}

checkbox.addEventListener("change", function () {
    if (this.checked) {
        checkboxShare.checked = false;
        inputShare.style.display = "none";
        document.getElementById("shareUsername").value = "";
    }

    previewHidden.innerHTML = this.checked
        ? `<i class="fa-solid fa-lock" style="padding: 5px;"></i>`
        : ``;
});

checkboxShare.addEventListener("change", function () {
    if (this.checked) {
        checkbox.checked = false;
        previewHidden.innerHTML = "";
        inputShare.style.display = "flex";
    } else {
        inputShare.style.display = "none";
        document.getElementById("shareUsername").value = "";
    }
});

form.addEventListener("submit", async function(e) {
    e.preventDefault();

    checkRequired(title);
    if (checkboxShare.checked && shareUsername.value !== "") {
        noteSuccessUsername = await checkUsername(shareUsername.value);
    } else if (checkboxShare.checked && shareUsername.value == "") {
        noteSuccessUsername = false;
    } else {
        noteSuccessUsername = true;
    }

    if (noteSuccessTitle && noteSuccessUsername) {

        let path = !checkboxShare.checked ? "edit-note-submit" : "edit-shared-note-submit"; 

        const noteData = {
            noteId: noteId,
            title: title.value,
            content: content.value,
            category: category.value,
            color: color.options[color.selectedIndex].text,
            isPrivate: checkbox.checked
        };

        if (checkboxShare.checked) {
            noteData.username = shareUsername.value;
        }

        console.log(noteData);

        fetch(`http://localhost:3000/${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(noteData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("An error occured while updating the note!");
            }
            window.location.href = "homepage.html";
            return response.json();
        })
        .then(data => {
            window.location.href = "homepage.html";
            alert(data.message);
        })
        .catch(error => {
            console.error("Error: ", error);
            alert(error.message);
        });
    }
});

document.getElementById("gobackBtn").addEventListener("click", function(e) {
    window.location.href = "homepage.html";
});