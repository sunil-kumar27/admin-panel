// OPEN ADMIN PANEL
const openAdmin = document.getElementById("open-admin");
const storefront = document.getElementById("storefront-view");
const adminDashboard = document.getElementById("admin-dashboard");
const content = document.getElementById("admin-page-content");
const dashboardHTML = content ? content.innerHTML : "";

function escapeAdminHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

const CATEGORY_STORAGE_KEY = "shopease-categories-v1";
function loadManagedCategories() {
    let saved = [];
    try {
        const parsed = JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY) || "[]");
        if (Array.isArray(parsed)) saved = parsed.filter(value => typeof value === "string" && value.trim()).map(value => value.trim());
    } catch (error) { /* Existing product categories remain available. */ }
    return [...new Set([...saved, ...products.map(product => product.category.trim()).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
}
let managedCategories = loadManagedCategories();
function saveManagedCategories() {
    try { localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(managedCategories)); return true; }
    catch (error) { return false; }
}
function refreshManagedCategories(selected = "") {
    managedCategories = [...new Set([...managedCategories, ...products.map(product => product.category.trim()).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
    const filter = document.getElementById("admin-product-category-filter");
    if (filter) {
        filter.innerHTML = `<option value="All">All categories</option>${managedCategories.map(category => `<option value="${escapeAdminHTML(category)}">${escapeAdminHTML(category)}</option>`).join("")}`;
        filter.value = managedCategories.includes(selected) ? selected : "All";
    }
    const select = document.getElementById("product-category");
    if (select) {
        const current = selected || select.value;
        select.innerHTML = managedCategories.map(category => `<option value="${escapeAdminHTML(category)}">${escapeAdminHTML(category)}</option>`).join("");
        if (managedCategories.includes(current)) select.value = current;
    }
}
function renderCategoryManagementPage(message = "") {
    if (!content) return;
    content.innerHTML = `
        <section class="category-management">
            <div class="orders-heading"><div><h2>Category management</h2><p>Create, rename, delete, and assign product categories.</p></div></div>
            <form id="add-category-form" class="category-add-form"><label for="new-category-name">New category<input id="new-category-name" name="category" type="text" maxlength="40" placeholder="e.g. Home & Living" required></label><button class="view-orders" type="submit">Add category</button></form>
            <p id="category-message" class="category-message" role="status" aria-live="polite">${escapeAdminHTML(message)}</p>
            <div class="category-list">${managedCategories.map(category => {
                const count = products.filter(product => product.category === category).length;
                return `<article class="category-row"><div class="category-details"><strong>${escapeAdminHTML(category)}</strong><span>${count} ${count === 1 ? "product" : "products"}</span></div><div class="category-actions"><button class="small-btn edit-btn" type="button" data-category-edit="${escapeAdminHTML(category)}">Rename</button><button class="small-btn delete-btn" type="button" data-category-delete="${escapeAdminHTML(category)}">Delete</button></div></article>`;
            }).join("") || '<p class="category-empty">No categories yet. Add one above.</p>'}</div>
            <section class="orders-section category-products"><div class="orders-heading"><div><h2>Manage product categories</h2><p>Choose a category for each product.</p></div></div>
                ${products.length ? `<div class="category-product-list">${products.map(product => `<label class="category-product-row"><span>${escapeAdminHTML(product.name)}</span><select data-product-category="${product.id}" aria-label="Category for ${escapeAdminHTML(product.name)}">${managedCategories.map(category => `<option value="${escapeAdminHTML(category)}" ${product.category === category ? "selected" : ""}>${escapeAdminHTML(category)}</option>`).join("")}</select></label>`).join("")}</div>` : '<p class="category-empty">Add products before assigning categories.</p>'}
            </section>
        </section>`;
    document.getElementById("add-category-form").addEventListener("submit", event => {
        event.preventDefault();
        const name = document.getElementById("new-category-name").value.trim();
        if (managedCategories.some(category => category.toLocaleLowerCase() === name.toLocaleLowerCase())) { document.getElementById("category-message").textContent = "That category already exists."; return; }
        managedCategories.push(name);
        managedCategories.sort((a, b) => a.localeCompare(b));
        const saved = saveManagedCategories();
        renderCategoryManagementPage(saved ? `Added ${name}.` : "Category added for this session, but browser storage could not be updated.");
    });
    content.querySelectorAll("[data-category-edit]").forEach(button => button.addEventListener("click", () => {
        const oldName = button.dataset.categoryEdit;
        const answer = window.prompt("Rename category:", oldName);
        if (answer === null) return;
        const newName = answer.trim();
        if (!newName) { renderCategoryManagementPage("Category name cannot be empty."); return; }
        if (managedCategories.some(category => category !== oldName && category.toLocaleLowerCase() === newName.toLocaleLowerCase())) { renderCategoryManagementPage("That category already exists."); return; }
        managedCategories = managedCategories.map(category => category === oldName ? newName : category).sort((a, b) => a.localeCompare(b));
        products.forEach(product => { if (product.category === oldName) product.category = newName; });
        const categoriesSaved = saveManagedCategories();
        const productsSaved = saveProducts();
        if (typeof refreshStorefrontProducts === "function") refreshStorefrontProducts();
        renderCategoryManagementPage(categoriesSaved && productsSaved ? `Renamed ${oldName} to ${newName}.` : "Category renamed, but browser storage could not be fully updated.");
    }));
    content.querySelectorAll("[data-category-delete]").forEach(button => button.addEventListener("click", () => {
        const name = button.dataset.categoryDelete;
        const count = products.filter(product => product.category === name).length;
        if (count) { renderCategoryManagementPage(`Move ${count} product${count === 1 ? "" : "s"} out of ${name} before deleting it.`); return; }
        if (adminSettings.confirmProductDelete && !window.confirm(`Delete the ${name} category?`)) return;
        managedCategories = managedCategories.filter(category => category !== name);
        const saved = saveManagedCategories();
        renderCategoryManagementPage(saved ? `Deleted ${name}.` : "Category deleted for this session, but browser storage could not be updated.");
    }));
    content.querySelectorAll("[data-product-category]").forEach(select => select.addEventListener("change", () => {
        const product = products.find(item => item.id === Number(select.dataset.productCategory));
        if (!product) return;
        const from = product.category;
        product.category = select.value;
        const saved = saveProducts();
        if (typeof refreshStorefrontProducts === "function") refreshStorefrontProducts();
        renderCategoryManagementPage(saved ? `Moved ${product.name} from ${from} to ${product.category}.` : "Category changed for this session, but browser storage could not be updated.");
    }));
}
function updateDashboard() {
    const totalProducts = document.getElementById("total-products");

    if (totalProducts && typeof products !== "undefined") {
        totalProducts.textContent = products.length;
    }
}

function showProductMessage(message, isError = false) {
    const messageElement = document.getElementById("product-form-message");
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.classList.toggle("error", isError);
}

function updateProductCategoryOptions(selectedCategory = "All") {
    refreshManagedCategories(selectedCategory);
}

function renderProductList() {
    const productList = document.getElementById("admin-product-list");
    const searchInput = document.getElementById("admin-product-search");
    const categoryFilter = document.getElementById("admin-product-category-filter");
    const sortFilter = document.getElementById("admin-product-sort");
    const productCount = document.getElementById("admin-product-count");
    if (!productList || !searchInput || !categoryFilter || !sortFilter || !productCount) return;

    const query = searchInput.value.trim().toLocaleLowerCase();
    const category = categoryFilter.value;
    const sort = sortFilter.value;
    const filteredProducts = products.filter(product => {
        const matchesQuery = `${product.name} ${product.category}`.toLocaleLowerCase().includes(query);
        const matchesCategory = category === "All" || product.category === category;
        return matchesQuery && matchesCategory;
    });

    if (sort === "name") {
        filteredProducts.sort((first, second) => first.name.localeCompare(second.name));
    } else if (sort === "price-low") {
        filteredProducts.sort((first, second) => first.price - second.price);
    } else if (sort === "price-high") {
        filteredProducts.sort((first, second) => second.price - first.price);
    } else {
        filteredProducts.sort((first, second) => second.id - first.id);
    }

    productCount.textContent = `${filteredProducts.length} of ${products.length} products`;

    if (!filteredProducts.length) {
        productList.innerHTML = `
            <div class="product-empty-state">
                <strong>${products.length ? "No matching products" : "Your catalog is empty"}</strong>
                <p>${products.length ? "Try another search or category." : "Add a product using the form above to get started."}</p>
            </div>
        `;
        return;
    }

    productList.innerHTML = filteredProducts.map(product => `
        <article class="admin-product-card">
            ${product.image
                ? `<img src="${escapeAdminHTML(product.image)}" alt="${escapeAdminHTML(product.name)}" onerror="this.hidden=true; this.nextElementSibling.hidden=false;" />
                   <div class="product-image-placeholder" hidden>Image unavailable</div>`
                : `<div class="product-image-placeholder">No image added</div>`}
            <div class="product-info">
                <h3>${escapeAdminHTML(product.name)}</h3>
                <p>${escapeAdminHTML(product.category)}</p>
                <strong>${formatCurrency(product.price)}</strong>
                <span class="stock-pill ${product.stock === 0 ? "stock-out" : product.stock <= 5 ? "stock-low" : ""}">${product.stock} in stock</span>
            </div>
            <div class="product-actions">
                <button class="small-btn edit-btn" type="button" data-id="${product.id}">Edit</button>
                <button class="small-btn delete-btn" type="button" data-id="${product.id}">Delete</button>
            </div>
        </article>
    `).join("");
}

function cancelProductEdit() {
    const form = document.getElementById("add-product-form");
    const editId = document.getElementById("product-edit-id");
    const submitButton = document.getElementById("product-submit-button");
    const cancelButton = document.getElementById("product-cancel-button");

    if (!form || !editId || !submitButton || !cancelButton) return;

    form.reset();
    editId.value = "";
    submitButton.textContent = "Add product";
    cancelButton.hidden = true;
    showProductMessage("");
}

function saveCatalogChange(message) {
    const persisted = typeof saveProducts === "function" && saveProducts();

    if (typeof refreshStorefrontProducts === "function") {
        refreshStorefrontProducts();
    }

    updateDashboard();
    return persisted
        ? message
        : `${message} This change is only available until you close or refresh this page because browser storage could not be updated.`;
}

function renderProductsPage() {
    if (!content) return;

    content.innerHTML = `
        <section class="products-management">
            <div class="orders-heading">
                <div>
                    <h2>Product management</h2>
                    <p>Add, update, search, and organize your catalog.</p>
                </div>
            </div>

            <form id="add-product-form" class="product-form">
                <input type="hidden" id="product-edit-id" />
                <h3 class="product-form-title">Product details</h3>
                <div class="form-row">
                    <label>
                        Product name
                        <input id="product-name" type="text" maxlength="80" placeholder="e.g. Everyday tote bag" autocomplete="off" required />
                    </label>
                    <label>
                        Price (INR)
                        <input id="product-price" type="number" min="0.01" step="0.01" placeholder="e.g. 1299" required />
                    </label>
                    <label>
                        Category
                        <select id="product-category" required></select>
                    </label>
                </div>
                <label class="product-image-field">
                    Product image <span>Optional · upload JPG, PNG, GIF, or WebP (up to 2 MB), or enter an image path/URL</span>
                    <input id="product-image-file" type="file" accept="image/jpeg,image/png,image/gif,image/webp" />
                    <input id="product-image" type="text" maxlength="500" placeholder="images/product.jpg or https://..." autocomplete="url" aria-label="Image path or URL" />
                    <img id="product-image-preview" class="product-image-preview" alt="Product image preview" hidden />
                </label>
                <div class="product-form-footer">
                    <p id="product-form-message" class="product-form-message" role="status" aria-live="polite"></p>
                    <div class="product-form-actions">
                        <button id="product-cancel-button" class="small-btn edit-btn" type="button" hidden>Cancel edit</button>
                        <button id="product-submit-button" class="view-orders" type="submit">Add product</button>
                    </div>
                </div>
            </form>

            <div class="product-toolbar">
                <div>
                    <h3>Catalog</h3>
                    <p id="admin-product-count" aria-live="polite"></p>
                </div>
                <div class="product-filters">
                    <label class="visually-hidden" for="admin-product-search">Search products</label>
                    <input id="admin-product-search" type="search" placeholder="Search products..." />
                    <label class="visually-hidden" for="admin-product-category-filter">Filter by category</label>
                    <select id="admin-product-category-filter"></select>
                    <label class="visually-hidden" for="admin-product-sort">Sort products</label>
                    <select id="admin-product-sort">
                        <option value="newest">Recently added</option>
                        <option value="name">Name: A to Z</option>
                        <option value="price-low">Price: low to high</option>
                        <option value="price-high">Price: high to low</option>
                    </select>
                </div>
            </div>
            <div id="admin-product-list" class="product-list"></div>
        </section>
    `;

    const form = document.getElementById("add-product-form");
    const searchInput = document.getElementById("admin-product-search");
    const categoryFilter = document.getElementById("admin-product-category-filter");
    const sortFilter = document.getElementById("admin-product-sort");
    const cancelButton = document.getElementById("product-cancel-button");
    const imageFileInput = document.getElementById("product-image-file");
    const imagePathInput = document.getElementById("product-image");
    const imagePreview = document.getElementById("product-image-preview");
    let uploadedImage = "";

    function previewProductImage(source) {
        imagePreview.src = source || "";
        imagePreview.hidden = !source;
    }
    imageFileInput.addEventListener("change", () => {
        const file = imageFileInput.files[0];
        if (!file) return;
        if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type) || file.size > 2 * 1024 * 1024) {
            imageFileInput.value = "";
            uploadedImage = "";
            showProductMessage("Choose a JPG, PNG, GIF, or WebP image no larger than 2 MB.", true);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            uploadedImage = String(reader.result);
            imagePathInput.value = "";
            previewProductImage(uploadedImage);
            showProductMessage("Image ready to save.");
        };
        reader.onerror = () => showProductMessage("The image could not be read. Try another file.", true);
        reader.readAsDataURL(file);
    });
    imagePathInput.addEventListener("input", () => {
        uploadedImage = "";
        imageFileInput.value = "";
        previewProductImage(imagePathInput.value.trim());
    });

    updateProductCategoryOptions();
    renderProductList();
    searchInput.addEventListener("input", renderProductList);
    categoryFilter.addEventListener("change", renderProductList);
    sortFilter.addEventListener("change", renderProductList);
    cancelButton.addEventListener("click", () => {
        cancelProductEdit();
        uploadedImage = "";
        imageFileInput.value = "";
        previewProductImage("");
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!form.reportValidity()) return;

        const name = document.getElementById("product-name").value.trim();
        const price = Number(document.getElementById("product-price").value);
        const category = document.getElementById("product-category").value.trim();
        const image = uploadedImage || imagePathInput.value.trim();
        const editId = Number(document.getElementById("product-edit-id").value || 0);

        if (!name || !category || !Number.isFinite(price) || price <= 0) {
            showProductMessage("Enter a product name, category, and price greater than zero.", true);
            return;
        }

        if (image && typeof isSafeProductImage === "function" && !isSafeProductImage(image)) {
            showProductMessage("Use a relative image path or a URL beginning with http:// or https://.", true);
            return;
        }

        if (editId) {
            const product = products.find(item => item.id === editId);
            if (!product) {
                showProductMessage("This product could not be found. Refresh the catalog and try again.", true);
                return;
            }

            Object.assign(product, { name, price, category, image });
        } else {
            const newId = products.length ? Math.max(...products.map(item => item.id)) + 1 : 1;
            products.push({ id: newId, name, price, category, image, stock: 20 });
        }

        const message = saveCatalogChange(editId ? "Product updated." : "Product added.");
        cancelProductEdit();
        uploadedImage = "";
        imageFileInput.value = "";
        previewProductImage("");
        updateProductCategoryOptions(category);
        categoryFilter.value = category;
        searchInput.value = "";
        renderProductList();
        showProductMessage(message, !message.startsWith(editId ? "Product updated." : "Product added."));
    });

    content.addEventListener("click", function (event) {
        const editButton = event.target.closest(".edit-btn[data-id]");
        const deleteButton = event.target.closest(".delete-btn[data-id]");

        if (editButton) {
            const product = products.find(item => item.id === Number(editButton.dataset.id));
            if (!product) return;

            document.getElementById("product-edit-id").value = product.id;
            document.getElementById("product-name").value = product.name;
            document.getElementById("product-price").value = product.price;
            document.getElementById("product-category").value = product.category;
            document.getElementById("product-image").value = product.image || "";
            uploadedImage = "";
            imageFileInput.value = "";
            previewProductImage(product.image || "");
            document.getElementById("product-submit-button").textContent = "Update product";
            cancelButton.hidden = false;
            showProductMessage(`Editing ${product.name}`);
            document.getElementById("product-name").focus();
            return;
        }

        if (deleteButton) {
            const id = Number(deleteButton.dataset.id);
            const product = products.find(item => item.id === id);
            if (!product || (adminSettings.confirmProductDelete && !window.confirm(`Delete "${product.name}" from the catalog?`))) return;

            products.splice(products.indexOf(product), 1);
            const message = saveCatalogChange("Product deleted.");
            updateProductCategoryOptions(categoryFilter.value);
            renderProductList();
            showProductMessage(message, !message.startsWith("Product deleted."));
        }
    });
}

const ADMIN_SETTINGS_KEY = "shopease-admin-settings-v1";
const defaultAdminSettings = { profileName: "Admin", profileEmail: "", siteName: "ShopEase", supportEmail: "", announcement: "", theme: "light", confirmProductDelete: true };
function loadAdminSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || "{}");
        return {
            profileName: typeof saved.profileName === "string" && saved.profileName.trim() ? saved.profileName.trim() : "Admin",
            profileEmail: typeof saved.profileEmail === "string" ? saved.profileEmail : "",
            siteName: typeof saved.siteName === "string" && saved.siteName.trim() ? saved.siteName.trim() : "ShopEase",
            supportEmail: typeof saved.supportEmail === "string" ? saved.supportEmail : "",
            announcement: typeof saved.announcement === "string" ? saved.announcement : "",
            theme: ["light", "blue", "dark"].includes(saved.theme) ? saved.theme : "light",
            confirmProductDelete: saved.confirmProductDelete !== false
        };
    } catch (error) { return { ...defaultAdminSettings }; }
}
let adminSettings = loadAdminSettings();
function applyAdminSettings() {
    document.body.classList.remove("admin-theme-light", "admin-theme-blue", "admin-theme-dark");
    document.body.classList.add(`admin-theme-${adminSettings.theme}`);
    const profileName = document.querySelector(".admin-profile strong");
    if (profileName) profileName.textContent = adminSettings.profileName;
    const profileEmail = document.querySelector(".admin-profile small");
    if (profileEmail) profileEmail.textContent = adminSettings.profileEmail || "Administrator";
    const brand = document.querySelector(".logo-word");
    if (brand && brand.firstChild) brand.firstChild.nodeValue = adminSettings.siteName;
    const aboutTitle = document.querySelector(".about h2");
    if (aboutTitle) aboutTitle.textContent = `About ${adminSettings.siteName}`;
    const footer = document.querySelector("#store-support-email");
    if (footer) footer.textContent = adminSettings.supportEmail ? `Support: ${adminSettings.supportEmail}` : "";
    const announcement = document.getElementById("store-announcement");
    if (announcement) {
        announcement.textContent = adminSettings.announcement || "Free shipping on orders over ₹1,999 · Discover the latest edit";
        announcement.hidden = false;
    }
    if (document.getElementById("storefront-view")) document.title = `${adminSettings.siteName} - Online Shopping`;
}
function renderSettingsPage() {
    if (!content) return;
    content.innerHTML = `
        <section class="admin-settings-page">
            <div class="settings-intro"><p class="settings-eyebrow">CONTROL PANEL</p><h2>Admin Settings</h2><p>Manage your profile, storefront preferences, and admin access.</p></div>
            <form id="admin-settings-form" class="admin-settings-form">
                <section class="settings-card settings-profile-card"><div class="settings-card-heading"><span class="settings-card-icon">👤</span><div><h2>Admin profile</h2><p>Personalize the name and email shown in the admin panel.</p></div></div><div class="settings-fields"><label for="settings-profile-name">Display name<input id="settings-profile-name" name="profileName" type="text" maxlength="40" required value="${escapeAdminHTML(adminSettings.profileName)}"></label><label for="settings-profile-email">Email address<input id="settings-profile-email" name="profileEmail" type="email" maxlength="120" value="${escapeAdminHTML(adminSettings.profileEmail)}" placeholder="admin@example.com"></label></div></section>
                <section class="settings-card"><div class="settings-card-heading"><span class="settings-card-icon">🔒</span><div><h2>Change password</h2><p>Password management requires a configured sign-in service.</p></div></div><div class="settings-notice" role="note">This storefront is a static browser demo with no authentication system. Connect a secure server-side sign-in provider before enabling password changes.</div><button class="small-btn edit-btn" type="button" disabled>Change password unavailable</button></section>
                <section class="settings-card"><div class="settings-card-heading"><span class="settings-card-icon">🌐</span><div><h2>Website settings</h2><p>Update the storefront identity and customer-facing details.</p></div></div><div class="settings-fields"><label for="settings-site-name">Website name<input id="settings-site-name" name="siteName" type="text" maxlength="50" required value="${escapeAdminHTML(adminSettings.siteName)}"></label><label for="settings-support-email">Support email<input id="settings-support-email" name="supportEmail" type="email" maxlength="120" value="${escapeAdminHTML(adminSettings.supportEmail)}" placeholder="support@example.com"></label><label class="settings-wide-field" for="settings-announcement">Store announcement<input id="settings-announcement" name="announcement" type="text" maxlength="140" value="${escapeAdminHTML(adminSettings.announcement)}" placeholder="Optional message shown on your storefront"></label></div><div class="settings-preferences"><label for="settings-theme">Admin appearance<select id="settings-theme" name="theme"><option value="light" ${adminSettings.theme === "light" ? "selected" : ""}>Light</option><option value="blue" ${adminSettings.theme === "blue" ? "selected" : ""}>Blue</option><option value="dark" ${adminSettings.theme === "dark" ? "selected" : ""}>Dark</option></select></label><label class="settings-switch" for="settings-confirm-delete"><input id="settings-confirm-delete" name="confirmProductDelete" type="checkbox" ${adminSettings.confirmProductDelete ? "checked" : ""}><span>Confirm before deleting products</span></label></div></section>
                <div class="settings-footer"><p id="settings-message" role="status" aria-live="polite"></p><button class="view-orders" type="submit">Save changes</button></div>
            </form>
            <section class="settings-card settings-logout-card"><div class="settings-card-heading"><span class="settings-card-icon">↪</span><div><h2>Logout</h2><p>Return to the ShopEase storefront.</p></div></div><button id="settings-logout" class="small-btn delete-btn" type="button">Logout</button></section>
        </section>`;
    document.getElementById("admin-settings-form").addEventListener("submit", event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const profileName = String(data.get("profileName") || "").trim();
        if (!profileName) return;
        adminSettings = { profileName, profileEmail: String(data.get("profileEmail") || "").trim(), siteName: String(data.get("siteName") || "ShopEase").trim() || "ShopEase", supportEmail: String(data.get("supportEmail") || "").trim(), announcement: String(data.get("announcement") || "").trim(), theme: ["light", "blue", "dark"].includes(data.get("theme")) ? data.get("theme") : "light", confirmProductDelete: data.get("confirmProductDelete") === "on" };
        try {
            localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(adminSettings));
            applyAdminSettings();
            document.getElementById("settings-message").textContent = "Settings saved.";
        } catch (error) { document.getElementById("settings-message").textContent = "Could not save settings in this browser."; }
    });
    document.getElementById("settings-logout").addEventListener("click", () => { window.location.href = "index.html"; });
}

