const themeToggleBtn = document.getElementById("themeToggle");

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
}

themeToggleBtn.addEventListener("click", () => {
    console.log("asd");
    document.body.classList.toggle("dark-mode");

    // Yeni temayı localStorage'a kaydet
    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }
});
