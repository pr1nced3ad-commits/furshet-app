// script.js — финальный стабильный вариант
document.addEventListener("DOMContentLoaded", () => {
  const webApp = window.Telegram?.WebApp;
  const GOOGLE_SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRjs3r3_rV1jSs0d2KNQ9PIjip7nGdnSgKcj2kt6FqlZMCmWEd6M__nbdiPEQ5vJpDempKO-ykzQdbu/pub?gid=0&single=true&output=csv";
  const CURRENCY = "₽";

  let menu = {};
  const cart = {};

  async function loadAndRenderMenu() {
    const acc = document.getElementById("menu-accordion");
    acc.innerHTML = "<p style='text-align:center'>Загрузка меню...</p>";
    try {
      const res = await fetch(GOOGLE_SHEET_CSV_URL);
      const text = await res.text();
      const rows = text.split("\n").slice(1);
      const parsed = {};
      rows.forEach((r) => {
        if (!r.trim()) return;
        const cols = r.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        if (cols.length < 4) return;
        const clean = cols.map((c) => c.trim().replace(/^"|"$/g, ""));
        const id = String(clean[0]).trim();
        const cat = clean[1];
        const name = clean[2];
        const price = Number(String(clean[3]).replace(",", "."));
        if (!id || !cat || !name || Number.isNaN(price)) return;
        if (!parsed[cat]) parsed[cat] = [];
        parsed[cat].push({ id, name, price });
      });
      menu = parsed;
      renderAccordion();
      updateAllDisplays();
    } catch (e) {
      console.error("Ошибка загрузки меню:", e);
    }
  }

  function renderAccordion() {
    const acc = document.getElementById("menu-accordion");
    acc.innerHTML = "";
    Object.keys(menu).forEach((cat) => {
      const wrap = document.createElement("div");
      wrap.className = "accordion-item";
      const head = document.createElement("div");
      head.className = "accordion-header";
      head.innerText = cat;
      const cont = document.createElement("div");
      cont.className = "accordion-content";

      menu[cat].forEach((item) => {
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
          </div>`;
        cont.appendChild(div);
      });

      wrap.appendChild(head);
      wrap.appendChild(cont);
      acc.appendChild(wrap);

      head.addEventListener("click", () => {
        head.classList.toggle("active");
        if (cont.style.maxHeight) {
          cont.style.maxHeight = null;
          cont.style.padding = "0 15px";
        } else {
          cont.style.maxHeight = cont.scrollHeight + "px";
          cont.style.padding = "10px 15px";
        }
      });
    });

    acc.addEventListener("click", (e) => {
      const plus = e.target.closest(".btn-plus");
      const minus = e.target.closest(".btn-minus");
      if (plus) addToCart(plus.dataset.id);
      if (minus) removeFromCart(minus.dataset.id);
    });
  }

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

  function computeTotals() {
    let totalItems = 0,
      totalPrice = 0;
    Object.keys(cart).forEach((id) => {
      const qty = cart[id];
      const found = Object.values(menu).flat().find((it) => it.id === id);
      if (!found) return;
      totalItems += qty;
      totalPrice += found.price * qty;
    });
    return { totalItems, totalPrice };
  }

  function updateAllDisplays() {
    Object.values(menu)
      .flat()
      .forEach((item) => {
        const el = document.getElementById(`quantity-${item.id}`);
        if (el) el.innerText = cart[item.id] || 0;
      });

    const cartHeader = document.getElementById("cart-header");
    const cartItems = document.getElementById("cart-items-list");
    const totalEl = document.getElementById("total-price");
    const cartContentEl = document.getElementById("cart-content");
    if (!cartHeader || !cartItems || !totalEl) return;

    cartItems.innerHTML = "";
    const totals = computeTotals();
    Object.keys(cart).forEach((id) => {
      const qty = cart[id];
      const found = Object.values(menu).flat().find((it) => it.id === id);
      if (!found) return;
      const li = document.createElement("li");
      li.innerHTML = `<span>${found.name} x${qty}</span><strong>${found.price * qty} ${CURRENCY}</strong>`;
      cartItems.appendChild(li);
    });

    if (totals.totalItems === 0) {
      const ph = document.createElement("li");
      ph.id = "empty-cart-message";
      ph.textContent = "Корзина пуста";
      cartItems.appendChild(ph);
      cartHeader.innerText = "🛒 Ваша корзина";
    } else {
      cartHeader.innerText = `🛒 Ваш заказ (${totals.totalItems} шт.)`;
    }

    totalEl.innerText = Math.round(totals.totalPrice);
    if (cartContentEl)
      cartContentEl.style.maxHeight = cartContentEl.scrollHeight + "px";

    if (webApp) {
      if (totals.totalItems > 0) {
        webApp.MainButton.setText(`Оформить заказ (${totals.totalPrice} ${CURRENCY})`);
        webApp.MainButton.show();
      } else webApp.MainButton.hide();
    }
  }

  const cartHeader = document.getElementById("cart-header");
  const cartContent = document.getElementById("cart-content");
  if (cartHeader && cartContent) {
    cartHeader.addEventListener("click", () => {
      cartHeader.classList.toggle("active");
      if (cartContent.style.maxHeight) {
        cartContent.style.maxHeight = null;
        cartContent.style.padding = "0 15px";
      } else {
        cartContent.style.maxHeight = cartContent.scrollHeight + "px";
        cartContent.style.padding = "10px 15px";
      }
    });
  }

  webApp?.onEvent("mainButtonClicked", () => {
    const totals = computeTotals();
    const order = { cart: {}, totalPrice: totals.totalPrice, userInfo: webApp.initDataUnsafe?.user || {} };
    Object.keys(cart).forEach((id) => {
      const found = Object.values(menu).flat().find((it) => it.id === id);
      if (found) order.cart[found.name] = { quantity: cart[id], price: found.price };
    });
    webApp.sendData(JSON.stringify(order));
  });

  webApp?.expand();
  loadAndRenderMenu();
});
