// === Telegram WebApp API ===
const webApp = window.Telegram.WebApp;

// === НАСТРОЙКИ ===
// ⚠️ ВСТАВЬ сюда ссылку именно на kitchen_function (а не bot-gate!)
const BACKEND_URL = 'https://functions.yandexcloud.net/d4ejsg34lsdstd4de2ug';
const CURRENCY = '₽';

// === МЕНЮ (пример) ===
const menu = {
    "Салаты": [
        { id: 1, name: 'Сельдь под шубой, 1кг', price: 790 },
        { id: 2, name: 'Салат Рыбка, 1кг', price: 1100 },
        { id: 3, name: 'Мимоза, 1кг', price: 690 },
        { id: 4, name: 'Оливье с ветчиной, 100гр', price: 79 }
    ],
    "Горячее": [
        { id: 5, name: 'Шашлык куриный, 100гр', price: 170 },
        { id: 6, name: 'Жульен с грибами, 100гр', price: 140 }
    ],
    "Напитки": [
        { id: 7, name: 'Морс Клюквенный 1л', price: 210 },
        { id: 8, name: 'Морс Облепиховый 1л', price: 210 }
    ]
};

// === КОРЗИНА ===
const cart = {};

// === ФУНКЦИИ ===

// Рендеринг меню
function renderMenu() {
    const accordion = document.getElementById('menu-accordion');
    accordion.innerHTML = '';

    for (const category in menu) {
        const items = menu[category];
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'accordion-item';

        const header = document.createElement('div');
        header.className = 'accordion-header';
        header.textContent = category;

        const content = document.createElement('div');
        content.className = 'accordion-content';

        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'menu-item';
            itemDiv.innerHTML = `
                <div class="item-info">
                    <p>${item.name}</p>
                    <span class="item-price">${item.price} ${CURRENCY}</span>
                </div>
                <div class="item-controls">
                    <button onclick="removeFromCart(${item.id})">−</button>
                    <span>${cart[item.id] || 0}</span>
                    <button onclick="addToCart(${item.id})">+</button>
                </div>
            `;
            content.appendChild(itemDiv);
        });

        header.addEventListener('click', () => {
            header.classList.toggle('active');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                content.style.padding = '0 15px';
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
                content.style.padding = '15px';
            }
        });

        categoryDiv.appendChild(header);
        categoryDiv.appendChild(content);
        accordion.appendChild(categoryDiv);
    }
}

// Добавление в корзину
window.addToCart = function (id) {
    cart[id] = (cart[id] || 0) + 1;
    renderMenu();
    updateCartDisplay();
    webApp.MainButton.setText('Отправить заказ');
    webApp.MainButton.show();
};

// Удаление из корзины
window.removeFromCart = function (id) {
    if (cart[id]) {
        cart[id]--;
        if (cart[id] <= 0) delete cart[id];
        renderMenu();
        updateCartDisplay();
    }
    if (Object.keys(cart).length === 0) {
        webApp.MainButton.hide();
    }
};

// Обновление итоговой суммы
function updateCartDisplay() {
    let total = 0;
    for (const id in cart) {
        for (const cat in menu) {
            const item = menu[cat].find(i => i.id == id);
            if (item) total += item.price * cart[id];
        }
    }
    document.getElementById('total-price').textContent = total;
}

// === ОТПРАВКА ЗАКАЗА ===
webApp.onEvent('mainButtonClicked', function () {
    if (Object.keys(cart).length === 0) {
        webApp.showAlert('Ваша корзина пуста.');
        return;
    }

    const orderData = {
        cart: {},
        totalPrice: 0,
        userInfo: webApp.initDataUnsafe?.user || {},
        phoneNumber: webApp.initDataUnsafe?.user?.phone_number || "Не указан"
    };

    let totalPrice = 0;
    for (const id in cart) {
        for (const category in menu) {
            const menuItem = menu[category].find(item => item.id == id);
            if (menuItem) {
                orderData.cart[menuItem.name] = {
                    quantity: cart[id],
                    price: menuItem.price
                };
                totalPrice += menuItem.price * cart[id];
                break;
            }
        }
    }
    orderData.totalPrice = totalPrice;

    webApp.MainButton.showProgress();

    fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    })
        .then(async response => {
            try {
                return await response.json();
            } catch {
                return { status: 'error', message: 'Invalid JSON' };
            }
        })
        .then(data => {
            webApp.MainButton.hideProgress();
            if (data.status === 'ok') {
                webApp.showAlert('Ваш заказ принят! Скоро с вами свяжется менеджер.');
                webApp.close();
            } else {
                webApp.showAlert('Произошла ошибка. Попробуйте снова.');
            }
        })
        .catch(error => {
            console.error('Ошибка сети:', error);
            webApp.MainButton.hideProgress();
            webApp.showAlert('Ошибка сети. Проверьте подключение к интернету.');
        });
});

// === ИНИЦИАЛИЗАЦИЯ ===
webApp.expand();
renderMenu();
updateCartDisplay();
