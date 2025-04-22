const friendsContent = document.getElementById("friendsContent");

let friendsData = []; // Change later

function renderFriends() {
    if (friendsData.length == 0) {
        const row = document.createElement("span");
        row.innerHTML = `You have no friends!`;
        friendsContent.appendChild(row);
    }
}

renderFriends();

document.getElementById("addFriendBtn").addEventListener("click", function () {
    if (friendsData.length == 10) { // Change it to 10
        alert("You've reached friend limit!");
    } else {
        let username = prompt("Enter username: ");
        if (username && username.trim() !== "") {
            fetch(`http://localhost:3000/add-friend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.trim() })
            })
            .then(response => {
                if (!response.ok) {
                    alert("Username not found!");
                    return response.json().then(err => { throw new Error(err.error); });
                }
                return response.json();
            })
            .then(data => {
                alert("Friendship request sent successfully!");
                // renderFriends();
            })
            .catch(err => {
                alert("Error: " + err.message);
            });
        }
    }
});