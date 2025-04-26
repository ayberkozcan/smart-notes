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

const categoriesSelectBox = document.getElementById("category");

const noteCount = document.getElementById("note-count");
const favCategory = document.getElementById("fav-category");

const checkboxShare = document.getElementById("checkboxShare");
const inputShare = document.getElementById("inputShare");
const shareUsername = document.getElementById("shareUsername");

let noteSuccess = false;

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

            if (categories.length > 0) {
                previewCategory.textContent = categoriesSelectBox.options[0].textContent;
            }
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
        if (checkboxShare.checked && shareUsername.value === "") {
            error(shareUsername, `Username is required!`);
        } else {
            success(shareUsername);
        }
        noteSuccess = false;
    } else {
        success(title);
        if (checkboxShare.checked && shareUsername.value === "") {
            error(shareUsername, `Username is required!`);
            noteSuccess = false;
        } else {
            success(shareUsername);
            noteSuccess = true;
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
    let words = content.value.trim().split(/\s+/).filter(word => word.length > 0);
    let charCount = content.value.length;
    let wordCount = words.length;

    contentLength.innerHTML = `${charCount} characters`;
    contentWords.innerHTML = `${wordCount} words`;

    previewContent.innerHTML = content.value.trim() === "" ? "..." : content.value;
});

category.addEventListener("change", function () {
    previewCategory.innerText = category.value;
});

color.addEventListener("change", function () {
    let selectedColor = color.options[color.selectedIndex].text;

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
});

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
    
    if (checkboxShare.checked) {
        noteSuccess = await checkUsername(shareUsername.value);
    }

    checkRequired(title, 'Title');

    if (noteSuccess) {
        
        let path = !checkboxShare.checked ? "add-note" : "add-shared-note"; 

        const noteData = {
            title: title.value,
            content: content.value,
            category: category.value,
            color: color.options[color.selectedIndex].text,
            isPrivate: checkbox.checked
        };

        if (checkboxShare.checked) {
            noteData.shared = shareUsername.value;
        }

        fetch(`http://localhost:3000/${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(noteData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("An error occurred while adding the note!");
            }
            return response.json();
        })
        .then(data => {
            window.location.href = "homepage.html";
            alert(data.message);
        })
        .catch(error => {
            console.error("Error:", error);
            alert(error.message);
        });
    }
});

document.getElementById("gobackBtn").addEventListener("click", function(e) {
    window.location.href = "homepage.html";
});