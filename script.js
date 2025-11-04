// ЖДЕМ, ПОКА ВСЯ СТРАНИЦА ПОЛНОСТЬЮ ЗАГРУЗИТСЯ
document.addEventListener('DOMContentLoaded', function() {

    // === Telegram WebApp API ===
    const webApp = window.Telegram.WebApp;

    // === НАСТРОЙКИ ===
    // ⚠️ ВСТАВЬ сюда ссылку именно на kitchen_function!
    const BACKEND_URL = 'https://functions.yandexcloud.net/d4ejsg34lsdstd4de2ug'; // Убедитесь, что здесь ваша правильная ссылка
    const CURRENCY = '₽';

    
    // ======================= ВСТАВЬТЕ ВАШУ CSV-ССЫЛКУ ИЗ GOOGLE SHEETS =======================
    // ⚠️ Вставьте сюда ссылку, которую вы получили при публикации таблицы как CSV
    const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjs3r3_rV1jSs0d2KNQ9PIjip7nGdnSgKcj2kt6FqlZMCmWEd6M__nbdiPEQ5vJpDempKO-ykzQdbu/pub?gid=0&single=true&output=csv';
    // =====================================================================================

    // Глобальные переменные для меню и корзины
    let menu = {};
    const cart = {};

    // --- ГЛАВНАЯ ФУНКЦИЯ ЗАГРУЗКИ И ОТОБРАЖЕНИЯ МЕНЮ ---
    async function loadAndRenderMenu() {
        try {
            // Показываем пользователю, что идет загрузка
            const accordion = document.getElementById('menu-accordion');
            accordion.innerHTML = '<p style="text-align: center;">Загрузка меню...</p>';

            const response = await fetch(GOOGLE_SHEET_CSV_URL);
            if (!response.ok) {
                throw new Error('Ошибка сети при загрузке меню: ' + response.statusText);
            }
            const csvText = await response.text();
            
            // Парсим (разбираем) CSV-текст и превращаем его в наш объект menu
            const rows = csvText.split('\n').slice(1); // Разделяем на строки и пропускаем первую строку (заголовки)
            const parsedMenu = {};

            rows.forEach(row => {
                // Используем регулярное выражение, чтобы правильно разделить строку CSV
                const columns = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
                if (columns.length < 4) return; // Пропускаем пустые или некорреКТНые строки
                
                // Убираем кавычки, если они есть
                const cleanColumns = columns.map(col => col.trim().replace(/^"|"$/g, ''));

                const item = {
                    id: parseInt(cleanColumns[0]),
                    category: cleanColumns[1],
                    name: cleanColumns[2],
                    price: parseFloat(cleanColumns[3])
                };

                // Проверяем, что данные корректны
                if (!item.id || !item.category || !item.name || isNaN(item.price)) {
                    return;
                }

                if (!parsedMenu[item.category]) {
                    parsedMenu[item.category] = [];
                }
                parsedMenu[item.category].push(item);
            });
            
            menu = parsedMenu; // Сохраняем загруженное меню в глобальную переменную
            renderAccordion(); // Вызываем функцию отрисовки аккордеона

        } catch (error) {
            console.error(error);
            const accordion = document.getElementById('menu-accordion');
            accordion.innerHTML = '<p style="text-align: center; color: red;">Не удалось загрузить меню. Пожалуйста, попробуйте обновить страницу.</p>';
            webApp.showAlert('Не удалось загрузить меню. Пожалуйста, попробуйте позже.');
        }
    }

    // --- ВСЕ ОСТАЛЬНЫЕ ФУНКЦИИ ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ ---

    function renderAccordion() {
        const accordion = document.getElementById('menu-accordion');
        if (!accordion) return;
        accordion.innerHTML = ''; // Очищаем надпись "Загрузка меню..."
        
        // Получаем ключи (категории) и сортируем их, если нужно
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
        let totalPrice = 0; 
        let hasItems = false;
        for (const id in cart) {
            hasItems = true;
            for (const category in menu) {
                const menuItem = menu[category].find(item => item.id == id);
                if (menuItem) { 
                    totalPrice += menuItem.price * cart[id]; 
                    break; 
                }
            }
        }
        document.getElementById('total-price').innerText = totalPrice;
        if (hasItems) {
            webApp.MainButton.setText(`Оформить заказ (${totalPrice} ${CURRENCY})`);
            if (!webApp.MainButton.isVisible) webApp.MainButton.show();
        } else {
            webApp.MainButton.hide();
        }
    }

    webApp.onEvent('mainButtonClicked', function() {
        const phoneNumber = prompt("Пожалуйста, введите ваш номер телефона для связи:", "");
        if (phoneNumber === null || phoneNumber.trim() === "") {
            webApp.showAlert('Для оформления заказа нам нужен ваш номер телефона.');
            return;
        }
        
        const orderData = { cart: {}, totalPrice: 0, userInfo: webApp.initDataUnsafe.user, phoneNumber: phoneNumber };
        let totalPrice = 0;
        for (const id in cart) {
            for (const category in menu) {
                const menuItem = menu[category].find(item => item.id == id);
                if (menuItem) { 
                    orderData.cart[menuItem.name] = { quantity: cart[id], price: menuItem.price }; 
                    totalPrice += menuItem.price * cart[id]; 
                    break; 
                }
            }
        }
        orderData.totalPrice = totalPrice;
        webApp.MainButton.showProgress();
        fetch(BACKEND_URL, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(orderData) 
        })
        .then(response => response.json())
        .then(data => {
            webApp.MainButton.hideProgress();
            if (data.status === 'ok') { 
                webApp.showAlert('Ваш заказ принят! Скоро с вами свяжется менеджер.'); 
                webApp.close(); 
            } else { 
                webApp.showAlert('Произошла ошибка. Попробуйте снова.'); 
            }
        }).catch(error => {
            webApp.MainButton.hideProgress();
            webApp.showAlert('Ошибка сети. Пожалуйста, проверьте ваше интернет-соединение.');
        });
    });

    // --- ИНИЦИАЛИЗАЦИЯ ---
    webApp.expand();
    // Запускаем загрузку меню вместо прямой отрисовки
    loadAndRenderMenu();
    updateCartSummary();

});