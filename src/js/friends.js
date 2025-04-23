const friendsContent = document.getElementById("friendsContent");

let friendsData = []; // Change later

function renderFriends() {
    fetch(`http://localhost:3000/get-friends`)
        .then(response => response.json())
        .then(friends => {
            friendsData = friends;
            drawFriends(friendsData);
        })
        .catch(err => console.error("Error fetching friends:", err));
}

function drawNotes(friends) {
    friendsContent.innerHTML = ""; 

    if (friendsData.length == 0) {
        const row = document.createElement("span");
        row.innerHTML = `You have no friends!`;
        friendsContent.appendChild(row);
    } else {
        friends.forEach(item => {
            const row = document.createElement("div");
            row.innerHTML = `
                <div>
                    <span>${item.username}</span>
                    <button type="button" data-id="${item.id}">
                        <i class="fa-solid fa-user-minus"></i>
                    </button>
                </div>
            `;

            const deleteFriendBtn = row.querySelector(".deleteFriendBtn");
            deleteFriendBtn.addEventListener("click", function() {
                const confirmation = window.confirm("Are you sure you want to remove this friend?");
                if (confirmation) {
                    fetch(`http://localhost:3000/remove-friend/${item.id}`, { method: "DELETE" })
                        .then(response => response.json())
                        .then(() => {
                            alert("Friend deleted.");
                            renderNotes();
                        })
                        .catch(err => console.error("Error:", err));
                }
            });

        });
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