document.addEventListener("DOMContentLoaded", () => {
  const webApp = window.Telegram.WebApp;
  const GOOGLE_SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRjs3r3_rV1jSs0d2KNQ9PIjip7nGdnSgKcj2kt6FqlZMCmWEd6M__nbdiPEQ5vJpDempKO-ykzQdbu/pub?gid=0&single=true&output=csv";
  const BACKEND_URL = "https://functions.yandexcloud.net/d4ejsg34lsdstd4de2ug";
  const CURRENCY = "₽";

  let menu = {}, cart = {};

  // ===== Загрузка меню =====
  async function loadMenu() {
    const acc = document.getElementById("menu-accordion");
    acc.innerHTML = "<p>Загрузка меню...</p>";
    try {
      const res = await fetch(GOOGLE_SHEET_CSV_URL);
      const text = await res.text();
      const rows = text.split("\n").slice(1);
      const parsed = {};
      rows.forEach((r) => {
        const cols = r.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        if (cols.length < 4) return;
        const [id, category, name, price] = cols.map((c) => c.replace(/^"|"$/g, "").trim());
        if (!parsed[category]) parsed[category] = [];
        parsed[category].push({ id, name, price: parseFloat(price) });
      });
      menu = parsed;
      renderMenu();
      updateDisplays();
    } catch {
      acc.innerHTML = "<p style='color:red;'>Ошибка загрузки меню</p>";
    }
  }

  // ===== Рендер =====
  function renderMenu() {
    const acc = document.getElementById("menu-accordion");
    acc.innerHTML = "";
    Object.keys(menu).forEach((cat) => {
      const wrap = document.createElement("div");
      wrap.className = "accordion-item";
      const head = document.createElement("div");
      head.className = "accordion-header";
      head.innerText = cat;
      const content = document.createElement("div");
      content.className = "accordion-content";

      menu[cat].forEach((item) => {
        const div = document.createElement("div");
        div.className = "menu-item";
        div.innerHTML = `
          <div><strong>${item.name}</strong><br><small>${item.price} ${CURRENCY}</small></div>
          <div class="item-controls">
            <button data-id="${item.id}" class="minus">−</button>
            <span id="q-${item.id}">0</span>
            <button data-id="${item.id}" class="plus">+</button>
          </div>`;
        content.appendChild(div);
      });
      wrap.appendChild(head);
      wrap.appendChild(content);
      acc.appendChild(wrap);
      head.addEventListener("click", () => {
        head.classList.toggle("active");
        content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
      });
    });
  }

  // ===== Обновления =====
  function add(id) { cart[id] = (cart[id] || 0) + 1; updateDisplays(); }
  function remove(id) {
    if (cart[id]) { cart[id]--; if (cart[id] <= 0) delete cart[id]; }
    updateDisplays();
  }

  function computeTotals() {
    let total = 0, items = 0;
    for (const id in cart) {
      const item = Object.values(menu).flat().find((i) => i.id === id);
      if (item) { total += item.price * cart[id]; items += cart[id]; }
    }
    return { total, items };
  }

  function updateDisplays() {
    for (const cat in menu)
      menu[cat].forEach((i) => {
        const el = document.getElementById(`q-${i.id}`);
        if (el) el.innerText = cart[i.id] || 0;
      });

    const list = document.getElementById("cart-items-list");
    const header = document.getElementById("cart-header");
    const totalEl = document.getElementById("total-price");
    list.innerHTML = "";
    const { total, items } = computeTotals();
    if (items === 0) {
      list.innerHTML = "<li id='empty-cart-message'>Корзина пуста</li>";
      header.innerText = "🛒 Ваша корзина";
      webApp.MainButton.hide();
      totalEl.textContent = "0";
      return;
    }
    header.innerText = `🛒 Ваш заказ (${items})`;
    Object.keys(cart).forEach((id) => {
      const item = Object.values(menu).flat().find((i) => i.id === id);
      if (item) {
        const li = document.createElement("li");
        li.innerHTML = `<span>${item.name} ×${cart[id]}</span><strong>${item.price * cart[id]} ${CURRENCY}</strong>`;
        list.appendChild(li);
      }
    });
    totalEl.textContent = total;
    webApp.MainButton.setText(`Оформить заказ (${total} ${CURRENCY})`);
    webApp.MainButton.show();
  }

  document.body.addEventListener("click", (e) => {
    if (e.target.classList.contains("plus")) add(e.target.dataset.id);
    if (e.target.classList.contains("minus")) remove(e.target.dataset.id);
  });

  // ===== Модалка =====
  const modal = document.getElementById("phone-modal");
  const input = document.getElementById("phone-input");
  const btnConfirm = document.getElementById("confirm-order");
  const btnCancel = document.getElementById("cancel-order");

  btnCancel.onclick = () => (modal.classList.add("hidden"));
  btnConfirm.onclick = async () => {
    const phone = input.value.trim();
    if (!phone) return webApp.showAlert("Введите номер телефона!");
    const totals = computeTotals();
    const order = {
      cart: {},
      totalPrice: totals.total,
      phoneNumber: phone,
      userInfo: webApp.initDataUnsafe?.user || {}
    };
    Object.keys(cart).forEach((id) => {
      const item = Object.values(menu).flat().find((i) => i.id === id);
      if (item) order.cart[item.name] = { quantity: cart[id], price: item.price };
    });
    try {
      await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      webApp.showAlert("✅ Заказ принят! Менеджер свяжется с вами.");
      modal.classList.add("hidden");
      cart = {};
      updateDisplays();
    } catch {
      webApp.showAlert("Ошибка при отправке заказа 😔");
    }
  };

  webApp.onEvent("mainButtonClicked", () => {
    input.value = "";
    modal.classList.remove("hidden");
    input.focus();
  });

  webApp.expand();
  loadMenu();
});
