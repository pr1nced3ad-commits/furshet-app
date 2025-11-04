// === script.js — финальная стабильная версия ===
document.addEventListener('DOMContentLoaded', function() {

    const webApp = window.Telegram?.WebApp;
    const GOOGLE_SHEET_CSV_URL =
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjs3r3_rV1jSs0d2KNQ9PIjip7nGdnSgKcj2kt6FqlZMCmWEd6M__nbdiPEQ5vJpDempKO-ykzQdbu/pub?gid=0&single=true&output=csv';
    const CURRENCY = '₽';

    let menu = {};
    const cart = {};

    // ===== ЗАГРУЗКА МЕНЮ =====
    async function loadAndRenderMenu() {
        try {
            const accordion = document.getElementById('menu-accordion');
            accordion.innerHTML = '<p style="text-align:center;">Загрузка меню...</p>';

            const response = await fetch(GOOGLE_SHEET_CSV_URL);
            if (!response.ok) throw new Error('Ошибка сети');
            const csvText = await response.text();

            const rows = csvText.split('\n').slice(1);
            const parsedMenu = {};
            rows.forEach(row => {
                const cols = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
                if (cols.length < 4) return;
                const clean = cols.map(c => c.trim().replace(/^"|"$/g, ''));
                const id = Number(String(clean[0]).trim());
                const cat = clean[1];
                const name = clean[2];
                const price = Number(String(clean[3]).replace(',', '.'));
                if (!cat || !name || isNaN(price)) return;
                if (!parsedMenu[cat]) parsedMenu[cat] = [];
                parsedMenu[cat].push({ id, category: cat, name, price });
            });

            menu = parsedMenu;
            renderAccordion();
            updateAllDisplays();
        } catch (e) {
            console.error(e);
            document.getElementById('menu-accordion').innerHTML =
                '<p style="color:red;text-align:center;">Ошибка загрузки меню</p>';
            if (webApp) webApp.showAlert('Не удалось загрузить меню. Попробуйте позже.');
        }
    }

    // ===== ОТРИСОВКА МЕНЮ =====
    function renderAccordion() {
        const accordion = document.getElementById('menu-accordion');
        accordion.innerHTML = '';

        Object.keys(menu).forEach(category => {
            const wrap = document.createElement('div');
            wrap.className = 'accordion-item';
            const header = document.createElement('div');
            header.className = 'accordion-header';
            header.innerText = category;
            const content = document.createElement('div');
            content.className = 'accordion-content';

            menu[category].forEach(item => {
                const el = document.createElement('div');
                el.className = 'menu-item';
                el.innerHTML = `
                    <div class="item-info">
                        <p><strong>${item.name}</strong></p>
                        <p class="item-price">${item.price} ${CURRENCY}</p>
                    </div>
                    <div class="item-controls">
                        <button class="btn-remove" data-id="${item.id}">-</button>
                        <span id="quantity-${item.id}">0</span>
                        <button class="btn-add" data-id="${item.id}">+</button>
                    </div>`;
                content.appendChild(el);
            });

            wrap.appendChild(header);
            wrap.appendChild(content);
            accordion.appendChild(wrap);

            header.addEventListener('click', () => {
                header.classList.toggle('active');
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                    content.style.padding = '0 15px';
                } else {
                    content.style.maxHeight = content.scrollHeight + 'px';
                    content.style.padding = '10px 15px';
                }
            });
        });

        accordion.addEventListener('click', e => {
            const plus = e.target.closest('.btn-add');
            const minus = e.target.closest('.btn-remove');
            if (plus) addToCart(plus.dataset.id);
            if (minus) removeFromCart(minus.dataset.id);
        });
    }

    // ===== КОРЗИНА =====
    function addToCart(rawId) {
        const id = String(rawId).trim();
        cart[id] = (cart[id] || 0) + 1;
        updateAllDisplays();
    }

    function removeFromCart(rawId) {
        const id = String(rawId).trim();
        if (cart[id]) {
            cart[id]--;
            if (cart[id] <= 0) delete cart[id];
            updateAllDisplays();
        }
    }

    // ===== ОБНОВЛЕНИЕ ЭКРАНА =====
    function updateAllDisplays() {
        // Обновляем счётчики возле товаров
        for (const cat in menu) {
            menu[cat].forEach(item => {
                const q = document.getElementById(`quantity-${item.id}`);
                if (q) q.innerText = cart[String(item.id).trim()] || 0;
            });
        }

        // Перерисовываем корзину
        const cartHeader = document.getElementById('cart-header');
        const cartItemsList = document.getElementById('cart-items-list');
        const emptyMsg = document.getElementById('empty-cart-message');
        const totalEl = document.getElementById('total-price');
        if (!cartHeader || !cartItemsList || !emptyMsg || !totalEl) return;

        cartItemsList.innerHTML = '';
        let totalItems = 0;
        let totalPrice = 0;

        // главный цикл: все товары в корзине
        Object.keys(cart).forEach(idKey => {
            const qty = Number(cart[idKey]) || 0;
            totalItems += qty;

            let found = null;
            for (const cat in menu) {
                found = menu[cat].find(i => Number(i.id) === Number(idKey));
                if (found) break;
            }
            if (!found) return;

            const priceNum = Number(found.price) || 0;
            const itemTotal = priceNum * qty;
            totalPrice += itemTotal;

            const li = document.createElement('li');
            li.innerHTML = `<span>${found.name} x${qty}</span>
                            <strong>${itemTotal} ${CURRENCY}</strong>`;
            cartItemsList.appendChild(li);
        });

        // обновляем заголовок, сообщение и итог
        if (totalItems > 0) {
            cartHeader.innerText = `🛒 Ваш заказ (${totalItems} шт.)`;
            emptyMsg.style.display = 'none';
        } else {
            cartHeader.innerText = '🛒 Ваша корзина';
            cartItemsList.appendChild(emptyMsg);
            emptyMsg.style.display = 'block';
        }

        totalEl.innerText = Math.round(totalPrice);

        // Кнопка Telegram
        if (webApp) {
            if (totalItems > 0) {
                webApp.MainButton.setText(`Оформить заказ (${Math.round(totalPrice)} ${CURRENCY})`);
                webApp.MainButton.show();
            } else {
                webApp.MainButton.hide();
            }
        }
    }

    // ===== ОТКРЫТИЕ / ЗАКРЫТИЕ КОРЗИНЫ =====
    const cartHeader = document.getElementById('cart-header');
    const cartContent = document.getElementById('cart-content');
    if (cartHeader && cartContent) {
        cartHeader.addEventListener('click', () => {
            cartHeader.classList.toggle('active');
            if (cartContent.style.maxHeight) {
                cartContent.style.maxHeight = null;
                cartContent.style.padding = '0 15px';
            } else {
                cartContent.style.maxHeight = cartContent.scrollHeight + 'px';
                cartContent.style.padding = '10px 15px';
            }
        });
    }

    // ===== КНОПКА "ОФОРМИТЬ ЗАКАЗ" =====
    if (webApp) {
        webApp.onEvent('mainButtonClicked', function() {
            const order = { cart: {}, totalPrice: 0, userInfo: webApp.initDataUnsafe?.user || {} };
            let sum = 0;

            Object.keys(cart).forEach(idKey => {
                const qty = Number(cart[idKey]) || 0;
                let found = null;
                for (const cat in menu) {
                    found = menu[cat].find(i => Number(i.id) === Number(idKey));
                    if (found) break;
                }
                if (!found) return;

                const priceNum = Number(found.price) || 0;
                order.cart[found.name] = { quantity: qty, price: priceNum };
                sum += priceNum * qty;
            });

            order.totalPrice = Math.round(sum);
            webApp.sendData(JSON.stringify(order));
        });
    }

    // ===== СТАРТ =====
    if (webApp?.expand) webApp.expand();
    loadAndRenderMenu();
});
