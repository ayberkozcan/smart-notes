const form = document.getElementById("form");
const title = document.getElementById("title");
const content = document.getElementById("content");
const category = document.getElementById("category");
const checkbox = document.getElementById("checkbox");
const contentLength = document.getElementById("content-length");
const contentWords = document.getElementById("content-words");

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

content.addEventListener("input", function(e) {
    let words = content.value.trim().split(/\s+/);
    let charCount = content.value.length;
    let wordCount = words.length;

    contentLength.innerHTML = `${charCount} characters`;
    contentWords.innerHTML = `${wordCount} words`;
});

form.addEventListener("submit", function(e) {
    e.preventDefault();

    checkRequired(title);

    if (noteSuccess) {
        let date = new Date().toLocaleDateString();
        let time = new Date().toLocaleTimeString();
        console.log(date);
        console.log(time);
    }
});

document.getElementById("gobackBtn").addEventListener("click", function(e) {
    window.location.href = "homepage.html";
});