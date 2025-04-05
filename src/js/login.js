const form = document.getElementById("form");
const email = document.getElementById("email");
const username = document.getElementById("username");
const password = document.getElementById("password");
let checkBox = document.getElementById("checkbox");
let header = document.querySelector(".card-header").innerHTML;

const savedData = JSON.parse(localStorage.getItem('userData'));

if (savedData) {
    email.value = savedData.email;
    username.value = savedData.username;
    checkBox.checked = true;
}

let loginStatus = "login";
let loginSuccess = false;
let signupSuccessCounter = 0;

let inputs = [email, username, password];

function checkInputsForLogin(inputs) {
    const emailValue = email.value.trim();
    const usernameValue = username.value.trim();
    const passwordValue = password.value.trim();

    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: emailValue,
            username: usernameValue,
            password: passwordValue
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                // throw new Error(text);
                alert("Invalid Email, Username or Password!");
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            loginSuccess = true;

            if (checkBox.checked) {
                const userData = {
                    email: email.value,
                    username: username.value
                };
                localStorage.setItem('userData', JSON.stringify(userData));
            }
            alert("Login Successful!");
            window.location.href = "homepage.html";
        } else {
            loginSuccess = false;
            alert("Invalid Email, Username or Password!");
        }
    })
    .catch(err => console.error("Error: ", err));
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
        signupSuccessCounter++;
    } else {
        error(input, 'Invalid Email!');
    }
}

function checkRequired(inputs) {
    inputs.forEach(function(input) {
        if (input.value === "") {
            error(input, `${input.id} is required.`);
        } else {
            success(input);
            signupSuccessCounter++;
        }
    });
}

function checkLength(input, min, max) {
    if (input.value.length < min || input.value.length > max) {
        error(input, `${input.id} must be ${min} - ${max} characters long!`);
    } else {
        success(input);
        signupSuccessCounter++;
    }
}

form.addEventListener("submit", function(e) {
    e.preventDefault();

    if (loginStatus == "login") { // login
        checkRequired([email, username, password]);
        checkEmail(email);
        checkInputsForLogin([email, username, password]);
    } else { // sign up
        checkRequired([email, username, password]);
        checkEmail(email);
        checkLength(username, 5, 12);
        checkLength(password, 5, 12);

        if (signupSuccessCounter == 6) {
            const userData = {
                email: email.value.trim(),
                username: username.value.trim(),
                password: password.value.trim()
            };
    
            fetch("http://localhost:3000/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(userData)
            })
            .then(response => response.json().then(data => ({ status: response.status, body: data })))
            .then(({ status, body }) => {
                if (status !== 200) {
                    throw new Error(body.error || "An error occurred while adding the user!");
                }
                alert(body.message);
                window.location.href = "homepage.html";
            })
            .catch(error => {
                console.error("Error:", error);
                alert(error.message);
            });            
        }

        signupSuccessCounter = 0;
    }
});

document.getElementById("signupBtn").addEventListener("click", function(e) {
    e.preventDefault();
    
    if (loginStatus == "login") {
        loginStatus = "signup";

        inputs.forEach(function(input) {
            input.className = "form-control";
            const div = input.nextElementSibling;
            div.innerText = "";
            div.className = "";
        });

        checkBox.checked = false;
        
        document.querySelector(".text-center").innerHTML = "Sign Up";
        
        document.getElementById("email").value = "";
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
        
        document.getElementById("signupBtn").innerHTML = "Go Back to Login";
    } else {
        loginStatus = "login";

        inputs.forEach(function(input) {
            input.className = "form-control";
            const div = input.nextElementSibling;
            div.innerText = "";
            div.className = "";
        });

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