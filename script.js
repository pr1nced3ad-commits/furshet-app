// === script.js (полностью исправленный вариант) ===
document.addEventListener('DOMContentLoaded', function() {

    const webApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

    // --- НАСТРОЙКИ ---
    const BACKEND_URL = 'https://functions.yandexcloud.net/d4ejsg34lsdstd4de2ug';
    const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjs3r3_rV1jSs0d2KNQ9PIjip7nGdnSgKcj2kt6FqlZMCmWEd6M__nbdiPEQ5vJpDempKO-ykzQdbu/pub?gid=0&single=true&output=csv';
    const CURRENCY = '₽';
    
    let menu = {};
    const cart = {};

    // === 1. ЗАГРУЗКА МЕНЮ ===
    async function loadAndRenderMenu() {
        try {
            const accordion = document.getElementById('menu-accordion');
            accordion.innerHTML = '<p style="text-align: center;">Загрузка меню...</p>';

            const response = await fetch(GOOGLE_SHEET_CSV_URL);
            if (!response.ok) throw new Error('Ошибка сети при загрузке меню');
            const csvText = await response.text();
            const rows = csvText.split('\n').slice(1);
            const parsedMenu = {};

            rows.forEach(row => {
                const columns = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
                if (columns.length < 4) return;
                const cleanColumns = columns.map(col => col.trim().replace(/^"|"$/g, ''));
                const item = { 
                    id: parseInt(cleanColumns[0]), 
                    category: cleanColumns[1], 
                    name: cleanColumns[2], 
                    price: parseFloat(cleanColumns[3]) 
                };
                if (!item.id || !item.category || !item.name || isNaN(item.price)) return;
                if (!parsedMenu[item.category]) parsedMenu[item.category] = [];
                parsedMenu[item.category].push(item);
            });

            menu = parsedMenu;
            renderAccordion();
            updateAllDisplays(); // обновляем корзину после загрузки меню

        } catch (error) {
            console.error(error);
            const accordion = document.getElementById('menu-accordion');
            accordion.innerHTML = '<p style="text-align: center; color: red;">Не удалось загрузить меню.</p>';
            if (webApp) webApp.showAlert('Не удалось загрузить меню. Попробуйте позже.');
        }
    }

    // === 2. ОТРИСОВКА МЕНЮ ===
    function renderAccordion() {
        const accordion = document.getElementById('menu-accordion');
        accordion.innerHTML = '';
        const categories = Object.keys(menu);

        categories.forEach(category => {
            const itemWrapper = document.createElement('div');
            itemWrapper.className = 'accordion-item';

            const header = document.createElement('div');
            header.className = 'accordion-header';
            header.innerText = category;

            const content = document.createElement('div');
            content.className = 'accordion-content';

            menu[category].forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'menu-item';
                itemDiv.innerHTML = `
                    <div class="item-info">
                        <p><strong>${item.name}</strong></p>
                        <p class="item-price">${item.price} ${CURRENCY}</p>
                    </div>
                    <div class="item-controls">
                        <button class="btn-remove" data-id="${item.id}">-</button>
                        <span id="quantity-${item.id}">0</span>
                        <button class="btn-add" data-id="${item.id}">+</button>
                    </div>
                `;
                content.appendChild(itemDiv);
            });

            itemWrapper.appendChild(header);
            itemWrapper.appendChild(content);
            accordion.appendChild(itemWrapper);

            // поведение аккордеона категорий
            header.addEventListener('click', () => {
                header.classList.toggle('active');
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                    content.style.padding = "0 15px";
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.style.padding = "10px 15px";
                }
            });
        });

        // делегирование событий на + и -
        accordion.addEventListener('click', function(e) {
            const addBtn = e.target.closest('.btn-add');
            const remBtn = e.target.closest('.btn-remove');
            if (addBtn) addToCart(parseInt(addBtn.dataset.id));
            if (remBtn) removeFromCart(parseInt(remBtn.dataset.id));
        });
    }

    // === 3. ЛОГИКА КОРЗИНЫ ===
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

    // === 4. ЕДИНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ ===
    function updateAllDisplays() {
        // обновляем количество возле кнопок
        for (const category in menu) {
            menu[category].forEach(item => {
                const quantitySpan = document.getElementById(`quantity-${item.id}`);
                if (quantitySpan) quantitySpan.innerText = cart[item.id] || 0;
            });
        }

        const cartHeader = document.getElementById('cart-header');
        const cartItemsList = document.getElementById('cart-items-list');
        const emptyCartMessage = document.getElementById('empty-cart-message');
        const totalPriceEl = document.getElementById('total-price');
        if (!cartHeader || !cartItemsList || !emptyCartMessage || !totalPriceEl) return;

        cartItemsList.innerHTML = '';
        let totalPrice = 0;
        let totalItems = 0;

        // исправленный цикл — теперь обновляет все товары корректно
        for (const idKey in cart) {
            const qty = cart[idKey];
            totalItems += qty;

            let menuItem = null;
            for (const category in menu) {
                const found = menu[category].find(item => item.id === parseInt(idKey));
                if (found) { menuItem = found; break; }
            }

            if (menuItem) {
                const itemTotalPrice = menuItem.price * qty;
                totalPrice += itemTotalPrice;
                const listItem = document.createElement('li');
                listItem.innerHTML = `<span>${menuItem.name} x${qty}</span><strong>${itemTotalPrice} ${CURRENCY}</strong>`;
                cartItemsList.appendChild(listItem);
            }
        }

        if (totalItems > 0) {
            cartHeader.innerText = `🛒 Ваш заказ (${totalItems} шт.)`;
            emptyCartMessage.style.display = 'none';
        } else {
            cartHeader.innerText = '🛒 Ваша корзина';
            cartItemsList.appendChild(emptyCartMessage);
            emptyCartMessage.style.display = 'block';
        }

        totalPriceEl.innerText = totalPrice;

        if (webApp) {
            if (totalItems > 0) {
                webApp.MainButton.setText(`Оформить заказ (${totalPrice} ${CURRENCY})`);
                if (!webApp.MainButton.isVisible) webApp.MainButton.show();
            } else {
                webApp.MainButton.hide();
            }
        }
    }

    // === 5. ОТКРЫТИЕ / ЗАКРЫТИЕ КОРЗИНЫ ===
    const cartHeader = document.getElementById('cart-header');
    const cartContent = document.getElementById('cart-content');
    if (cartHeader && cartContent) {
        cartHeader.addEventListener('click', () => {
            cartHeader.classList.toggle('active');
            if (cartContent.style.maxHeight) {
                cartContent.style.maxHeight = null;
                cartContent.style.padding = "0 15px";
            } else {
                cartContent.style.maxHeight = cartContent.scrollHeight + "px";
                cartContent.style.padding = "10px 15px";
            }
        });
    }

    // === 6. КНОПКА "ОФОРМИТЬ ЗАКАЗ" ===
    if (webApp) {
        webApp.onEvent('mainButtonClicked', function() {
            const orderData = { 
                cart: {}, 
                totalPrice: 0, 
                userInfo: webApp.initDataUnsafe ? webApp.initDataUnsafe.user : {} 
            };

            let total = 0;
            for (const idKey in cart) {
                const qty = cart[idKey];
                let menuItem = null;
                for (const category in menu) {
                    const found = menu[category].find(item => item.id === parseInt(idKey));
                    if (found) { menuItem = found; break; }
                }
                if (menuItem) {
                    orderData.cart[menuItem.name] = { quantity: qty, price: menuItem.price };
                    total += menuItem.price * qty;
                }
            }
            orderData.totalPrice = total;

            try { webApp.MainButton.showProgress(); } catch(e) {}

            try {
                webApp.sendData(JSON.stringify(orderData));
            } catch (e) {
                console.error('Ошибка при отправке:', e);
                webApp.showAlert('Ошибка отправки заказа. Попробуйте снова.');
            } finally {
                try { webApp.MainButton.hideProgress(); } catch(e) {}
            }
        });
    }

    // === 7. ИНИЦИАЛИЗАЦИЯ ===
    if (webApp && webApp.expand) webApp.expand();
    loadAndRenderMenu();
});
