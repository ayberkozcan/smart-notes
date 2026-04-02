const categoryCards = document.querySelector(".categoryCards");

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);

    if (response.status === 401) {
        localStorage.setItem("isVerified", "false");
        localStorage.removeItem("userData");
        sessionStorage.removeItem("welcomeShown");
        window.location.href = "loginpage.html";
        throw new Error("Unauthorized");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

function renderCategories() {
    categoryCards.innerHTML = "";

    fetchJson("http://localhost:3000/categories")
        .then(categories => {
            categories.forEach((item, i) => {
                const category = document.createElement("div");
                category.className = "utility-category-row";

                category.innerHTML = `
                    <button class="btn btn-outline-success editCategoryBtn utility-category-edit">
                        <span class="utility-category-edit__content">
                            <i class="fa-solid fa-pen-to-square"></i>
                            <span>${item}</span>
                        </span>
                    </button>
                    <button class="btn btn-outline-danger deleteCategoryBtn utility-category-delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;

                const editCategoryBtn = category.querySelector(".editCategoryBtn");
                editCategoryBtn.addEventListener("click", function () {
                    let newName = prompt("Enter new category name:", item);
                    if (newName === null) {
                        return;
                    }

                    if (newName.trim() === "") {
                        alert("Category name cannot be empty.");
                        return;
                    }

                    if (newName.trim().length > 15) {
                        alert("Category name cannot be longer than 15 characters");
                        return;
                    }

                    if (newName.trim() !== item) {
                        fetchJson(`http://localhost:3000/edit-category`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ category_index: i, newName: newName.trim() })
                        })
                        .then((data) => {
                            alert(data.message);
                            renderCategories();
                        })
                        .catch(err => {
                            console.error("Error updating category:", err);
                            alert("Error: " + err.message);
                        });
                    }
                });

                const deleteCategoryBtn = category.querySelector(".deleteCategoryBtn");
                deleteCategoryBtn.addEventListener("click", function (e) {
                    e.stopPropagation();
                    const confirmation = window.confirm("Are you sure you want to delete this category?");
                    
                    if (confirmation) {
                        fetchJson(`http://localhost:3000/delete-category/${i}`, { method: "DELETE" })
                        .then((data) => {
                            alert(data.message);
                            renderCategories();
                        })
                        .catch(err => {
                            console.error("Error deleting category:", err);
                            alert("Error: " + err.message);
                        });
                    }
                });

                categoryCards.appendChild(category);
            });
        })
        .catch(err => console.error("Error fetching categories:", err));
}

renderCategories();

document.getElementById("gobackBtn").addEventListener("click", function (e) {
    window.location.href = "settings.html";
});

document.getElementById("addCategory").addEventListener("click", function (e) {
    let name = prompt("Enter category name: ");
    if (name === null) {
        return;
    }
    if (name.length > 15) {
        alert("Category name cannot be longer than 15 characters");
    } else {
        if (name && name.trim() !== "") {
            fetchJson(`http://localhost:3000/add-category`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() })
            })
            .then(data => {
                alert(data.message);
                renderCategories();
            })
            .catch(err => {
                alert("Error: " + err.message);
            });
        }
    }
});
