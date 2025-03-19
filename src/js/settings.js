document.getElementById("gobackBtn").addEventListener("click", function(e) {
    window.location.href = "homepage.html";
});

document.getElementById("themeToggle").addEventListener("click", function(e) {
    if (localStorage.getItem("theme") === "light") {
        document.getElementById("themeToggle").innerText = "Switch to Dark Theme";
        document.getElementById("themeToggle").classList.replace("btn-light", "btn-dark");
    } else {
        document.getElementById("themeToggle").innerText = "Switch to Light Theme";
        document.getElementById("themeToggle").classList.replace("btn-dark", "btn-light");
    }
});