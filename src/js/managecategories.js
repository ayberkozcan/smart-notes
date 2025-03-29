const categoryCards = document.querySelector(".categoryCards");

document.getElementById("gobackBtn").addEventListener("click", function (e) {
    window.location.href = "settings.html";
});

// let categories = ["Personal", "Work", "Ideas"];

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
                        fetch(`http://localhost:3000/categories/${i}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ newName: newName.trim() })
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
                        fetch(`http://localhost:3000/categories/${i}`, { method: "DELETE" })
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