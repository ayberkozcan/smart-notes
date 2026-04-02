const form = document.getElementById("form");
const email = document.getElementById("email");
const username = document.getElementById("username");
const password = document.getElementById("password");
const checkBox = document.getElementById("checkbox");
const authTitle = document.getElementById("authTitle");
const authEyebrow = document.getElementById("authEyebrow");
const signupBtn = document.getElementById("signupBtn");
const themeToggle = document.getElementById("themeToggle");

const savedData = JSON.parse(localStorage.getItem("userData") || "null");

if (savedData) {
    email.value = savedData.email || "";
    username.value = savedData.username || "";
    checkBox.checked = true;
}

let loginStatus = "login";
const inputs = [email, username, password];

function updateModeUI() {
    if (loginStatus === "login") {
        authEyebrow.innerText = "Welcome back";
        authTitle.innerText = "Login";
        signupBtn.innerText = "Create account";
    } else {
        authEyebrow.innerText = "New here";
        authTitle.innerText = "Create Account";
        signupBtn.innerText = "Back to login";
    }
}

function updateThemeIcon() {
    themeToggle.innerText = localStorage.getItem("theme") === "dark" ? "◑" : "◐";
}

function setError(input, message) {
    input.className = "form-control login-input is-invalid";
    const messageNode = input.nextElementSibling;
    messageNode.innerText = message;
    messageNode.className = "invalid-feedback";
}

function setSuccess(input) {
    input.className = "form-control login-input is-valid";
    const messageNode = input.nextElementSibling;
    messageNode.innerText = "";
    messageNode.className = "";
}

function clearValidation() {
    inputs.forEach((input) => {
        input.className = "form-control login-input";
        const messageNode = input.nextElementSibling;
        messageNode.innerText = "";
        messageNode.className = "";
    });
}

function validateRequired() {
    let isValid = true;

    inputs.forEach((input) => {
        if (input.value.trim() === "") {
            setError(input, `${input.id} is required.`);
            isValid = false;
        } else {
            setSuccess(input);
        }
    });

    return isValid;
}

function validateEmail() {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (!re.test(email.value.trim())) {
        setError(email, "Invalid Email!");
        return false;
    }

    setSuccess(email);
    return true;
}

function validateLength(input, min, max) {
    if (input.value.trim().length < min || input.value.trim().length > max) {
        setError(input, `${input.id} must be ${min} - ${max} characters long!`);
        return false;
    }

    setSuccess(input);
    return true;
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || data.message || "Request failed");
    }

    return data;
}

async function handleLogin() {
    const data = await fetchJson("http://localhost:3000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email.value.trim(),
            username: username.value.trim(),
            password: password.value.trim()
        })
    });

    if (!data.success) {
        throw new Error("Invalid Email, Username or Password!");
    }

    localStorage.setItem("isVerified", "false");
    sessionStorage.removeItem("welcomeShown");

    if (checkBox.checked) {
        localStorage.setItem("userData", JSON.stringify({
            email: email.value.trim(),
            username: username.value.trim()
        }));
    } else {
        localStorage.removeItem("userData");
    }

    alert("Login Successful!");
    window.location.href = "homepage.html";
}

async function handleSignup() {
    const data = await fetchJson("http://localhost:3000/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email.value.trim(),
            username: username.value.trim(),
            password: password.value.trim()
        })
    });

    localStorage.setItem("isVerified", "false");
    sessionStorage.removeItem("welcomeShown");

    if (checkBox.checked) {
        localStorage.setItem("userData", JSON.stringify({
            email: email.value.trim(),
            username: username.value.trim()
        }));
    } else {
        localStorage.removeItem("userData");
    }

    alert(data.message || "Signed up successfully");
    window.location.href = "homepage.html";
}

form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const hasRequiredFields = validateRequired();
    const hasValidEmail = validateEmail();

    if (!hasRequiredFields || !hasValidEmail) {
        return;
    }

    if (loginStatus === "signup") {
        const hasValidUsername = validateLength(username, 5, 12);
        const hasValidPassword = validateLength(password, 5, 12);

        if (!hasValidUsername || !hasValidPassword) {
            return;
        }
    }

    try {
        if (loginStatus === "login") {
            await handleLogin();
        } else {
            await handleSignup();
        }
    } catch (error) {
        console.error("Error:", error);
        alert(error.message);
    }
});

signupBtn.addEventListener("click", function (e) {
    e.preventDefault();
    loginStatus = loginStatus === "login" ? "signup" : "login";
    clearValidation();
    email.value = "";
    username.value = "";
    password.value = "";
    checkBox.checked = false;
    updateModeUI();
});

themeToggle.addEventListener("click", function () {
    setTimeout(updateThemeIcon, 0);
});

updateModeUI();
updateThemeIcon();
