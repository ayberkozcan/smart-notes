const form = document.getElementById("form");
const email = document.getElementById("email");
const username = document.getElementById("username");
const password = document.getElementById("password");
let checkBox = document.getElementById("checkbox");
const savedData = JSON.parse(localStorage.getItem('userData'));

if (savedData) {
    email.value = savedData.email;
    username.value = savedData.username;
    checkBox.checked = true;
}

let loginStatus = "login";
let loginSuccess = false;

let inputs = [email, username, password];

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || data.message || "Request failed");
    }

    return data;
}

function clearValidationState() {
    inputs.forEach(function(input) {
        input.className = "form-control";
        const div = input.nextElementSibling;
        div.innerText = "";
        div.className = "";
    });
}

async function checkInputsForLogin() {
    const emailValue = email.value.trim();
    const usernameValue = username.value.trim();
    const passwordValue = password.value.trim();

    try {
        const data = await fetchJson("http://localhost:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: emailValue,
                username: usernameValue,
                password: passwordValue
            })
        });

        if (data.success) {
            loginSuccess = true;
            localStorage.setItem("isVerified", "false");
            sessionStorage.removeItem("welcomeShown");

            if (checkBox.checked) {
                const userData = {
                    email: emailValue,
                    username: usernameValue
                };
                localStorage.setItem("userData", JSON.stringify(userData));
            } else {
                localStorage.removeItem("userData");
            }

            alert("Login Successful!");
            window.location.href = "homepage.html";
        } else {
            loginSuccess = false;
            alert("Invalid Email, Username or Password!");
        }
    } catch (err) {
        loginSuccess = false;
        console.error("Error: ", err);
        alert("Invalid Email, Username or Password!");
    }
}


function error(input, message) {
    input.className = "form-control is-invalid";
    const div = input.nextElementSibling;
    div.innerText = message;
    div.className = "invalid-feedback";
}

function success(input) {
    input.className = "form-control is-valid";
}

function checkEmail(input) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    
    if (re.test(input.value)) {
        success(input);
        return true;
    } else {
        error(input, 'Invalid Email!');
        return false;
    }
}

function checkRequired(inputs) {
    let isValid = true;

    inputs.forEach(function(input) {
        if (input.value.trim() === "") {
            error(input, `${input.id} is required.`);
            isValid = false;
        } else {
            success(input);
        }
    });

    return isValid;
}

function checkLength(input, min, max) {
    if (input.value.length < min || input.value.length > max) {
        error(input, `${input.id} must be ${min} - ${max} characters long!`);
        return false;
    } else {
        success(input);
        return true;
    }
}

form.addEventListener("submit", async function(e) {
    e.preventDefault();

    if (loginStatus == "login") { // login
        const hasRequiredFields = checkRequired([email, username, password]);
        const hasValidEmail = checkEmail(email);

        if (hasRequiredFields && hasValidEmail) {
            await checkInputsForLogin();
        }
    } else { // sign up
        const hasRequiredFields = checkRequired([email, username, password]);
        const hasValidEmail = checkEmail(email);
        const hasValidUsernameLength = checkLength(username, 5, 12);
        const hasValidPasswordLength = checkLength(password, 5, 12);

        if (hasRequiredFields && hasValidEmail && hasValidUsernameLength && hasValidPasswordLength) {
            const userData = {
                email: email.value.trim(),
                username: username.value.trim(),
                password: password.value.trim()
            };
    
            try {
                const data = await fetchJson("http://localhost:3000/signup", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(userData)
                });

                localStorage.setItem("isVerified", "false");
                sessionStorage.removeItem("welcomeShown");

                if (checkBox.checked) {
                    localStorage.setItem("userData", JSON.stringify({
                        email: userData.email,
                        username: userData.username
                    }));
                } else {
                    localStorage.removeItem("userData");
                }

                alert(data.message);
                window.location.href = "homepage.html";
            } catch (error) {
                console.error("Error:", error);
                alert(error.message);
            }
        }
    }
});

document.getElementById("signupBtn").addEventListener("click", function(e) {
    e.preventDefault();
    
    if (loginStatus == "login") {
        loginStatus = "signup";

        clearValidationState();

        checkBox.checked = false;
        
        document.querySelector(".text-center").innerHTML = "Sign Up";
        
        document.getElementById("email").value = "";
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
        
        document.getElementById("signupBtn").innerHTML = "Go Back to Login";
    } else {
        loginStatus = "login";

        clearValidationState();

        checkBox.checked = false;
        
        document.querySelector(".text-center").innerHTML = "Login";
        
        document.getElementById("email").value = "";
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";

        document.getElementById("signupBtn").innerHTML = "Sign Up";
    }
});

document.getElementById("themeToggle").addEventListener("click", function (e) {
    if (localStorage.getItem("theme") === "light") {
        document.getElementById("themeToggle").innerText = "🌙";
        document.getElementById("themeToggle").classList.replace("btn-light", "btn-dark");
    } else {
        document.getElementById("themeToggle").innerText = "🌞";
        document.getElementById("themeToggle").classList.replace("btn-dark", "btn-light");
    }
});