function renderOrdersPage(message = "") {
    if (!content) return;
    const statuses = ["New", "Confirmed", "Shipped", "Out for delivery", "Delivered", "Cancelled"];
    content.innerHTML = `
        <section class="orders-management">
            <div class="orders-heading"><div><h2>Order management</h2><p>New orders appear here. Confirm each order, then update its delivery status through to Delivered.</p></div><strong>${orders.length} ${orders.length === 1 ? "order" : "orders"}</strong></div>
            <p class="category-message" role="status" aria-live="polite">${escapeAdminHTML(message)}</p>
            ${orders.length ? `<div class="sales-table-wrap orders-overview"><table><thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total amount</th></tr></thead><tbody>${orders.map(order => `<tr><td><strong>${escapeAdminHTML(order.id)}</strong></td><td>${escapeAdminHTML(order.customer)}</td><td>${escapeAdminHTML(new Date(order.createdAt).toLocaleDateString())}</td><td><strong>${formatCurrency(order.total || 0)}</strong></td></tr>`).join("")}</tbody></table></div>` : ""}
            ${orders.length ? `<div class="managed-orders">${orders.map(order => `
                <article class="managed-order-card">
                    <header><div><h3>${escapeAdminHTML(order.id)}</h3><p>${escapeAdminHTML(new Date(order.createdAt).toLocaleString())} · ${escapeAdminHTML(order.customer)}</p></div><strong>${formatCurrency(order.total)}</strong></header>
                    <details open><summary>Purchased products and delivery details · ${order.items.length} ${order.items.length === 1 ? "item" : "items"}</summary>
                        <div class="managed-order-details"><h4>Purchased products</h4><ul>${order.items.map(item => `<li><strong>${escapeAdminHTML(item.name)}</strong> · Quantity: ${Number(item.quantity)} · ${formatCurrency(item.price * item.quantity)}</li>`).join("")}</ul><p><b>Phone:</b> ${escapeAdminHTML(order.phone || "Not provided")}</p><p><b>Delivery address:</b> ${escapeAdminHTML(order.address || "Not provided")}</p><p><b>Payment method:</b> ${escapeAdminHTML(order.payment || "Not provided")}</p></div>
                    </details>
                    <div class="order-management-actions">
                        <label>${order.status === "New" ? "Confirm order" : "Delivery status"}<select data-order-status="${escapeAdminHTML(order.id)}" ${order.status === "Cancelled" ? "disabled" : ""}>${statuses.map(status => `<option ${order.status === status || (order.status === "Processing" && status === "Confirmed") ? "selected" : ""}>${status}</option>`).join("")}</select></label>
                        <label>Delivery tracking<input data-order-tracking="${escapeAdminHTML(order.id)}" maxlength="120" value="${escapeAdminHTML(order.tracking || "")}" placeholder="Tracking number or delivery note" ${order.status === "Cancelled" ? "disabled" : ""}></label>
                        <button class="small-btn delete-btn" type="button" data-order-cancel="${escapeAdminHTML(order.id)}" ${["Cancelled", "Delivered"].includes(order.status) ? "disabled" : ""}>Cancel order</button>
                    </div>
                    ${order.tracking ? `<p class="order-tracking-note"><b>Tracking:</b> ${escapeAdminHTML(order.tracking)}</p>` : ""}
                </article>`).join("")}</div>` : '<div class="product-empty-state"><strong>No customer orders yet</strong><p>Orders placed through the storefront will appear here.</p></div>'}
        </section>`;
    content.querySelectorAll("[data-order-status]").forEach(select => select.addEventListener("change", () => {
        const order = orders.find(item => item.id === select.dataset.orderStatus);
        if (!order) return;
        const previousStatus = order.status;
        order.status = select.value;
        if (!saveOrders()) { order.status = previousStatus; renderOrdersPage("Could not save the status change in browser storage."); return; }
        renderOrdersPage(`Updated ${order.id} to ${order.status}.`);
    }));
    content.querySelectorAll("[data-order-tracking]").forEach(input => input.addEventListener("change", () => {
        const order = orders.find(item => item.id === input.dataset.orderTracking);
        if (!order) return;
        const old = order.tracking || "";
        order.tracking = input.value.trim();
        if (!saveOrders()) { order.tracking = old; renderOrdersPage("Could not save tracking details in browser storage."); return; }
        renderOrdersPage(order.tracking ? `Saved delivery tracking for ${order.id}.` : `Cleared delivery tracking for ${order.id}.`);
    }));
    content.querySelectorAll("[data-order-cancel]").forEach(button => button.addEventListener("click", () => {
        const order = orders.find(item => item.id === button.dataset.orderCancel);
        if (!order || !window.confirm(`Cancel order ${order.id}?`)) return;
        const previousStatus = order.status;
        order.status = "Cancelled";
        const restored = [];
        order.items.forEach(item => {
            const product = products.find(candidate => candidate.id === item.id);
            if (product) { product.stock += Number(item.quantity) || 0; restored.push({ product, amount: Number(item.quantity) || 0 }); }
        });
        if (!saveOrders() || !saveProducts()) {
            order.status = previousStatus;
            restored.forEach(({ product, amount }) => { product.stock -= amount; });
            renderOrdersPage("Could not cancel the order because browser storage could not be updated.");
            return;
        }
        if (typeof refreshStorefrontProducts === "function") refreshStorefrontProducts();
        renderOrdersPage(`Order ${order.id} cancelled.`);
    }));
}

