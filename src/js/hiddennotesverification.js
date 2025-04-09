const form = document.getElementById("form");
const password = document.getElementById("password");
const verificationStatus = document.getElementById("verificationStatus");

// function verifyInput(input) {
//     if (input.value == "asd1234") {
//         console.log("Verification Successful");

//         localStorage.setItem("isVerified", "true");

//         window.location.href = "homepage.html";
//     } else {
//         console.log("Verification Unsuccessful");
//         error("Wrong Password!");
//     }
// }

function verifyInput(input) {
    const passwordValue = password.value.trim();

    fetch('http://localhost:3000/password-validation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            password: passwordValue
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                alert("Wrong Password!");
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            localStorage.setItem("isVerified", "true");
            window.location.href = "homepage.html";
        } else {
            alert("Invalid Email, Username or Password!");
        }
    })
    .catch(err => console.error("Error: ", err));
}

function error(message) {
    verificationStatus.innerText = message;
    verificationStatus.className = "error-message";
}

form.addEventListener("submit", function(e) {
    e.preventDefault();

    if (password.value === "") {
        error(`Password is required.`);
    } else {
        verifyInput(password);
    }
});

document.getElementById("gobackBtn").addEventListener("click", function(e) {
    window.location.href = "homepage.html";
});