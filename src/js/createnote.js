// const { response } = require("express");

const form = document.getElementById("form");
const title = document.getElementById("title");
const content = document.getElementById("content");
const category = document.getElementById("category");
const color = document.getElementById("color");
const checkbox = document.getElementById("checkbox");
const contentLength = document.getElementById("content-length");
const contentWords = document.getElementById("content-words");

const previewBox = document.querySelector(".preview");
const previewTitle = document.getElementById("preview-title");
const previewContent = document.getElementById("preview-content");
const previewCategory = document.getElementById("preview-category");
const previewHidden = document.getElementById("preview-hidden");

let noteSuccess = false;

function error(input, message) {
    input.className = "form-control is-invalid";
    const div = input.nextElementSibling;
    div.innerText = message;
    div.className = "invalid-feedback";
}

function success(input) {
    input.className = "form-control is-valid"
}

function checkRequired(title) {  
    if (title.value === "") {
        error(title, `Title is required!`);
        noteSuccess = false;
    } else {
        success(title);
        noteSuccess = true;
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
    let selectedText = category.options[category.selectedIndex].text;
    previewCategory.innerHTML = selectedText;
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
    previewHidden.innerHTML = checkbox.checked ? `<i class="fa-solid fa-lock" style="padding: 5px;"></i>` : ``;
});

form.addEventListener("submit", function(e) {
    e.preventDefault();

    checkRequired(title);

    if (noteSuccess) {
        const noteData = {
            title: title.value,
            content: content.value,
            category: category.value,
            color: color.value,
            private: checkbox.checked
        };

        fetch("https://localhost:3000/add-note", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(noteData)
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            window.location.href("homepage.html");
        })
        .catch(error => console.error("Error:", error));
    }
});

document.getElementById("gobackBtn").addEventListener("click", function(e) {
    window.location.href = "homepage.html";
});