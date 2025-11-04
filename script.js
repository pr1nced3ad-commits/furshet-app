// script.js — устойчивый вариант с защитой от null и корректным подсчётом суммы
document.addEventListener("DOMContentLoaded", function () {
  const webApp = window.Telegram?.WebApp;
  const GOOGLE_SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRjs3r3_rV1jSs0d2KNQ9PIjip7nGdnSgKcj2kt6FqlZMCmWEd6M__nbdiPEQ5vJpDempKO-ykzQdbu/pub?gid=0&single=true&output=csv";
  const CURRENCY = "₽";

  let menu = {};
  const cart = {};

  // ----- загрузка меню -----
  async function loadAndRenderMenu() {
    try {
      const acc = document.getElementById("menu-accordion");
      if (acc) acc.innerHTML = "<p style='text-align:center'>Загрузка меню...</p>";

      const resp = await fetch(GOOGLE_SHEET_CSV_URL);
      if (!resp.ok) throw new Error("Ошибка загрузки CSV: " + resp.status);
      const txt = await resp.text();

      const rows = txt.split("\n").slice(1);
      const parsed = {};
      rows.forEach((r) => {
        if (!r.trim()) return;
        const cols = r.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        if (cols.length < 4) return;
        const clean = cols.map((c) => c.trim().replace(/^"|"$/g, ""));
        const rawId = clean[0];
        const cat = clean[1];
        const name = clean[2];
        const rawPrice = clean[3];

        const id = String(rawId).trim();
        const price = Number(String(rawPrice).replace(/\s+/g, "").replace(",", "."));

        if (!cat || !name || Number.isNaN(price) || id === "") return;
        if (!parsed[cat]) parsed[cat] = [];
        parsed[cat].push({ id: id, name: name, price: price });
      });

      menu = parsed;
      console.log("MENU LOADED", menu);
      renderAccordion();
      updateAllDisplays();
    } catch (err) {
      console.error("loadAndRenderMenu error:", err);
      const acc = document.getElementById("menu-accordion");
      if (acc) acc.innerHTML = "<p style='color:red;text-align:center'>Ошибка загрузки меню</p>";
      webApp?.showAlert("Не удалось загрузить меню.");
    }
  }

  // ----- рендер аккордеона -----
  function renderAccordion() {
    const acc = document.getElementById("menu-accordion");
    if (!acc) {
      console.warn("menu-accordion element not found");
      return;
    }
    acc.innerHTML = "";

    Object.keys(menu).forEach((category) => {
      const wrap = document.createElement("div");
      wrap.className = "accordion-item";

      const header = document.createElement("div");
      header.className = "accordion-header";
      header.innerText = category;

      const content = document.createElement("div");
      content.className = "accordion-content";

      menu[category].forEach((item) => {
        const div = document.createElement("div");
        div.className = "menu-item";
        div.innerHTML = `
            <div class="item-info">
              <p><strong>${item.name}</strong></p>
              <p class="item-price">${item.price} ${CURRENCY}</p>
            </div>
            <div class="item-controls">
              <button class="btn-minus" data-id="${item.id}">-</button>
              <span id="quantity-${item.id}">0</span>
              <button class="btn-plus" data-id="${item.id}">+</button>
            </div>
        `;
        content.appendChild(div);
      });

      wrap.appendChild(header);
      wrap.appendChild(content);
      acc.appendChild(wrap);

      header.addEventListener("click", () => {
        header.classList.toggle("active");
        if (content.style.maxHeight) {
          content.style.maxHeight = null;
          content.style.padding = "0 15px";
        } else {
          content.style.maxHeight = content.scrollHeight + "px";
          content.style.padding = "10px 15px";
        }
      });
    });

    // делегирование событий (нужно только один раз)
    acc.addEventListener(
      "click",
      (e) => {
        const plus = e.target.closest(".btn-plus");
        const minus = e.target.closest(".btn-minus");
        if (plus) addToCart(plus.dataset.id);
        if (minus) removeFromCart(minus.dataset.id);
      },
      { passive: true }
    );
  }

  // ----- cart ops -----
  function addToCart(rawId) {
    const id = String(rawId).trim();
    cart[id] = (cart[id] || 0) + 1;
    updateAllDisplays();
  }
  function removeFromCart(rawId) {
    const id = String(rawId).trim();
    if (!cart[id]) return;
    cart[id]--;
    if (cart[id] <= 0) delete cart[id];
    updateAllDisplays();
  }

  // ----- обновление UI -----
  function updateAllDisplays() {
    // обновляем счётчики рядом с товарами (если элементы есть)
    Object.values(menu)
      .flat()
      .forEach((item) => {
        const el = document.getElementById(`quantity-${item.id}`);
        if (el) el.innerText = cart[item.id] || 0;
      });

    // безопасно получить элементы корзины
    const cartHeader = document.getElementById("cart-header");
    const cartItemsList = document.getElementById("cart-items-list");
    const emptyMsg = document.getElementById("empty-cart-message");
    const totalEl = document.getElementById("total-price");

    // Если какой-то из ключевых элементов не найден — логим и продолжаем (без падения)
    if (!cartHeader || !cartItemsList || !emptyMsg || !totalEl) {
      console.warn("Один из элементов корзины не найден:", {
        cartHeader: !!cartHeader,
        cartItemsList: !!cartItemsList,
        emptyMsg: !!emptyMsg,
        totalEl: !!totalEl,
      });
      // Даже если UI отсутствует, посчитаем сумму и выведем в консоль
      const debug = computeTotals();
      console.log("CART (no DOM)", cart, "TOTAL_PRICE", debug.totalPrice, "ITEMS", debug.totalItems);
      // не пытаемся обращаться к элементам дальше
      return;
    }

    // если элементы есть — перерисовываем корректно
    cartItemsList.innerHTML = "";
    let totalItems = 0;
    let totalPrice = 0;

    Object.keys(cart).forEach((idKey) => {
      const qty = Number(cart[idKey]) || 0;
      totalItems += qty;

      // ищем товар по id (сравниваем строки)
      let found = null;
      for (const cat in menu) {
        const maybe = menu[cat].find((it) => String(it.id).trim() === String(idKey).trim());
        if (maybe) {
          found = maybe;
          break;
        }
      }
      if (!found) {
        console.warn("Не найден товар в меню для id:", idKey);
        return;
      }

      const itemTotal = Number(found.price) * qty;
      totalPrice += itemTotal;

      const li = document.createElement("li");
      li.innerHTML = `<span>${found.name} x${qty}</span><strong>${itemTotal} ${CURRENCY}</strong>`;
      cartItemsList.appendChild(li);
    });

    if (totalItems > 0) {
      cartHeader.innerText = `🛒 Ваш заказ (${totalItems} шт.)`;
      emptyMsg.style.display = "none";
    } else {
      cartHeader.innerText = "🛒 Ваша корзина";
      cartItemsList.appendChild(emptyMsg);
      emptyMsg.style.display = "block";
    }

    const rounded = Math.round(totalPrice);
    totalEl.innerText = rounded;

    console.log("CART", cart, "TOTAL_PRICE", rounded);

    if (webApp) {
      try {
        if (totalItems > 0) {
          webApp.MainButton.setText(`Оформить заказ (${rounded} ${CURRENCY})`);
          webApp.MainButton.show();
        } else {
          webApp.MainButton.hide();
        }
      } catch (e) {
        console.warn("MainButton error:", e);
      }
    }
  }

  // вычисление сумм без обращения к DOM (для диагностики)
  function computeTotals() {
    let totalItems = 0;
    let totalPrice = 0;
    Object.keys(cart).forEach((idKey) => {
      const qty = Number(cart[idKey]) || 0;
      totalItems += qty;
      let found = null;
      for (const cat in menu) {
        const maybe = menu[cat].find((it) => String(it.id).trim() === String(idKey).trim());
        if (maybe) {
          found = maybe;
          break;
        }
      }
      if (found) totalPrice += Number(found.price) * qty;
    });
    return { totalItems, totalPrice };
  }

  // открытие/закрытие корзины
  const cartHeaderEl = document.getElementById("cart-header");
  const cartContentEl = document.getElementById("cart-content");
  if (cartHeaderEl && cartContentEl) {
    cartHeaderEl.addEventListener("click", () => {
      cartHeaderEl.classList.toggle("active");
      if (cartContentEl.style.maxHeight) {
        cartContentEl.style.maxHeight = null;
        cartContentEl.style.padding = "0 15px";
      } else {
        cartContentEl.style.maxHeight = cartContentEl.scrollHeight + "px";
        cartContentEl.style.padding = "10px 15px";
      }
    });
  }

  // MainButton handler
  webApp?.onEvent("mainButtonClicked", () => {
    const order = { cart: {}, totalPrice: 0, userInfo: webApp.initDataUnsafe?.user || {} };
    const totals = computeTotals();
    Object.keys(cart).forEach((idKey) => {
      let found = null;
      for (const cat in menu) {
        const maybe = menu[cat].find((it) => String(it.id).trim() === String(idKey).trim());
        if (maybe) {
          found = maybe;
          break;
        }
      }
      if (found) order.cart[found.name] = { quantity: cart[idKey], price: found.price };
    });
    order.totalPrice = Math.round(totals.totalPrice);
    console.log("SENDING ORDER", order);
    try {
      webApp.sendData(JSON.stringify(order));
    } catch (e) {
      console.error("sendData failed", e);
      webApp?.showAlert("Ошибка отправки заказа");
    }
  });

  // start
  webApp?.expand();
  loadAndRenderMenu();
});
