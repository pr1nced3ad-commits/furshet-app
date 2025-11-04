// === script.js — финальный стабильный релиз ===
document.addEventListener("DOMContentLoaded", function () {
    const webApp = window.Telegram?.WebApp;
    const GOOGLE_SHEET_CSV_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRjs3r3_rV1jSs0d2KNQ9PIjip7nGdnSgKcj2kt6FqlZMCmWEd6M__nbdiPEQ5vJpDempKO-ykzQdbu/pub?gid=0&single=true&output=csv";
    const CURRENCY = "₽";

    let menu = {};
    const cart = {};

    // === Загрузка и рендер меню ===
    async function loadAndRenderMenu() {
        try {
            const acc = document.getElementById("menu-accordion");
            acc.innerHTML = "<p style='text-align:center;'>Загрузка меню...</p>";

            const response = await fetch(GOOGLE_SHEET_CSV_URL);
            if (!response.ok) throw new Error("Ошибка загрузки меню");
            const csvText = await response.text();
            const rows = csvText.split("\n").slice(1);

            const parsedMenu = {};
            rows.forEach((row) => {
                const cols = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
                if (cols.length < 4) return;
                const clean = cols.map((c) => c.trim().replace(/^"|"$/g, ""));
                const id = clean[0].trim();
                const category = clean[1];
                const name = clean[2];
                const price = parseFloat(clean[3].replace(",", "."));
                if (!id || !category || !name || isNaN(price)) return;
                if (!parsedMenu[category]) parsedMenu[category] = [];
                parsedMenu[category].push({ id, category, name, price });
            });

            menu = parsedMenu;
            console.log("MENU LOADED", menu);
            renderAccordion();
            updateAllDisplays();
        } catch (e) {
            console.error(e);
            document.getElementById("menu-accordion").innerHTML =
                "<p style='color:red;text-align:center;'>Ошибка загрузки меню</p>";
            webApp?.showAlert("Не удалось загрузить меню. Попробуйте позже.");
        }
    }

    // === Аккордеон ===
    function renderAccordion() {
        const acc = document.getElementById("menu-accordion");
        acc.innerHTML = "";

        Object.keys(menu).forEach((category) => {
            const itemWrap = document.createElement("div");
            itemWrap.className = "accordion-item";

            const header = document.createElement("div");
            header.className = "accordion-header";
            header.innerText = category;

            const content = document.createElement("div");
            content.className = "accordion-content";

            menu[category].forEach((item) => {
                const div = document.createElement("div");
                div.className = "menu-item";
                div.innerHTML = `
                    <div class="item-info">
                        <p><strong>${item.name}</strong></p>
                        <p class="item-price">${item.price} ${CURRENCY}</p>
                    </div>
                    <div class="item-controls">
                        <button class="btn-minus" data-id="${item.id}">-</button>
                        <span id="quantity-${item.id}">0</span>
                        <button class="btn-plus" data-id="${item.id}">+</button>
                    </div>
                `;
                content.appendChild(div);
            });

            itemWrap.appendChild(header);
            itemWrap.appendChild(content);
            acc.appendChild(itemWrap);

            header.addEventListener("click", () => {
                header.classList.toggle("active");
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                    content.style.padding = "0 15px";
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.style.padding = "10px 15px";
                }
            });
        });

        // Глобальный делегат событий (важно!)
        acc.addEventListener("click", (e) => {
            const plus = e.target.closest(".btn-plus");
            const minus = e.target.closest(".btn-minus");
            if (plus) addToCart(plus.dataset.id);
            if (minus) removeFromCart(minus.dataset.id);
        });
    }

    // === Управление корзиной ===
    function addToCart(id) {
        cart[id] = (cart[id] || 0) + 1;
        updateAllDisplays();
    }

    function removeFromCart(id) {
        if (cart[id]) {
            cart[id]--;
            if (cart[id] <= 0) delete cart[id];
            updateAllDisplays();
        }
    }

    // === Обновление интерфейса ===
    function updateAllDisplays() {
        // Обновляем счётчики рядом с товарами
        Object.values(menu).flat().forEach((item) => {
            const span = document.getElementById(`quantity-${item.id}`);
            if (span) span.innerText = cart[item.id] || 0;
        });

        const cartHeader = document.getElementById("cart-header");
        const cartItemsList = document.getElementById("cart-items-list");
        const emptyMsg = document.getElementById("empty-cart-message");
        const totalEl = document.getElementById("total-price");

        cartItemsList.innerHTML = "";
        let totalPrice = 0;
        let totalItems = 0;

        Object.keys(cart).forEach((id) => {
            const qty = cart[id];
            const found = Object.values(menu).flat().find((it) => it.id === id);
            if (!found) return;
            const itemTotal = found.price * qty;
            totalPrice += itemTotal;
            totalItems += qty;

            const li = document.createElement("li");
            li.innerHTML = `<span>${found.name} x${qty}</span><strong>${itemTotal} ${CURRENCY}</strong>`;
            cartItemsList.appendChild(li);
        });

        if (totalItems > 0) {
            cartHeader.innerText = `🛒 Ваш заказ (${totalItems} шт.)`;
            emptyMsg.style.display = "none";
        } else {
            cartHeader.innerText = "🛒 Ваша корзина";
            cartItemsList.appendChild(emptyMsg);
            emptyMsg.style.display = "block";
        }

        const rounded = Math.round(totalPrice);
        totalEl.innerText = rounded;
        console.log("CART", cart, "TOTAL_PRICE", rounded);

        if (webApp) {
            if (totalItems > 0) {
                webApp.MainButton.setText(`Оформить заказ (${rounded} ${CURRENCY})`);
                webApp.MainButton.show();
            } else {
                webApp.MainButton.hide();
            }
        }
    }

    // === Открытие/закрытие корзины ===
    const cartHeader = document.getElementById("cart-header");
    const cartContent = document.getElementById("cart-content");
    if (cartHeader && cartContent) {
        cartHeader.addEventListener("click", () => {
            cartHeader.classList.toggle("active");
            if (cartContent.style.maxHeight) {
                cartContent.style.maxHeight = null;
                cartContent.style.padding = "0 15px";
            } else {
                cartContent.style.maxHeight = cartContent.scrollHeight + "px";
                cartContent.style.padding = "10px 15px";
            }
        });
    }

    // === Telegram Main Button ===
    webApp?.onEvent("mainButtonClicked", () => {
        const order = {
            cart: {},
            totalPrice: 0,
            userInfo: webApp.initDataUnsafe?.user || {},
        };
        let sum = 0;
        Object.keys(cart).forEach((id) => {
            const found = Object.values(menu).flat().find((it) => it.id === id);
            if (!found) return;
            order.cart[found.name] = { quantity: cart[id], price: found.price };
            sum += found.price * cart[id];
        });
        order.totalPrice = Math.round(sum);
        webApp.sendData(JSON.stringify(order));
    });

    // === Инициализация ===
    webApp?.expand();
    loadAndRenderMenu();
});
