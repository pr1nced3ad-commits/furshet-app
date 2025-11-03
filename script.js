const webApp = window.Telegram.WebApp;

// --- НАСТРОЙКИ ---
// Сюда мы вставим ссылку на нашу "Кухню" (бэкенд)
const BACKEND_URL = 'СЮДА_ВСТАВИМ_ССЫЛКУ_ПОЗЖЕ'; 
// Валюта
const CURRENCY = '₽';

// --- ВАШЕ МЕНЮ ---
// Разделите его по категориям, как здесь
const menu = {
    "Салаты": [
        {id: 1, name: 'Сельдь под шубой, 1кг', price: 790},
        {id: 2, name: 'Салат Рыбка, 1кг', price: 1100},
        {id: 3, name: 'Оливье с Ветчиной, 100гр', price: 79}
    ],
    "Основные блюда": [
        {id: 10, name: 'Люля-кебаб (говядина/свинина), 100гр', price: 170},
        {id: 11, name: 'Шашлычки на шпажках/курица, 100гр', price: 170}
    ],
    "Итальянская пицца": [
        {id: 20, name: 'Пепперони 350гр', price: 470},
        {id: 21, name: 'Маргарита 360гр', price: 470}
    ]
    // ... добавьте сюда ВСЕ ваши категории и блюда по аналогии
};

const cart = {};

function renderMenu() {
    const container = document.getElementById('menu-container');
    for (const category in menu) {
        const categoryTitle = document.createElement('h2');
        categoryTitle.className = 'category-title';
        categoryTitle.innerText = category;
        container.appendChild(categoryTitle);

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
            container.appendChild(itemDiv);
        });
    }
}

window.addToCart = function(id) {
    cart[id] = (cart[id] || 0) + 1;
    updateCartDisplay();
}

window.removeFromCart = function(id) {
    if (cart[id]) {
        cart[id]--;
        if (cart[id] === 0) {
            delete cart[id];
        }
        updateCartDisplay();
    }
}

function updateCartDisplay() {
    let totalPrice = 0;
    let hasItems = false;

    for (const category in menu) {
        menu[category].forEach(item => {
            const quantity = cart[item.id] || 0;
            document.getElementById(`quantity-${item.id}`).innerText = quantity;
            if (quantity > 0) {
                totalPrice += item.price * quantity;
                hasItems = true;
            }
        });
    }
    
    document.getElementById('total-price').innerText = totalPrice;

    if (hasItems) {
        webApp.MainButton.setText(`Оформить заказ (${totalPrice} ${CURRENCY})`);
        if (!webApp.MainButton.isVisible) {
            webApp.MainButton.show();
        }
    } else {
        webApp.MainButton.hide();
    }
}

webApp.onEvent('mainButtonClicked', function() {
    const orderData = {
        cart: {},
        totalPrice: 0,
        userInfo: webApp.initDataUnsafe.user
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

    fetch(BACKEND_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(orderData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'ok') {
            webApp.showAlert('Ваш заказ принят! Скоро с вами свяжется менеджер.');
            webApp.close();
        } else {
            webApp.showAlert('Произошла ошибка. Попробуйте снова.');
        }
    });
});

// Расширяем приложение на весь экран
webApp.expand();
// Запускаем отрисовку
renderMenu();
updateCartDisplay();
```    **Важно:** Не забудьте заполнить объект `menu` в файле `script.js` всеми вашими блюдами, разделив их по категориям.