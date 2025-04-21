let theme = localStorage.getItem("theme") || "dark";

document.addEventListener("DOMContentLoaded", function () {
    if (theme === "light") {
        document.body.classList.add("bg-light", "text-dark");
        document.getElementById("themeToggle").innerText = "Switch to Dark Theme";
        document.getElementById("themeToggle").classList.replace("btn-light", "btn-dark");
    } else {
        document.body.classList.add("bg-dark", "text-light");
        document.getElementById("themeToggle").innerText = "Switch to Light Theme";
        document.getElementById("themeToggle").classList.replace("btn-dark", "btn-light");
    }
});

document.getElementById("themeToggle").addEventListener("click", function (e) {
    if (theme === "light") {
        theme = "dark";
        localStorage.setItem("theme", "dark");
        document.body.classList.replace("bg-light", "bg-dark");
        document.body.classList.replace("text-dark", "text-light");
        document.getElementById("themeToggle").innerText = "Switch to Light Theme";
        document.getElementById("themeToggle").classList.replace("btn-dark", "btn-light");
    } else {
        theme = "light";
        localStorage.setItem("theme", "light");
        document.body.classList.replace("bg-dark", "bg-light");
        document.body.classList.replace("text-light", "text-dark");
        document.getElementById("themeToggle").innerText = "Switch to Dark Theme";
        document.getElementById("themeToggle").classList.replace("btn-light", "btn-dark");
    }
});

document.getElementById("gobackBtn").addEventListener("click", function (e) {
    window.location.href = "homepage.html";
});

document.getElementById("friendsBtn").addEventListener("click", function (e) {
    window.location.href = "friends.html";
});

document.getElementById("manageCategoriesBtn").addEventListener("click", function (e) {
    window.location.href = "managecategories.html";
});

document.getElementById("deleteDataBtn").addEventListener("click", function () {
    let password = prompt("Enter your password: ");

    fetch(`http://localhost:3000/password-validation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() })
    })
    .then(response => {
        if(!response.ok) {
            return response.json().then(() => {
                alert("Wrong Password!");
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const confirmation = window.confirm("Are you sure you want to delete your all notes?\nThis action cannot be undone.");
        
            if (confirmation) {
                fetch("http://localhost:3000/delete-all-data", { method: "DELETE" })
                    .then(response => response.json())
                    .then(() => {
                        alert("All notes deleted.");
                    })
                    .catch(err => console.error("Error:", err));
            }
        } else {
            alert("Wrong Password!");
        }
    })
    .catch(err => {
        alert("Error: " + err.message);
    })
});