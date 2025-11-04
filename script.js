document.addEventListener('DOMContentLoaded', function() {

    const webApp = window.Telegram?.WebApp;
    const BACKEND_URL = 'https://functions.yandexcloud.net/d4ejsg34lsdstd4de2ug';
    const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjs3r3_rV1jSs0d2KNQ9PIjip7nGdnSgKcj2kt6FqlZMCmWEd6M__nbdiPEQ5vJpDempKO-ykzQdbu/pub?gid=0&single=true&output=csv';
    const CURRENCY = '₽';

    let menu = {};
    const cart = {};

    async function loadAndRenderMenu() {
        const accordion = document.getElementById('menu-accordion');
        accordion.innerHTML = '<p style="text-align:center;">Загрузка меню...</p>';

        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        const csvText = await response.text();

        const rows = csvText.split('\n').slice(1);
        const parsedMenu = {};
        rows.forEach(row => {
            const columns = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            if (columns.length < 4) return;
            const cleanColumns = columns.map(c => c.trim().replace(/^"|"$/g, ''));
            const id = parseInt(cleanColumns[0]);
            const category = cleanColumns[1];
            const name = cleanColumns[2];
            const price = parseFloat(cleanColumns[3]);
            if (!category || !name || isNaN(price)) return;
            if (!parsedMenu[category]) parsedMenu[category] = [];
            parsedMenu[category].push({ id, category, name, price });
        });

        menu = parsedMenu;
        renderAccordion();
        updateAllDisplays();
    }

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

    function addToCart(id) {
        const key = String(id).trim(); // 🔥 приведение к строке
        cart[key] = (cart[key] || 0) + 1;
        updateAllDisplays();
    }

    function removeFromCart(id) {
        const key = String(id).trim();
        if (cart[key]) {
            cart[key]--;
            if (cart[key] <= 0) delete cart[key];
            updateAllDisplays();
        }
    }

    function updateAllDisplays() {
        // Обновляем счётчики рядом с товарами
        for (const category in menu) {
            menu[category].forEach(item => {
                const q = document.getElementById(`quantity-${item.id}`);
                if (q) q.innerText = cart[String(item.id).trim()] || 0;
            });
        }

        // Перерисовываем корзину
        const cartHeader = document.getElementById('cart-header');
        const cartItemsList = document.getElementById('cart-items-list');
        const emptyCartMessage = document.getElementById('empty-cart-message');
        const totalPriceEl = document.getElementById('total-price');

        cartItemsList.innerHTML = '';
        let totalItems = 0;
        let totalPrice = 0;

        for (const idKey in cart) {
            const qty = cart[idKey];
            totalItems += qty;

            let found = null;
            for (const cat in menu) {
                found = menu[cat].find(i => String(i.id).trim() === String(idKey).trim());
                if (found) break;
            }

            if (found) {
                const itemTotal = found.price * qty;
                totalPrice += itemTotal;

                const li = document.createElement('li');
                li.innerHTML = `<span>${found.name} x${qty}</span><strong>${itemTotal} ${CURRENCY}</strong>`;
                cartItemsList.appendChild(li);
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
                webApp.MainButton.show();
            } else {
                webApp.MainButton.hide();
            }
        }
    }

    // Корзина: открытие/закрытие
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

    if (webApp) {
        webApp.onEvent('mainButtonClicked', function() {
            const order = {
                cart: {},
                totalPrice: 0,
                userInfo: webApp.initDataUnsafe ? webApp.initDataUnsafe.user : {}
            };

            let total = 0;
            for (const idKey in cart) {
                const qty = cart[idKey];
                let found = null;
                for (const cat in menu) {
                    found = menu[cat].find(i => String(i.id).trim() === String(idKey).trim());
                    if (found) break;
                }
                if (found) {
                    order.cart[found.name] = { quantity: qty, price: found.price };
                    total += found.price * qty;
                }
            }
            order.totalPrice = total;

            webApp.sendData(JSON.stringify(order));
        });
    }

    if (webApp?.expand) webApp.expand();
    loadAndRenderMenu();
});
