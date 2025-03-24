const form = document.getElementById("form");
const email = document.getElementById("email");
const username = document.getElementById("username");
const password = document.getElementById("password");
let checkBox = document.getElementById("checkbox");
let header = document.querySelector(".card-header").innerHTML;

let loginStatus = "login";
let loginSuccess = false;

let inputs = [email, username, password];

function checkInputsForLogin(inputs) {
    const emailValue = email.value.trim();
    const usernameValue = username.value.trim();
    const passwordValue = password.value.trim();

    fetch(`http://localhost:3000/login?email=${encodeURIComponent(emailValue)}&username=${encodeURIComponent(usernameValue)}&password=${encodeURIComponent(passwordValue)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loginSuccess = true;
                alert("Login Successfull!");
                window.location.href = "homepage.html";
            } else {
                loginSuccess = false;
                alert("Invalid Email, Username or Password!");
            }
        })
        .catch(err => console.error("Error: ", err))

    // if (inputs[0].value == "a@a.com" && inputs[1].value == "asd123" && inputs[2].value == "asd1234") {
    //     loginSuccess = true;
    //     console.log("Login Successful");
    //     window.location.href = "homepage.html";
    // } else {
    //     loginSuccess = false;
    //     console.log("Login Unsuccessful");
    // }
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
        }
    });
}

function checkLength(input, min, max) {
    if (input.value.length < min || input.value.length > max) {
        error(input, `${input.id} must be ${min} - ${max} characters long!`);
    } else {
        success(input);
    }
}

form.addEventListener("submit", function(e) {
    e.preventDefault();

    if (loginStatus == "login") { // login
        checkInputsForLogin([email, username, password]);
    } else { // sign up
        checkRequired([email, username, password]);
        checkEmail(email);
        checkLength(username, 5, 12);
        checkLength(password, 5, 12);
    }
});

document.getElementById("signupBtn").addEventListener("click", function(e) {
    e.preventDefault();
    
    if (loginStatus == "login") {
        loginStatus = "signup";
        checkBox.checked = false;
        
        document.querySelector(".card-header").innerHTML = "Sign Up";
        
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
        
        document.querySelector(".card-header").innerHTML = "Login";
        
        document.getElementById("email").value = "";
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";

        document.getElementById("signupBtn").innerHTML = "Sign Up";
    }
});