const form = document.getElementById("form");
const title = document.getElementById("title");
const content = document.getElementById("content");
const color = document.getElementById("color");
const checkbox = document.getElementById("checkbox");
const contentLength = document.getElementById("content-length");
const contentWords = document.getElementById("content-words");

const previewBox = document.getElementById("previewSurface");
const previewTitle = document.getElementById("preview-title");
const previewContent = document.getElementById("preview-content");
const previewCategory = document.getElementById("preview-category");
const previewHidden = document.getElementById("preview-hidden");

const suggestTitleBtn = document.getElementById("suggestTitleBtn");
const titleSuggestionsBox = document.getElementById("titleSuggestionsBox");
const titleSuggestionsList = document.getElementById("titleSuggestionsList");

const urlParams = new URLSearchParams(window.location.search);
const noteId = urlParams.get("id");

const categoriesSelectBox = document.getElementById("category");

const noteCount = document.getElementById("note-count");
const favCategory = document.getElementById("fav-category");

const buttonShare = document.getElementById("buttonShare");
const inputShare = document.getElementById("inputShare");
const shareCode = document.getElementById("shareCode");
const copyShareCodeBtn = document.getElementById("copyShareCodeBtn");
const shareFeedback = inputShare.querySelector("div:last-child");

let noteSuccessTitle = false;
let shareEnabled = false;

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

function renderTitleSuggestions(suggestions) {
    titleSuggestionsList.innerHTML = "";

    suggestions.forEach((suggestion) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-outline-secondary editor-ai-suggestion-btn";
        button.textContent = suggestion;

        button.addEventListener("click", () => {
            title.value = suggestion;
            previewTitle.innerHTML = suggestion;
            titleSuggestionsBox.style.display = "none";
        });

        titleSuggestionsList.appendChild(button);
    });

    titleSuggestionsBox.style.display = suggestions.length > 0 ? "block" : "none";
}

function renderCategories() {
    categoriesSelectBox.innerHTML = "";

    fetchJson("http://localhost:3000/get-categories")
        .then(categories => {
            categories.forEach((item) => {
                const option = document.createElement("option");
                option.value = item;
                option.textContent = item;
                categoriesSelectBox.appendChild(option);
            });
        })
        .catch(err => console.error("Error fetching categories:", err));
}

renderCategories();

function renderInfo() {
    
    fetchJson("http://localhost:3000/get-note-count")
        .then(count => {
            noteCount.innerHTML = count["COUNT(id)"];
        })
        .catch(err => console.error("Error fetching note count:", err));

    fetchJson("http://localhost:3000/get-fav-category")
        .then(category => {
            favCategory.innerHTML = category["MAX(category)"] || "None";
        })   
        .catch(err => console.error("Error fetching favourite category:", err));
}

renderInfo();

function getNote() {
    const id = noteId;

    fetchJson(`http://localhost:3000/edit-note/${id}`)
        .then(data => {
            if (data.length > 0) {
                const note = data[0];

                title.value = note.title;
                previewTitle.innerHTML = title.value.trim() === "" ? "..." : title.value;

                content.value = note.content;
                loadContent();

                checkbox.checked = note.private ? true : false;
                updatePreviewVisibilityBadge();
                categoriesSelectBox.value = note.category;
                color.value = note.color;
                previewCategory.innerHTML = note.category;
                if (note.share_code) {
                    shareEnabled = true;
                    inputShare.style.display = "block";
                    shareCode.value = note.share_code;
                    shareCode.classList.add("is-valid");
                    copyShareCodeBtn.disabled = false;
                    buttonShare.classList.add("active");
                }
                
                changeColor(color.options[color.selectedIndex].text);
                updatePreviewVisibilityBadge();
            } else {
                alert("Note cannot be found.");
                window.location.href = "homepage.html";
            }
        })
        .catch(error => console.error("Error: ", error));
}

getNote();

function error(input, message) {
    input.classList.add("is-invalid");
    input.classList.remove("is-valid");
    const div = input.nextElementSibling;
    div.innerText = message;
    div.className = "invalid-feedback";
}

function success(input) {
    input.classList.add("is-valid");
    input.classList.remove("is-invalid");
}

function checkRequired(input) {
    if (input.value === "") {
        error(input, `Title is required!`);
        noteSuccessTitle = false;
    } else {
        success(title);
        noteSuccessTitle = true;
    }
}

title.addEventListener("input", function () {
    previewTitle.innerHTML = title.value.trim() === "" ? "..." : title.value;
});

