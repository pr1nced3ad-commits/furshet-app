// ЖДЕМ, ПОКА ВСЯ СТРАНИЦА ПОЛНОСТЬЮ ЗАГРУЗИТСЯ
document.addEventListener('DOMContentLoaded', function() {

    const webApp = window.Telegram.WebApp;

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
        } catch (error) {
            console.error(error);
            const accordion = document.getElementById('menu-accordion');
            accordion.innerHTML = '<p style="text-align: center; color: red;">Не удалось загрузить меню.</p>';
            webApp.showAlert('Не удалось загрузить меню. Пожалуйста, попробуйте позже.');
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
                itemDiv.innerHTML = `
                    <div class="item-info">
                        <p><strong>${item.name}</strong></p>
                        <p class="item-price">${item.price} ${CURRENCY}</p>
                    </div>
                    <div class="item-controls">
                        <button onclick="removeFromCart(${item.id})">-</button>
                        <span id="quantity-${item.id}">0</span>
                        <button onclick="addToCart(${item.id})">+</button>
                    </div>
                `;
                content.appendChild(itemDiv);
            });
            itemWrapper.appendChild(header);
            itemWrapper.appendChild(content);
            accordion.appendChild(itemWrapper);
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
    }

    window.addToCart = function(id) { cart[id] = (cart[id] || 0) + 1; updateDisplays(id); }
    window.removeFromCart = function(id) { if (cart[id]) { cart[id]--; if (cart[id] === 0) delete cart[id]; updateDisplays(id); } }

    function updateDisplays(id) {
        const quantitySpan = document.getElementById(`quantity-${id}`);
        if (quantitySpan) quantitySpan.innerText = cart[id] || 0;
        updateCartSummary();
    }
    
    function updateCartSummary() {
        const cartHeader = document.getElementById('cart-header');
        const cartItemsList = document.getElementById('cart-items-list');
        const emptyCartMessage = document.getElementById('empty-cart-message');
        if (!cartHeader || !cartItemsList || !emptyCartMessage) return;
        
        cartItemsList.innerHTML = '';
        let totalPrice = 0;
        let totalItems = 0;
        
        for (const id in cart) {
            totalItems += cart[id];
            for (const category in menu) {
                const menuItem = menu[category].find(item => item.id == id);
                if (menuItem) {
                    const itemTotalPrice = menuItem.price * cart[id];
                    totalPrice += itemTotalPrice;
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `<span>${menuItem.name} x${cart[id]}</span><strong>${itemTotalPrice} ${CURRENCY}</strong>`;
                    cartItemsList.appendChild(listItem);
                    break;
                }
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
        document.getElementById('total-price').innerText = totalPrice;
        if (totalItems > 0) {
            webApp.MainButton.setText(`Оформить заказ (${totalPrice} ${CURRENCY})`);
            if (!webApp.MainButton.isVisible) webApp.MainButton.show();
        } else {
            webApp.MainButton.hide();
        }
    }
    
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

    webApp.onEvent('mainButtonClicked', function() {
        const phoneNumber = prompt("Пожалуйста, введите ваш номер телефона для связи:", "");
        if (phoneNumber === null || phoneNumber.trim() === "") { webApp.showAlert('Для оформления заказа нам нужен ваш номер телефона.'); return; }
        const orderData = { cart: {}, totalPrice: 0, userInfo: webApp.initDataUnsafe.user, phoneNumber: phoneNumber };
        let totalPrice = 0;
        for (const id in cart) {
            for (const category in menu) {
                const menuItem = menu[category].find(item => item.id == id);
                if (menuItem) { orderData.cart[menuItem.name] = { quantity: cart[id], price: menuItem.price }; totalPrice += menuItem.price * cart[id]; break; }
            }
        }
        orderData.totalPrice = totalPrice;
        webApp.MainButton.showProgress();
        fetch(BACKEND_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(orderData) })
        .then(response => response.json()).then(data => {
            webApp.MainButton.hideProgress();
            if (data.status === 'ok') { webApp.showAlert('Ваш заказ принят! Скоро с вами свяжется менеджер.'); webApp.close(); }
            else { webApp.showAlert('Произошла ошибка. Попробуйте снова.'); }
        }).catch(error => {
            webApp.MainButton.hideProgress();
            webApp.showAlert('Ошибка сети. Пожалуйста, проверьте ваше интернет-соединение.');
        });
    });

    webApp.expand();
    loadAndRenderMenu();
    updateCartSummary(); 
});