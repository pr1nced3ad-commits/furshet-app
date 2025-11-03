const webApp = window.Telegram.WebApp;

// --- НАСТРОЙКИ ---
const BACKEND_URL = 'СЮДА_ВСТАВИМ_ССЫЛКУ_ПОЗЖЕ'; 
const CURRENCY = '₽';

// --- ВАШЕ МЕНЮ (полностью заполнено) ---
const menu = {
    "Салаты": [ {id: 1, name: 'Сельдь под шубой, 1кг (слоёный)', price: 790}, {id: 2, name: 'Салат Рыбка, 1кг (слоёный)', price: 1100}, {id: 3, name: 'Мимоза, 1кг (слоёный)', price: 690}, {id: 4, name: 'Оливье с Ветчиной, 100гр', price: 79}, {id: 5, name: 'Салат мясной с говядиной, 100гр', price: 85}, {id: 6, name: 'Салат Столичный с курицей, 100гр', price: 79}, {id: 7, name: 'Салат курочка с ананасом, 100гр', price: 79}, {id: 8, name: 'Салат Греческий, 100гр', price: 79}, {id: 9, name: 'Холодец 100гр', price: 60}, {id: 10, name: 'Сёмга слабосолёная, 100гр', price: 280}, {id: 11, name: 'Рулетики из Баклажан, 100гр', price: 87} ],
    "Канапе, Брускетты, Тапас": [ {id: 12, name: 'Бутерброд с сельдью, 30гр', price: 55}, {id: 13, name: 'Бутерброд с ветчиной, 30гр', price: 45}, {id: 14, name: 'Профитроль с Салатом Новинка, 30гр', price: 45}, {id: 15, name: 'Эклер с крабовым коктейлем, 35гр', price: 60}, {id: 16, name: 'Брускетта с медовой грушей и голубым сыром, 35гр', price: 85}, {id: 17, name: 'Канапе с Черри, Моцареллой и Песто, 45гр', price: 120}, {id: 18, name: 'Овощные палочки с соусом песто, 45гр', price: 90}, {id: 19, name: 'Канапе с сыром и оливками, 30гр', price: 60}, {id: 20, name: 'Канапе с голубым сыром, орехом и виноградом', price: 75}, {id: 21, name: 'Канапе Рулетик из Баклажан с черри, 35гр', price: 70}, {id: 22, name: 'Канапе с бужениной, 30гр', price: 60}, {id: 23, name: 'Канапе с семгой, лимоном 35гр', price: 140}, {id: 24, name: 'Канапе с языком, 30гр', price: 85}, {id: 25, name: 'Тапас с сёмгой и твор.сыром, 55гр.', price: 150}, {id: 26, name: 'Тапас с беконом и луком пай, 50гр.', price: 120}, {id: 27, name: 'Тапас с пеперони и оливками, 45гр.', price: 120} ],
    "Морсики": [ {id: 28, name: 'Облепиха 1.0 литр', price: 210}, {id: 29, name: 'Клюква 1.0 литр', price: 210}, {id: 30, name: 'Брусника 1.0 литр', price: 210} ], "Основное Блюдо": [ {id: 31, name: 'Люля-кебаб(говядина/свинина), 100гр', price: 170}, {id: 32, name: 'Шашлычки на шпажках/курица, 100гр', price: 170}, {id: 33, name: 'Жульен курица/шампиньоны, 100гр', price: 140}, {id: 34, name: 'Жульен с языком, 100гр', price: 230}, {id: 35, name: 'Картофель запеч.с травами, 100гр', price: 40}, {id: 36, name: 'Язык говяжий отварной, 100гр', price: 190}, {id: 37, name: 'Буженина, 100гр', price: 110} ], "Выпечка": [ {id: 38, name: 'Шанежка картофельная, 30гр', price: 35}, {id: 39, name: 'Посикунчики с мясом, 35гр', price: 38}, {id: 40, name: 'Посикунчики с капустой, 30гр', price: 30}, {id: 41, name: 'Сырная булочка с чесноком, 50гр', price: 38}, {id: 42, name: 'Перепечи с карт. и грибами, 30гр', price: 35}, {id: 43, name: 'Перепечи с ветчиной и сыром, 30гр', price: 38}, {id: 44, name: 'Пицца Мини, 50гр', price: 35}, {id: 45, name: 'Сосиска в тесте, 50гр', price: 35}, {id: 46, name: 'Слойка с Джемом, 35гр', price: 28}, {id: 47, name: 'Круассан со сгущенкой, 35гр', price: 35}, {id: 48, name: 'Круассан с шоколадом, 35гр', price: 35}, {id: 49, name: 'Даринка с яблоком и ягодами, 30гр', price: 35} ], "Десерты": [ {id: 50, name: 'С черносливом, 110гр', price: 110}, {id: 51, name: 'Тирамиссу, 100гр', price: 110}, {id: 52, name: 'Трайфл Сникерс, 90гр', price: 110}, {id: 53, name: 'Панакота, 130гр', price: 110} ],
    "Итальянская Пицца из печи 30см": [ {id: 54, name: 'Пепперони 350гр', price: 470}, {id: 55, name: 'Маргарита 360гр', price: 470}, {id: 56, name: 'Ветчина Грибы 380гр', price: 470}, {id: 57, name: 'Сырная 380гр', price: 580}, {id: 58, name: 'Мясная 460гр', price: 540}, {id: 59, name: 'Фермерская 480гр', price: 480}, {id: 60, name: 'Мексиканская 460гр', price: 540}, {id: 61, name: 'Цыпа 530гр', price: 620}, {id: 62, name: 'Хачапури по Аджарски 210гр', price: 215}, {id: 63, name: 'Фокачча 210гр', price: 85} ], "Пирожное": [ {id: 64, name: 'Конфета с сухофруктами 30гр', price: 50}, {id: 65, name: 'Корзиночка со сгущёнкой 75гр', price: 80}, {id: 66, name: 'Корзиночка со сливками 70гр', price: 90}, {id: 67, name: 'Муравейник с грецким орехом 50гр', price: 70}, {id: 68, name: 'Пирог три молока 95гр', price: 90}, {id: 69, name: 'Пирожное Безе 20гр', price: 60}, {id: 70, name: 'Заварное с творожным кремом 40гр', price: 75}, {id: 71, name: 'Пирожное Картошка 80гр', price: 80}, {id: 72, name: 'Пирожное Красный Бархат 95гр', price: 120}, {id: 73, name: 'Пирожное Медовое 50гр', price: 80}, {id: 74, name: 'Пирожное Морковное 60гр', price: 80}, {id: 75, name: 'Пирожное Рафаэлло 95гр', price: 120}, {id: 76, name: 'Пирожное Шоколадное 50гр', price: 90}, {id: 77, name: 'Чизкейк Классический 90гр', price: 130}, {id: 78, name: 'Чизкейк Ягодный 90гр', price: 130}, {id: 79, name: 'Пирожное Шу Манго-Маракуйя 55гр', price: 90}, {id: 80, name: 'Лимонный тарт 90гр', price: 130}, {id: 81, name: 'Меренговый рулет 200гр', price: 220}, {id: 82, name: 'Рулет Тропический 120гр', price: 140}, {id: 83, name: 'Эклер 60гр (пломбир, шоколад, облепиха, клубника, лимон)', price: 130}, {id: 84, name: 'Эклер Мини 30гр (пломбир, шоколад, облепиха, клубника, лимон)', price: 75} ]
};

