const categoryCards = document.querySelector(".categoryCards");

function renderCategories() {
    categoryCards.innerHTML = "";

    fetch("http://localhost:3000/categories")
        .then(response => response.json())
        .then(categories => {
            categories.forEach((item, i) => {
                const category = document.createElement("div");

                category.innerHTML = `
                    <button class="btn btn-outline-success editCategoryBtn" style="width: 90%;">${item}</button>
                    <button class="btn btn-outline-danger deleteCategoryBtn" style="width: 10%;">
                        <i class="fa-solid fa-minus"></i>
                    </button>
                `;
                category.style = "margin-top: 10px; display: flex; gap: 10px; align-items: center;";

                const editCategoryBtn = category.querySelector(".editCategoryBtn");
                editCategoryBtn.addEventListener("click", function () {
                    let newName = prompt("Enter new category name:", item);
                    if (newName && newName.trim() !== "") {
                        fetch(`http://localhost:3000/edit-category`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ category_index: i, newName: newName.trim() })
                        })
                        .then(() => renderCategories())
                        .catch(err => console.error("Error updating category:", err));
                    }
                });

                const deleteCategoryBtn = category.querySelector(".deleteCategoryBtn");
                deleteCategoryBtn.addEventListener("click", function (e) {
                    e.stopPropagation();
                    const confirmation = window.confirm("Are you sure you want to delete this category?");
                    
                    if (confirmation) {
                        fetch(`http://localhost:3000/delete-category/${i}`, { method: "DELETE" })
                        .then(() => renderCategories())
                        .catch(err => console.error("Error deleting category:", err));
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
    if (name.length > 15) {
        alert("Category name cannot be longer than 15 characters");
    } else {
        if (name && name.trim() !== "") {
            fetch(`http://localhost:3000/add-category`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error); });
                }
                return response.json();
            })
            .then(data => {
                alert("Category added successfully!");
                renderCategories();
            })
            .catch(err => {
                alert("Error: " + err.message);
            });
        }
    }
});