function renderCustomersPage() {
    if (!content) return;
    const profiles = new Map();
    const deletedKey = "shopease-deleted-customers-v1";
    const statusKey = "shopease-customer-status-v1";
    let deletedCustomers = [];
    let customerStatuses = {};
    try { deletedCustomers = JSON.parse(localStorage.getItem(deletedKey) || "[]"); } catch (error) { deletedCustomers = []; }
    try { customerStatuses = JSON.parse(localStorage.getItem(statusKey) || "{}"); } catch (error) { customerStatuses = {}; }
    orders.forEach(order => {
        const email = String(order.email || "").trim().toLocaleLowerCase();
        const phone = String(order.phone || "").trim();
        const key = email ? `email:${email}` : `phone:${phone}`;
        if (key === "phone:") return;
        if (!profiles.has(key)) profiles.set(key, { key, name: order.customer || "Customer", email: order.email || "", phone, address: order.address || "", orders: [] });
        const profile = profiles.get(key);
        profile.orders.push(order);
        if (order.createdAt >= (profile.lastOrderAt || "")) {
            profile.lastOrderAt = order.createdAt || "";
            profile.name = order.customer || profile.name;
            profile.phone = phone || profile.phone;
            profile.address = order.address || profile.address;
        }
    });
    const customerList = [...profiles.values()].filter(profile => !deletedCustomers.includes(profile.key)).sort((a, b) => (b.lastOrderAt || "").localeCompare(a.lastOrderAt || ""));
    content.innerHTML = `
        <section class="customer-management">
            <div class="orders-heading"><div><h2>Customer management</h2><p>Search customers, review their contact details and purchases, and manage profile status.</p></div><strong>${customerList.length} ${customerList.length === 1 ? "customer" : "customers"}</strong></div>
            <div class="product-toolbar customer-toolbar"><label class="visually-hidden" for="admin-customer-search">Search customers</label><input id="admin-customer-search" type="search" placeholder="Search name, email, or phone..."><label class="customer-filter-label" for="admin-customer-filter">Status</label><select id="admin-customer-filter"><option value="All">All customers</option><option>Active</option><option>Inactive</option></select></div>
            <div id="admin-customer-list" class="customer-list"></div>
            <div id="admin-customer-table" class="sales-table-wrap customer-table"></div>
            <dialog id="customer-profile-dialog" class="customer-profile-dialog"><button type="button" class="customer-dialog-close" aria-label="Close customer profile">×</button><div id="customer-profile-dialog-content"></div></dialog>
        </section>`;
    const search = document.getElementById("admin-customer-search");
    const statusFilter = document.getElementById("admin-customer-filter");
    const list = document.getElementById("admin-customer-list");
    const table = document.getElementById("admin-customer-table");
    const profileDialog = document.getElementById("customer-profile-dialog");
    const profileDialogContent = document.getElementById("customer-profile-dialog-content");
    function renderList() {
        const query = search.value.trim().toLocaleLowerCase();
        const filtered = customerList.filter(profile => `${profile.name} ${profile.email} ${profile.phone}`.toLocaleLowerCase().includes(query) && (statusFilter.value === "All" || (customerStatuses[profile.key] || "Active") === statusFilter.value));
        list.innerHTML = filtered.length ? filtered.map(profile => {
            const totalSpent = profile.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
            return `<article class="customer-profile-card"><header><div><h3>${escapeAdminHTML(profile.name)}</h3><p>${escapeAdminHTML(profile.email || "No email recorded")}</p><p>${escapeAdminHTML(profile.phone || "No phone recorded")}</p></div><span>${profile.orders.length} ${profile.orders.length === 1 ? "order" : "orders"} · ${formatCurrency(totalSpent)}</span></header><details><summary>Customer profile and order history</summary><div class="customer-profile-details"><p><b>Latest delivery address:</b> ${escapeAdminHTML(profile.address || "No address recorded")}</p><h4>Order history</h4><ul>${profile.orders.map(order => `<li><b>${escapeAdminHTML(order.id)}</b> · ${escapeAdminHTML(new Date(order.createdAt).toLocaleDateString())} · ${escapeAdminHTML(order.status || "New")} · ${formatCurrency(order.total || 0)}<br><span>${order.items.map(item => `${escapeAdminHTML(item.name)} × ${Number(item.quantity)}`).join(", ")}</span></li>`).join("")}</ul></div></details></article>`;
        }).join("") : '<div class="product-empty-state"><strong>No customers found</strong><p>Customers appear after an order is placed at checkout.</p></div>';
        list.querySelectorAll(".customer-profile-card").forEach((card, index) => {
            const profile = filtered[index];
            const actions = document.createElement("div");
            actions.className = "customer-actions";
            const statusLabel = document.createElement("label");
            statusLabel.textContent = "Customer status";
            const status = document.createElement("select");
            status.setAttribute("aria-label", `Status for ${profile.name}`);
            ["Active", "Inactive"].forEach(value => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                option.selected = (customerStatuses[profile.key] || "Active") === value;
                status.append(option);
            });
            status.addEventListener("change", () => {
                customerStatuses[profile.key] = status.value;
                try { localStorage.setItem(statusKey, JSON.stringify(customerStatuses)); }
                catch (error) { window.alert("Could not save customer status in this browser."); }
            });
            statusLabel.append(status);
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "small-btn delete-btn";
            remove.textContent = "Delete customer";
            remove.addEventListener("click", () => {
                if (!window.confirm(`Remove the customer profile for ${profile.name}? Their order records will remain in Order Management.`)) return;
                deletedCustomers.push(profile.key);
                try { localStorage.setItem(deletedKey, JSON.stringify(deletedCustomers)); }
                catch (error) { deletedCustomers.pop(); window.alert("Could not delete customer profile in this browser."); return; }
                renderCustomersPage();
            });
            actions.append(statusLabel, remove);
            card.querySelector("header").after(actions);
        });
        table.innerHTML = filtered.length ? `<table><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Orders</th><th>Total spent</th><th>Status</th><th>Actions</th></tr></thead><tbody>${filtered.map(profile => {
            const spent = profile.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
            const status = customerStatuses[profile.key] || "Active";
            return `<tr><td><strong>${escapeAdminHTML(profile.name)}</strong></td><td>${escapeAdminHTML(profile.email || "—")}</td><td>${escapeAdminHTML(profile.phone || "—")}</td><td>${profile.orders.length}</td><td>${formatCurrency(spent)}</td><td><select data-table-customer-status="${escapeAdminHTML(profile.key)}" aria-label="Status for ${escapeAdminHTML(profile.name)}"><option ${status === "Active" ? "selected" : ""}>Active</option><option ${status === "Inactive" ? "selected" : ""}>Inactive</option></select></td><td><button type="button" class="view-orders" data-customer-profile="${escapeAdminHTML(profile.key)}">View profile</button> <button type="button" class="small-btn delete-btn" data-customer-delete="${escapeAdminHTML(profile.key)}">Delete</button></td></tr>`;
        }).join("")}</tbody></table>` : '<div class="product-empty-state"><strong>No customers found</strong><p>Try another search or status filter. Customers appear after an order is placed.</p></div>';
        table.querySelectorAll("[data-table-customer-status]").forEach(select => select.addEventListener("change", () => {
            customerStatuses[select.dataset.tableCustomerStatus] = select.value;
            try { localStorage.setItem(statusKey, JSON.stringify(customerStatuses)); renderList(); }
            catch (error) { window.alert("Could not save customer status in this browser."); }
        }));
        table.querySelectorAll("[data-customer-profile]").forEach(button => button.addEventListener("click", () => {
            const profile = customerList.find(item => item.key === button.dataset.customerProfile);
            if (!profile) return;
            profileDialogContent.innerHTML = `<h2>${escapeAdminHTML(profile.name)}</h2><p><b>Email:</b> ${escapeAdminHTML(profile.email || "Not recorded")}</p><p><b>Phone:</b> ${escapeAdminHTML(profile.phone || "Not recorded")}</p><p><b>Latest delivery address:</b> ${escapeAdminHTML(profile.address || "Not recorded")}</p><p><b>Status:</b> ${escapeAdminHTML(customerStatuses[profile.key] || "Active")}</p><h3>Order history</h3>${profile.orders.length ? `<div class="sales-table-wrap"><table><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Items</th><th>Total</th></tr></thead><tbody>${profile.orders.map(order => `<tr><td>${escapeAdminHTML(order.id)}</td><td>${escapeAdminHTML(new Date(order.createdAt).toLocaleDateString())}</td><td>${escapeAdminHTML(order.status || "New")}</td><td>${order.items.map(item => `${escapeAdminHTML(item.name)} × ${Number(item.quantity)}`).join(", ")}</td><td>${formatCurrency(order.total || 0)}</td></tr>`).join("")}</tbody></table></div>` : "<p>No past orders.</p>"}`;
            profileDialog.showModal();
        }));
        table.querySelectorAll("[data-customer-delete]").forEach(button => button.addEventListener("click", () => {
            const profile = customerList.find(item => item.key === button.dataset.customerDelete);
            if (!profile || !window.confirm(`Remove the customer profile for ${profile.name}? Their order records will remain in Order Management.`)) return;
            deletedCustomers.push(profile.key);
            try { localStorage.setItem(deletedKey, JSON.stringify(deletedCustomers)); renderCustomersPage(); }
            catch (error) { deletedCustomers.pop(); window.alert("Could not delete customer profile in this browser."); }
        }));
    }
    search.addEventListener("input", renderList);
    statusFilter.addEventListener("change", renderList);
    profileDialog.querySelector(".customer-dialog-close").addEventListener("click", () => profileDialog.close());
    profileDialog.addEventListener("click", event => { if (event.target === profileDialog) profileDialog.close(); });
    renderList();
}

