

const products = [
    {
        id: 1,
        name: "Classic T-Shirt",
        price: 499,
        category: "Fashion",
        image: "images/tshirt-real.jpg"
    },
    {
        id: 2,
        name: "Stylish Shoes",
        price: 1299,
        category: "Shoes",
        image: "images/shoes-real.jpg"
    },
    {
        id: 3,
        name: "Smart Watch",
        price: 1999,
        category: "Electronics",
        image: "images/watch-real.jpg"
    },
    {
        id: 4,
        name: "Travel Backpack",
        price: 899,
        category: "Bags",
        image: "images/backpack-real.jpg"
    }
];

const inr = amount => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

let cart = [];
let selectedCategory = "All";

// DISPLAY PRODUCTS
function displayProducts(list = products) {

    const productList = document.getElementById("product-list");

    if (!productList) {
        console.error("Product list element not found!");
        return;
    }

    productList.innerHTML = "";

    if (list.length === 0) {
        productList.innerHTML =
            '<p class="no-products">No products found!</p>';
        return;
    }
<button class="add-btn"
    onclick="showProductDetails(${product.id})">
    View Details
</button>

<button class="add-btn"
    onclick="addToCart(${product.id})">
    Add to Cart
</button>
    list.forEach(product => {

        productList.innerHTML += `
            <div class="product-card">

                <img src="${product.image}"
                     alt="${product.name}"
                     onerror="this.alt='Image unavailable'">

                <h3>${product.name}</h3>

                <p class="price">${inr(product.price)}</p>

                <button class="add-btn"
                    onclick="addToCart(${product.id})">
                    Add to Cart
                </button>

            </div>
        `;
    });
}

// SEARCH PRODUCTS
function filterProducts() {

    const searchInput =
        document.getElementById("product-search");

    const searchValue = searchInput.value.toLowerCase();

    const filtered = products.filter(product => {

        const matchesSearch =
            product.name.toLowerCase().includes(searchValue);

        const matchesCategory =
            selectedCategory === "All" ||
            product.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    displayProducts(filtered);
}

// CATEGORY FILTER
function selectCategory(category) {

    selectedCategory = category;

    document.querySelectorAll(".category-btn")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.textContent.trim() === category
            );
        });

    filterProducts();
}

// ADD TO CART
function addToCart(id) {

    const product = products.find(item => item.id === id);

    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({...product, quantity: 1});
    }

    updateCart();
}

// UPDATE CART
function updateCart() {

    const cartItems = document.getElementById("cart-items");

    const cartCount = document.getElementById("cart-count");

    const cartTotal = document.getElementById("cart-total");

    let total = 0;
    let count = 0;

    cartItems.innerHTML = "";

    cart.forEach(item => {

        total += item.price * item.quantity;
        count += item.quantity;

        cartItems.innerHTML += `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong>
                    <p>${inr(item.price)} × ${item.quantity}</p>
                </div>

                <button class="remove-btn"
                    onclick="removeFromCart(${item.id})">
                    Remove
                </button>
            </div>
        `;
    });

    cartCount.textContent = count;
    cartTotal.textContent = inr(total);
}

// REMOVE FROM CART
function removeFromCart(id) {

    cart = cart.filter(item => item.id !== id);

    updateCart();
}

// OPEN CART
function toggleCart() {

    const panel = document.getElementById("cart-panel");

    panel.style.display =
        panel.style.display === "block" ? "none" : "block";
}

// CHECKOUT DEMO
function checkout() {

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    alert("Demo checkout! Total: " + inr(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)));

    cart = [];

    updateCart();

    toggleCart();
}

// SEARCH WHILE TYPING
const searchInput =
    document.getElementById("product-search");

if (searchInput) {
    searchInput.addEventListener("input", filterProducts);
}

// INITIAL DISPLAY
displayProducts();

// Open product details
function showProductDetails(id) {

    const product = products.find(item => item.id === id);

    document.getElementById("detail-image").src =
        product.image;

    document.getElementById("detail-name").textContent =
        product.name;

    document.getElementById("detail-price").textContent =
        "₹" + product.price;

    document.getElementById("detail-description").textContent =
        "Discover our " + product.name +
        ". A great choice for your everyday needs.";

    document.getElementById("detail-quantity").value = 1;

    document.getElementById("product-modal").style.display =
        "flex";

}

// Close product details
function closeProductDetails() {

    document.getElementById("product-modal").style.display =
        "none";

}

// Add selected quantity to cart
function addDetailProductToCart() {

    const productName =
        document.getElementById("detail-name").textContent;

    const product = products.find(
        item => item.name === productName
    );

    const quantity = Number(
        document.getElementById("detail-quantity").value
    );

    if (!Number.isInteger(quantity) || quantity < 1) {
        alert("Please enter a valid quantity.");
        return;
    }

    const existingItem = cart.find(
        item => item.id === product.id
    );

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({...product, quantity: quantity});
    }

    updateCart();
    closeProductDetails();

    alert("Product added to cart!");
}




