document.getElementById("themeToggle").addEventListener("click", function (e) {
    if (localStorage.getItem("theme") === "light") {
        document.getElementById("themeToggle").innerText = "Switch to Dark Theme";
        document.getElementById("themeToggle").classList.replace("btn-light", "btn-dark");
    } else {
        document.getElementById("themeToggle").innerText = "Switch to Light Theme";
        document.getElementById("themeToggle").classList.replace("btn-dark", "btn-light");
    }
});

document.getElementById("gobackBtn").addEventListener("click", function (e) {
    window.location.href = "homepage.html";
});

document.getElementById("manageCategoriesBtn").addEventListener("click", function (e) {
    window.location.href = "managecategories.html";
});

document.getElementById("deleteDataBtn").addEventListener("click", function () {
    const confirmation = window.confirm("Are you sure you want to delete your all data?\nThis action cannot be undone.");
    
    if (confirmation) {
        alert("All data deleted.");
    }
});