let theme = localStorage.getItem("theme") || "dark";

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (response.status === 401) {
        localStorage.setItem("isVerified", "false");
        localStorage.removeItem("userData");
        sessionStorage.removeItem("welcomeShown");
        window.location.href = "loginpage.html";
        throw new Error("Unauthorized");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

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

document.getElementById("manageCategoriesBtn").addEventListener("click", function (e) {
    window.location.href = "managecategories.html";
});

document.getElementById("deleteDataBtn").addEventListener("click", function () {
    let password = prompt("Enter your password: ");

    if (password === null) {
        return;
    }

    const trimmedPassword = password.trim();

    if (trimmedPassword === "") {
        alert("Password is required.");
        return;
    }

    fetchJson("http://localhost:3000/password-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: trimmedPassword })
    })
    .then(data => {
        if (data.success) {
            const confirmation = window.confirm("Are you sure you want to delete your all notes?\nThis action cannot be undone.");
        
            if (confirmation) {
                fetchJson("http://localhost:3000/delete-all-data", { method: "DELETE" })
                    .then((deleteData) => {
                        alert(deleteData.message || "All notes deleted.");
                    })
                    .catch(err => console.error("Error:", err));
            }
        } else {
            alert("Wrong Password!");
        }
    })
    .catch(err => {
        if (err.message !== "Unauthorized") {
            alert("Error: " + err.message);
        }
    })
});
