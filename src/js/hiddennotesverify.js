const form = document.getElementById("form");
const password = document.getElementById("password");
const verificationStatus = document.getElementById("verificationStatus");

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (response.status === 401) {
        localStorage.setItem("isVerified", "false");
        localStorage.removeItem("userData");
        sessionStorage.removeItem("welcomeShown");
        window.location.href = "loginpage.html";
        throw new Error("Unauthorized");
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

async function verifyInput() {
    const passwordValue = password.value.trim();

    try {
        const data = await fetchJson("http://localhost:3000/password-validation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                password: passwordValue
            })
        });

        if (data.success) {
            localStorage.setItem("isVerified", "true");
            window.location.href = "homepage.html";
            return;
        }

        alert("Wrong Password!");
    } catch (err) {
        console.error("Error: ", err);
        if (err.message !== "Unauthorized") {
            alert(err.message);
        }
    }
}

function showError(message) {
    verificationStatus.innerText = message;
    verificationStatus.className = "error-message";
}

form.addEventListener("submit", function(e) {
    e.preventDefault();

    if (password.value.trim() === "") {
        showError("Password is required.");
    } else {
        verificationStatus.innerText = "";
        verificationStatus.className = "";
        verifyInput();
    }
});

document.getElementById("gobackBtn").addEventListener("click", function() {
    window.location.href = "homepage.html";
});