suggestTitleBtn.addEventListener("click", async function () {
    try {
        suggestTitleBtn.disabled = true;
        suggestTitleBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Thinking`;

        const data = await fetchJson("http://localhost:3000/ai/suggest-title", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title.value.trim(),
                content: content.value.trim()
            })
        });

        renderTitleSuggestions(data.suggestions || []);
    } catch (error) {
        console.error("AI title suggestion error:", error);
        alert(error.message);
    } finally {
        suggestTitleBtn.disabled = false;
        suggestTitleBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Suggest Title`;
    }
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

    previewContent.innerHTML = content.value.trim() === ""
        ? `<span class="note-preview-card__empty">Start writing to preview the body of your note.</span>`
        : content.value.replace(/\n/g, "<br>");
}

function updatePreviewVisibilityBadge() {
    if (checkbox.checked) {
        previewHidden.innerHTML = `<i class="fa-solid fa-lock"></i> Private`;
    } else if (shareEnabled) {
        previewHidden.innerHTML = `<i class="fa-solid fa-share-nodes"></i> Shared`;
    } else {
        previewHidden.innerHTML = `Visible`;
    }
}

function setShareFeedback(message = "") {
    shareFeedback.innerText = message;
    shareFeedback.className = message ? "invalid-feedback d-block" : "";
}

function resetShareState() {
    shareEnabled = false;
    inputShare.style.display = "none";
    shareCode.value = "";
    shareCode.classList.remove("is-valid", "is-invalid");
    setShareFeedback("");
    copyShareCodeBtn.disabled = true;
    buttonShare.classList.remove("active");
    updatePreviewVisibilityBadge();
}

async function createShareCode() {
    const data = await fetchJson("http://localhost:3000/generate-share-code", {
        method: "POST"
    });

    shareEnabled = true;
    inputShare.style.display = "block";
    shareCode.value = data.shareCode;
    shareCode.classList.add("is-valid");
    shareCode.classList.remove("is-invalid");
    setShareFeedback("");
    copyShareCodeBtn.disabled = false;
    buttonShare.classList.add("active");
    updatePreviewVisibilityBadge();
}

categoriesSelectBox.addEventListener("change", function () {
    let selectedText = categoriesSelectBox.options[categoriesSelectBox.selectedIndex].text;
    previewCategory.innerHTML = selectedText;
});

color.addEventListener("change", function () {
    let selectedColor = color.options[color.selectedIndex].text;
    changeColor(selectedColor);
});

function changeColor(selectedColor) {
    let colorValue = "#ffffff";

    switch (selectedColor) {
        case "Gray":
            colorValue = "rgba(192, 192, 192, 0.822)";
            break;
        case "Yellow":
            colorValue = "#faffcc";
            break;
        case "Blue":
            colorValue = "#a1afff";
            break;
        case "Red":
            colorValue = "#ffb3b3";
            break;
        case "Pink":
            colorValue = "#ffb0ff";
            break;
        default:
            colorValue = "#ffffff";
            break;
    }

    previewBox.style.setProperty("--preview-accent", colorValue);
    previewBox.style.backgroundColor = colorValue;
}

checkbox.addEventListener("change", function () {
    if (this.checked) {
        resetShareState();
    }

    updatePreviewVisibilityBadge();
});

buttonShare.addEventListener("click", async function () {
    if (checkbox.checked) {
        checkbox.checked = false;
    }

    if (shareEnabled) {
        resetShareState();
        return;
    }

    try {
        await createShareCode();
    } catch (err) {
        console.error("Error generating share code:", err);
        alert(err.message);
    }
});

copyShareCodeBtn.addEventListener("click", async function () {
    if (!shareCode.value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(shareCode.value);
        copyShareCodeBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;

        setTimeout(() => {
            copyShareCodeBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
        }, 1200);
    } catch (err) {
        console.error("Copy error:", err);
        alert("Share code could not be copied.");
    }
});

form.addEventListener("submit", async function(e) {
    e.preventDefault();

    checkRequired(title);

    if (shareEnabled && !shareCode.value.trim()) {
        shareCode.classList.add("is-invalid");
        setShareFeedback("Generate a share code first.");
        return;
    }

    if (noteSuccessTitle) {

        let path = !shareEnabled ? "edit-note-submit" : "edit-shared-note-submit";

        const noteData = {
            noteId: noteId,
            title: title.value,
            content: content.value,
            category: category.value,
            color: color.options[color.selectedIndex].text,
            isPrivate: checkbox.checked
        };

        if (shareEnabled) {
            noteData.shareCode = shareCode.value.trim();
        }

        fetchJson(`http://localhost:3000/${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(noteData)
        })
        .then(data => {
            alert(data.message);
            window.location.href = "homepage.html";
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