function renderInventoryPage(message = "") {
    if (!content) return;
    const lowStock = products.filter(product => product.stock > 0 && product.stock <= 5).length;
    const outOfStock = products.filter(product => product.stock === 0).length;
    content.innerHTML = `
        <section class="inventory-management">
            <div class="orders-heading"><div><h2>Inventory management</h2><p>Available units and stock alerts for every product.</p></div></div>
            <div class="inventory-alerts"><article><span>Products</span><strong>${products.length}</strong></article><article class="inventory-low-alert"><span>Low stock · 5 or fewer</span><strong>${lowStock}</strong></article><article class="inventory-out-alert"><span>Out of stock</span><strong>${outOfStock}</strong></article></div>
            <p class="category-message" role="status" aria-live="polite">${escapeAdminHTML(message)}</p>
            <div class="inventory-list">${products.map(product => `<article class="inventory-row"><div class="inventory-product"><strong>${escapeAdminHTML(product.name)}</strong><span>${escapeAdminHTML(product.category)} · ${formatCurrency(product.price)}</span></div><span class="stock-pill ${product.stock === 0 ? "stock-out" : product.stock <= 5 ? "stock-low" : ""}">${product.stock === 0 ? "Out of stock" : product.stock <= 5 ? "Low stock" : "In stock"}</span><label>Available stock<input type="number" min="0" max="1000000" step="1" value="${product.stock}" data-inventory-quantity="${product.id}" aria-label="Available stock for ${escapeAdminHTML(product.name)}"></label><button class="view-orders" type="button" data-inventory-save="${product.id}">Update quantity</button></article>`).join("") || '<p class="category-empty">Add products to manage stock.</p>'}</div>
        </section>`;
    content.querySelectorAll("[data-inventory-save]").forEach(button => button.addEventListener("click", () => {
        const id = Number(button.dataset.inventorySave);
        const product = products.find(item => item.id === id);
        const input = content.querySelector(`[data-inventory-quantity="${id}"]`);
        const quantity = Number(input.value);
        if (!product || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) {
            renderInventoryPage("Enter a whole number from 0 to 1,000,000.");
            return;
        }
        const previous = product.stock;
        product.stock = quantity;
        if (!saveProducts()) { product.stock = previous; renderInventoryPage("Could not save inventory in browser storage."); return; }
        if (typeof refreshStorefrontProducts === "function") refreshStorefrontProducts();
        renderInventoryPage(`Updated ${product.name}: ${quantity} available.`);
    }));
}

function salesDateKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function renderSalesPage(fromDate, toDate) {
    if (!content) return;
    const today = new Date();
    const todayKey = salesDateKey(today);
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const activeOrders = orders.filter(order => order.status !== "Cancelled");
    const todayOrders = activeOrders.filter(order => salesDateKey(order.createdAt) === todayKey);
    const monthOrders = activeOrders.filter(order => salesDateKey(order.createdAt).startsWith(currentMonthKey));
    const todayTotal = todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const monthTotal = monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index));
        const key = salesDateKey(date);
        const dayOrders = activeOrders.filter(order => salesDateKey(order.createdAt) === key);
        return { date, orders: dayOrders.length, revenue: dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0) };
    });
    const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const monthOrdersForPeriod = activeOrders.filter(order => salesDateKey(order.createdAt).startsWith(key));
        return { label: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }), revenue: monthOrdersForPeriod.reduce((sum, order) => sum + Number(order.total || 0), 0), count: monthOrdersForPeriod.length };
    });
    const bestSellers = new Map();
    activeOrders.forEach(order => order.items.forEach(item => {
        const entry = bestSellers.get(item.name) || { name: item.name, units: 0, revenue: 0 };
        entry.units += Number(item.quantity || 0);
        entry.revenue += Number(item.price || 0) * Number(item.quantity || 0);
        bestSellers.set(item.name, entry);
    }));
    const sortedBestSellers = [...bestSellers.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 10);
    const renderRevenueChart = (items, labelFor, chartName) => {
        const width = 640, height = 220, left = 42, right = 12, top = 16, bottom = 42;
        const plotWidth = width - left - right, plotHeight = height - top - bottom;
        const maxValue = Math.max(1, ...items.map(item => item.revenue));
        const slot = plotWidth / Math.max(items.length, 1), barWidth = Math.min(42, slot * 0.58);
        const grid = [0, 1, 2, 3].map(i => {
            const y = top + plotHeight * i / 3;
            return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="currentColor" opacity=".12"/><text x="${left - 7}" y="${y + 4}" text-anchor="end" font-size="10" fill="currentColor">${Math.round(maxValue * (3 - i) / 3)}</text>`;
        }).join("");
        const bars = items.map((item, i) => {
            const barHeight = item.revenue / maxValue * plotHeight;
            const x = left + slot * i + (slot - barWidth) / 2;
            const y = top + plotHeight - barHeight;
            return `<g><title>${escapeAdminHTML(labelFor(item))}: ${formatCurrency(item.revenue)}</title><rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(1, barHeight)}" rx="5" fill="#b66f52"/><text x="${x + barWidth / 2}" y="${height - 15}" text-anchor="middle" font-size="10" fill="currentColor">${escapeAdminHTML(labelFor(item))}</text></g>`;
        }).join("");
        return `<svg class="revenue-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${chartName} revenue chart">${grid}${bars}</svg>`;
    };
    const start = fromDate || `${currentMonthKey}-01`;
    const end = toDate || todayKey;
    const reportOrders = activeOrders.filter(order => {
        const key = salesDateKey(order.createdAt);
        return key && key >= start && key <= end;
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const reportRevenue = reportOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const csvCell = value => {
        const safeValue = /^[\s]*[=+@-]/.test(String(value ?? "")) ? `'${value}` : value;
        return `"${String(safeValue ?? "").replace(/"/g, '""')}"`;
    };
    content.innerHTML = `
        <section class="sales-management">
            <div class="orders-heading"><div><h2>Sales &amp; Analytics</h2><p>Revenue, orders, and best sellers calculated from ShopEase checkout orders.</p></div></div>
            <div class="sales-summary-grid"><article><span>Today's revenue</span><strong>${formatCurrency(todayTotal)}</strong><small>${todayOrders.length} ${todayOrders.length === 1 ? "order" : "orders"}</small></article><article><span>Monthly revenue</span><strong>${formatCurrency(monthTotal)}</strong><small>${monthOrders.length} ${monthOrders.length === 1 ? "order" : "orders"} this month</small></article><article><span>Total revenue</span><strong>${formatCurrency(activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0))}</strong><small>${activeOrders.length} active orders</small></article><article><span>Units sold</span><strong>${activeOrders.reduce((sum, order) => sum + order.items.reduce((count, item) => count + Number(item.quantity || 0), 0), 0)}</strong><small>Across active orders</small></article></div>
            <div class="sales-report-grid">
                <section class="sales-panel"><h3>Daily sales · last 7 days</h3><div class="sales-table-wrap"><table><thead><tr><th>Date</th><th>Orders</th><th>Sales</th></tr></thead><tbody>${lastSevenDays.map(day => `<tr><td>${escapeAdminHTML(day.date.toLocaleDateString())}</td><td>${day.orders}</td><td>${formatCurrency(day.revenue)}</td></tr>`).join("")}</tbody></table></div></section>
                <section class="sales-panel"><h3>Monthly revenue · last 6 months</h3><div class="sales-table-wrap"><table><thead><tr><th>Month</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>${monthlyRevenue.map(month => `<tr><td>${escapeAdminHTML(month.label)}</td><td>${month.count}</td><td>${formatCurrency(month.revenue)}</td></tr>`).join("")}</tbody></table></div></section>
                <section class="sales-panel"><h3>Best-selling products</h3>${sortedBestSellers.length ? `<div class="sales-table-wrap"><table><thead><tr><th>Product</th><th>Units</th><th>Sales</th></tr></thead><tbody>${sortedBestSellers.map(item => `<tr><td>${escapeAdminHTML(item.name)}</td><td>${item.units}</td><td>${formatCurrency(item.revenue)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="sales-empty">No sales recorded yet.</p>'}</section>
            </div>
            <section class="sales-panel sales-report-panel"><div class="sales-report-heading"><div><h3>Sales report</h3><p>${reportOrders.length} orders · ${formatCurrency(reportRevenue)}</p></div><button id="sales-export-csv" class="view-orders" type="button" ${reportOrders.length ? "" : "disabled"}>Download CSV</button></div>
                <form id="sales-date-filter" class="sales-date-filter"><label>From<input name="from" type="date" value="${escapeAdminHTML(start)}" required></label><label>To<input name="to" type="date" value="${escapeAdminHTML(end)}" required></label><button class="view-orders" type="submit">Apply dates</button></form>
                <div class="sales-table-wrap"><table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Status</th><th>Items</th><th>Total</th></tr></thead><tbody>${reportOrders.map(order => `<tr><td>${escapeAdminHTML(order.id)}</td><td>${escapeAdminHTML(new Date(order.createdAt).toLocaleString())}</td><td>${escapeAdminHTML(order.customer)}</td><td>${escapeAdminHTML(order.status || "New")}</td><td>${order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</td><td>${formatCurrency(order.total || 0)}</td></tr>`).join("") || '<tr><td colspan="6">No orders in this date range.</td></tr>'}</tbody></table></div>
            </section>
        </section>`;
    const chartPanels = content.querySelectorAll(".sales-report-grid .sales-panel");
    if (chartPanels[0]) chartPanels[0].querySelector("h3").insertAdjacentHTML("afterend", renderRevenueChart(lastSevenDays, day => day.date.toLocaleDateString(undefined, { weekday: "short" }), "Daily"));
    if (chartPanels[1]) chartPanels[1].querySelector("h3").insertAdjacentHTML("afterend", renderRevenueChart(monthlyRevenue, month => month.label.slice(0, 3), "Monthly"));
    const pdfButton = document.createElement("button");
    pdfButton.id = "sales-export-pdf";
    pdfButton.className = "view-orders";
    pdfButton.type = "button";
    pdfButton.textContent = "Export PDF";
    document.querySelector(".sales-report-heading").append(pdfButton);
    pdfButton.addEventListener("click", () => {
        document.body.classList.add("printing-sales-report");
        window.print();
        window.setTimeout(() => document.body.classList.remove("printing-sales-report"), 1000);
    });
    document.getElementById("sales-date-filter").addEventListener("submit", event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const from = String(data.get("from") || "");
        const to = String(data.get("to") || "");
        renderSalesPage(from <= to ? from : to, from <= to ? to : from);
    });
    document.getElementById("sales-export-csv").addEventListener("click", () => {
        const rows = [["Order ID", "Date", "Customer", "Email", "Phone", "Status", "Items", "Total INR"], ...reportOrders.map(order => [order.id, order.createdAt, order.customer, order.email || "", order.phone || "", order.status || "New", order.items.map(item => `${item.name} x ${item.quantity}`).join("; "), Number(order.total || 0).toFixed(2)])];
        const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        link.download = `shopease-sales-${start}-to-${end}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
}

function renderAdminPage(page) {
    if (!content) return;

    const title = document.getElementById("admin-page-title");
    if (title) title.textContent = page;

    if (page === "Dashboard") {
        content.innerHTML = dashboardHTML;
        updateDashboard();
        return;
    }

    if (page === "Products") {
        renderProductsPage();
        return;
    }

    if (page === "Categories") {
        renderCategoryManagementPage();
        return;
    }

    if (page === "Settings") {
        renderSettingsPage();
        return;
    }

    if (page === "Orders") {
        renderOrdersPage();
        return;
    }

    if (page === "Customers") {
        renderCustomersPage();
        return;
    }

    if (page === "Inventory") {
        renderInventoryPage();
        return;
    }

    if (page === "Sales") {
        renderSalesPage();
        return;
    }

    content.innerHTML = `
        <div class="orders-section">
            <h2>${escapeAdminHTML(page)} Management</h2>
            <p>This section will be developed in the next steps.</p>
        </div>
    `;
}

if (openAdmin && storefront && adminDashboard) {
    openAdmin.addEventListener("click", function () {
        storefront.style.display = "none";
        adminDashboard.style.display = "block";
        renderAdminPage("Dashboard");
    });
}

const backToShop = document.getElementById("back-to-shop");
if (backToShop && storefront && adminDashboard) {
    backToShop.addEventListener("click", function () {
        adminDashboard.style.display = "none";
        storefront.style.display = "block";
    });
}

applyAdminSettings();
if (window.location.protocol !== "file:") {
    const adminKey = requestAdminApiKey();
    if (adminKey) fetch("/api/orders", { headers: { Authorization: `Bearer ${adminKey}` } })
        .then(response => {
            if (!response.ok) throw new Error("Could not load orders from MongoDB. Check the admin key.");
            return response.json();
        })
        .then(remoteOrders => {
            if (!Array.isArray(remoteOrders)) return;
            orders.splice(0, orders.length, ...remoteOrders);
            localStorage.setItem("shopease-orders-v1", JSON.stringify(orders));
            updateDashboard();
            const activePage = document.querySelector(".admin-nav.active")?.dataset.page;
            if (activePage === "Orders" || activePage === "Dashboard") renderAdminPage(activePage);
        })
        .catch(error => console.error(error));
}
const adminButtons = document.querySelectorAll(".admin-nav");
adminButtons.forEach(button => {
    button.addEventListener("click", function () {
        adminButtons.forEach(btn => btn.classList.remove("active"));
        this.classList.add("active");
        renderAdminPage(this.dataset.page);
    });
});

document.querySelectorAll(".view-orders[data-page='Orders']").forEach(button => {
    button.addEventListener("click", function () {
        const ordersButton = document.querySelector('.admin-nav[data-page="Orders"]');
        if (ordersButton) ordersButton.click();
    });
});
