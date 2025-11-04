// script.js — исправленная версия с надёжным подсчётом суммы
document.addEventListener('DOMContentLoaded', function() {

    const webApp = window.Telegram?.WebApp;
    const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjs3r3_rV1jSs0d2KNQ9PIjip7nGdnSgKcj2kt6FqlZMCmWEd6M__nbdiPEQ5vJpDempKO-ykzQdbu/pub?gid=0&single=true&output=csv';
    const CURRENCY = '₽';

    let menu = {};       // { category: [ {id:Number, name, price:Number, ...}, ... ], ... }
    const cart = {};     // { "id": qty, ... } — ключи как строки

    // ----------------- Загрузка меню -----------------
    async function loadAndRenderMenu() {
        try {
            const accordion = document.getElementById('menu-accordion');
            accordion.innerHTML = '<p style="text-align:center">Загрузка меню...</p>';

            const resp = await fetch(GOOGLE_SHEET_CSV_URL);
            if (!resp.ok) throw new Error('Ошибка загрузки CSV: ' + resp.status);
            const text = await resp.text();

            const rows = text.split('\n').slice(1);
            const parsed = {};
            rows.forEach(r => {
                if (!r.trim()) return;
                const cols = r.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
                if (cols.length < 4) return;
                const clean = cols.map(c => c.trim().replace(/^"|"$/g, ''));
                const rawId = clean[0];
                const cat = clean[1];
                const name = clean[2];
                const rawPrice = clean[3];

                const id = Number(String(rawId).trim());
                const price = Number(String(rawPrice).replace(/\s+/g, '').replace(',', '.'));

                if (!cat || !name || Number.isNaN(id) || Number.isNaN(price)) return;

                if (!parsed[cat]) parsed[cat] = [];
                parsed[cat].push({ id: id, name: name, price: price });
            });

            menu = parsed;
            renderAccordion();
            updateAllDisplays();

            // для диагностики — можно удалить позже
            console.log('MENU LOADED', menu);

        } catch (err) {
            console.error('loadAndRenderMenu error', err);
            const accordion = document.getElementById('menu-accordion');
            if (accordion) accordion.innerHTML = '<p style="color:red;text-align:center">Не удалось загрузить меню</p>';
            if (webApp) webApp.showAlert('Ошибка загрузки меню.');
        }
    }

    // ----------------- Рендер меню (аккордеон) -----------------
    function renderAccordion() {
        const accordion = document.getElementById('menu-accordion');
        if (!accordion) return;
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

        // делегирование для кнопок +/-
        accordion.addEventListener('click', e => {
            const add = e.target.closest('.btn-add');
            const rem = e.target.closest('.btn-remove');
            if (add) handleAdd(add.dataset.id);
            if (rem) handleRemove(rem.dataset.id);
        }, { passive: true });
    }

    // ----------------- Cart handlers -----------------
    function handleAdd(rawId) {
        const id = String(rawId).trim();
        cart[id] = (cart[id] || 0) + 1;
        updateAllDisplays();
    }
    function handleRemove(rawId) {
        const id = String(rawId).trim();
        if (!cart[id]) return;
        cart[id]--;
        if (cart[id] <= 0) delete cart[id];
        updateAllDisplays();
    }

    // ----------------- Обновление экранов -----------------
    function updateAllDisplays() {
        // 1) обновляем числа рядом с товарами
        for (const cat in menu) {
            menu[cat].forEach(item => {
                const q = document.getElementById(`quantity-${item.id}`);
                if (q) q.innerText = cart[String(item.id)] || 0;
            });
        }

        // 2) формируем корзину и считаем сумму
        const cartHeader = document.getElementById('cart-header');
        const cartItemsList = document.getElementById('cart-items-list');
        const emptyMsg = document.getElementById('empty-cart-message');
        const totalEl = document.getElementById('total-price');
        if (!cartHeader || !cartItemsList || !emptyMsg || !totalEl) return;

        cartItemsList.innerHTML = ''; // сброс списка
        let totalItems = 0;
        let totalPrice = 0;

        // ПРОВЕРЕННЫЙ цикл: проходим по всем ключам cart
        Object.keys(cart).forEach(idKey => {
            const qty = Number(cart[idKey]) || 0;
            totalItems += qty;

            // найти товар в меню (id сравниваем как числа)
            let found = null;
            for (const cat in menu) {
                const maybe = menu[cat].find(x => Number(x.id) === Number(idKey));
                if (maybe) { found = maybe; break; }
            }
            if (!found) return; // если нет в меню — пропускаем

            const priceNum = Number(found.price) || 0;
            const itemTotal = priceNum * qty;
            totalPrice += itemTotal;

            const li = document.createElement('li');
            li.innerHTML = `<span>${found.name} x${qty}</span><strong>${Math.round(itemTotal)} ${CURRENCY}</strong>`;
            cartItemsList.appendChild(li);
        });

        // заголовок и сообщение пустой корзины
        if (totalItems > 0) {
            cartHeader.innerText = `🛒 Ваш заказ (${totalItems} шт.)`;
            emptyMsg.style.display = 'none';
        } else {
            cartHeader.innerText = '🛒 Ваша корзина';
            cartItemsList.appendChild(emptyMsg);
            emptyMsg.style.display = 'block';
        }

        // финальная сумма — округляем
        const rounded = Math.round(totalPrice);
        totalEl.innerText = rounded;

        // обновляем Telegram MainButton (если есть)
        if (webApp) {
            try {
                if (totalItems > 0) {
                    webApp.MainButton.setText(`Оформить заказ (${rounded} ${CURRENCY})`);
                    if (!webApp.MainButton.isVisible) webApp.MainButton.show();
                } else {
                    webApp.MainButton.hide();
                }
            } catch (e) {
                console.warn('MainButton error', e);
            }
        }

        // диагностические логи — удаляй их когда всё в порядке
        console.log('CART', cart, 'TOTAL_PRICE', rounded);
    }

    // ----------------- Корзина (open/close) -----------------
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

    // ----------------- Отправка заказа (MainButton) -----------------
    if (webApp) {
        webApp.onEvent('mainButtonClicked', () => {
            const order = { cart: {}, totalPrice: 0, userInfo: webApp.initDataUnsafe?.user || {} };
            let sum = 0;
            Object.keys(cart).forEach(idKey => {
                const qty = Number(cart[idKey]) || 0;
                let found = null;
                for (const cat in menu) {
                    const maybe = menu[cat].find(x => Number(x.id) === Number(idKey));
                    if (maybe) { found = maybe; break; }
                }
                if (!found) return;
                order.cart[found.name] = { quantity: qty, price: Number(found.price) };
                sum += Number(found.price) * qty;
            });
            order.totalPrice = Math.round(sum);

            // diagnostic
            console.log('SENDING ORDER', order);

            try {
                webApp.sendData(JSON.stringify(order));
            } catch (e) {
                console.error('sendData failed', e);
                if (webApp) webApp.showAlert('Ошибка отправки заказа');
            }
        });
    }

    // ----------------- Init -----------------
    if (webApp?.expand) webApp.expand();
    loadAndRenderMenu();
});