// --- Остальной код остается без изменений ---
const cart = {};

function renderMenu() {
    const accordion = document.getElementById('menu-accordion');
    for (const category in menu) {
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
    }
}

window.addToCart = function(id) { cart[id] = (cart[id] || 0) + 1; updateCartDisplay(); }
window.removeFromCart = function(id) { if (cart[id]) { cart[id]--; if (cart[id] === 0) delete cart[id]; updateCartDisplay(); } }

function updateCartDisplay() {
    let totalPrice = 0; let hasItems = false;
    for (const category in menu) {
        menu[category].forEach(item => {
            const quantity = cart[item.id] || 0;
            const quantitySpan = document.getElementById(`quantity-${item.id}`);
            if (quantitySpan) quantitySpan.innerText = quantity;
            if (quantity > 0) { totalPrice += item.price * quantity; hasItems = true; }
        });
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
    if (Object.keys(cart).length === 0) { webApp.showAlert('Ваша корзина пуста.'); return; }
    const orderData = { cart: {}, totalPrice: 0, userInfo: webApp.initDataUnsafe.user };
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
    fetch(BACKEND_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(orderData) })
    .then(response => response.json())
    .then(data => {
        webApp.MainButton.hideProgress();
        if (data.status === 'ok') { webApp.showAlert('Ваш заказ принят! Скоро с вами свяжется менеджер.'); webApp.close(); }
        else { webApp.showAlert('Произошла ошибка. Попробуйте снова.'); }
    }).catch(error => {
        webApp.MainButton.hideProgress();
        webApp.showAlert('Ошибка сети. Пожалуйста, проверьте ваше интернет-соединение.');
    });
});

webApp.expand();
renderMenu();
updateCartDisplay();