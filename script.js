// script.js — полный исправленный вариант
document.addEventListener('DOMContentLoaded', function() {

    const webApp = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

    // --- НАСТРОЙКИ ---
    const BACKEND_URL = 'https://functions.yandexcloud.net/d4ejsg34lsdstd4de2ug';
    const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjs3r3_rV1jSs0d2KNQ9PIjip7nGdnSgKcj2kt6FqlZMCmWEd6M__nbdiPEQ5vJpDempKO-ykzQdbu/pub?gid=0&single=true&output=csv';
    const CURRENCY = '₽';
    
    let menu = {};
    const cart = {};

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
                const item = { id: parseInt(cleanColumns[0]), category: cleanColumns[1], name: cleanColumns[2], price: parseFloat(cleanColumns[3]) };
                if (!item.id || !item.category || !item.name || isNaN(item.price)) return;
                if (!parsedMenu[item.category]) parsedMenu[item.category] = [];
                parsedMenu[item.category].push(item);
            });
            menu = parsedMenu;
            renderAccordion();

            // ВАЖНО: обновляем отображение ПОСЛЕ того как меню отрисовано
            updateAllDisplays();

        } catch (error) {
            console.error(error);
            const accordion = document.getElementById('menu-accordion');
            if (accordion) accordion.innerHTML = '<p style="text-align: center; color: red;">Не удалось загрузить меню.</p>';
            if (webApp) webApp.showAlert('Не удалось загрузить меню. Пожалуйста, попробуйте позже.');
        }
    }

    function renderAccordion() {
        const accordion = document.getElementById('menu-accordion');
        if (!accordion) return;
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
                // Через data-* атрибуты не придётся полагаться на глобальные функции
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

            // Поведение аккордеона для категорий
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

        // Навешиваем делегированные обработчики на + и - (лучше работает и после перерисовки)
        accordion.addEventListener('click', function(e) {
            const addBtn = e.target.closest('.btn-add');
            const remBtn = e.target.closest('.btn-remove');
            if (addBtn) {
                const id = parseInt(addBtn.dataset.id);
                addToCart(id);
            } else if (remBtn) {
                const id = parseInt(remBtn.dataset.id);
                removeFromCart(id);
            }
        });
    }
    
    // === ФУНКЦИИ КОРЗИНЫ ===
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

    // ЕДИНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ
    function updateAllDisplays() {
        // 1) Обновляем счетчики рядом с кнопками +/- (если меню загружено)
        for (const category in menu) {
            menu[category].forEach(item => {
                const quantitySpan = document.getElementById(`quantity-${item.id}`);
                if (quantitySpan) {
                    quantitySpan.innerText = cart[item.id] || 0;
                }
            });
        }
        
        // 2) Обновляем корзину
        const cartHeader = document.getElementById('cart-header');
        const cartItemsList = document.getElementById('cart-items-list');
        const emptyCartMessage = document.getElementById('empty-cart-message');
        const totalPriceEl = document.getElementById('total-price');
        if (!cartHeader || !cartItemsList || !emptyCartMessage || !totalPriceEl) return;
        
        cartItemsList.innerHTML = '';
        let totalPrice = 0;
        let totalItems = 0;
        
        for (const idKey in cart) {
            const qty = cart[idKey];
            const id = parseInt(idKey);
            totalItems += qty;
            let found = null;
            for (const category in menu) {
                found = menu[category].find(item => item.id === id);
                if (found) break;
            }
            if (!found) continue;
            const itemTotalPrice = found.price * qty;
            totalPrice += itemTotalPrice;
            const listItem = document.createElement('li');
            listItem.innerHTML = `<span>${found.name} x${qty}</span><strong>${itemTotalPrice} ${CURRENCY}</strong>`;
            cartItemsList.appendChild(listItem);
        }
        
        if (totalItems > 0) {
            cartHeader.innerText = `🛒 Ваш заказ (${totalItems} шт.)`;
            emptyCartMessage.style.display = 'none';
        } else {
            cartHeader.innerText = '🛒 Ваша корзина';
            // Если пусто, покажем сообщение-плейсхолдер
            cartItemsList.appendChild(emptyCartMessage);
            emptyCartMessage.style.display = 'block';
        }
        
        totalPriceEl.innerText = totalPrice;
        
        // MainButton (если WebApp)
        if (webApp) {
            if (totalItems > 0) {
                try {
                    webApp.MainButton.setText(`Оформить заказ (${totalPrice} ${CURRENCY})`);
                    if (!webApp.MainButton.isVisible) webApp.MainButton.show();
                } catch (e) { console.warn('Ошибка WebApp.MainButton:', e); }
            } else {
                try { webApp.MainButton.hide(); } catch(e) {}
            }
        }
    }

    // === Клик по заголовку корзины — открытие/закрытие содержимого ===
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

    // === Обработка нажатия MainButton ===
    if (webApp) {
        webApp.onEvent('mainButtonClicked', function() {
            // собираем заказ и отправляем на бекенд (или webApp.sendData)
            let orderData = { cart: {}, totalPrice: 0, userInfo: webApp.initDataUnsafe ? webApp.initDataUnsafe.user : {} };
            let total = 0;
            for (const idKey in cart) {
                const qty = cart[idKey];
                const id = parseInt(idKey);
                let found = null;
                for (const category in menu) {
                    found = menu[category].find(item => item.id === id);
                    if (found) break;
                }
                if (!found) continue;
                orderData.cart[found.name] = { quantity: qty, price: found.price };
                total += found.price * qty;
            }
            orderData.totalPrice = total;

            try {
                webApp.MainButton.showProgress();
            } catch(e) {}
            
            // отправим в bot через webApp.sendData (популярный вариант)
            try {
                webApp.sendData(JSON.stringify(orderData));
                // webApp.close(); // не закрываем автоматически — бот ответит
            } catch (e) {
                console.error('Ошибка при отправке данных:', e);
                webApp.showAlert('Ошибка отправки заказа. Попробуйте ещё раз.');
            } finally {
                try { webApp.MainButton.hideProgress(); } catch(e) {}
            }
        });
    }

    // ИНИЦИАЛИЗАЦИЯ
    if (webApp && webApp.expand) webApp.expand();
    loadAndRenderMenu();
});
