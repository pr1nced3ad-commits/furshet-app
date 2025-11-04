document.addEventListener("DOMContentLoaded", () => {
  const webApp = window.Telegram.WebApp;
  const SHEET =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRjs3r3_rV1jSs0d2KNQ9PIjip7nGdnSgKcj2kt6FqlZMCmWEd6M__nbdiPEQ5vJpDempKO-ykzQdbu/pub?gid=0&single=true&output=csv";
  const BACKEND = "https://functions.yandexcloud.net/d4ejsg34lsdstd4de2ug";
  const CURRENCY = "₽";

  let menu = {}, cart = {}, sending = false;

  async function loadMenu() {
    const acc = document.getElementById("menu-accordion");
    acc.innerHTML = "<p>Загрузка меню...</p>";
    try {
      const res = await fetch(SHEET);
      const text = await res.text();
      const rows = text.split("\n").slice(1);
      const parsed = {};
      rows.forEach(r => {
        const cols = r.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        if (cols.length < 4) return;
        const [id, cat, name, price] = cols.map(c => c.replace(/^"|"$/g, "").trim());
        if (!parsed[cat]) parsed[cat] = [];
        parsed[cat].push({ id, name, price: parseFloat(price) });
      });
      menu = parsed;
      renderMenu();
      updateAll();
    } catch { acc.innerHTML = "<p style='color:red;'>Ошибка загрузки</p>"; }
  }

  function renderMenu() {
    const acc = document.getElementById("menu-accordion");
    acc.innerHTML = "";
    Object.keys(menu).forEach(cat => {
      const item = document.createElement("div");
      item.className = "accordion-item";
      const head = document.createElement("div");
      head.className = "accordion-header";
      head.textContent = cat;
      const cont = document.createElement("div");
      cont.className = "accordion-content";
      menu[cat].forEach(it => {
        const div = document.createElement("div");
        div.className = "menu-item";
        div.innerHTML = `
          <div><strong>${it.name}</strong><br><small>${it.price} ${CURRENCY}</small></div>
          <div class="item-controls">
            <button class="minus" data-id="${it.id}">−</button>
            <span id="q-${it.id}">0</span>
            <button class="plus" data-id="${it.id}">+</button>
          </div>`;
        cont.appendChild(div);
      });
      item.append(head, cont);
      acc.appendChild(item);
      head.addEventListener("click", () => {
        head.classList.toggle("active");
        cont.style.maxHeight = cont.style.maxHeight ? null : cont.scrollHeight + "px";
      });
    });
  }

  function add(id) { cart[id] = (cart[id] || 0) + 1; updateAll(); }
  function remove(id) { if (cart[id]) { cart[id]--; if (cart[id]<=0) delete cart[id]; } updateAll(); }

  function totals() {
    let total = 0, count = 0;
    for (const id in cart) {
      const item = Object.values(menu).flat().find(i=>i.id===id);
      if (item) { total += item.price*cart[id]; count += cart[id]; }
    }
    return { total, count };
  }

  function updateAll() {
    Object.values(menu).flat().forEach(i=>{
      const el=document.getElementById(`q-${i.id}`); if(el) el.textContent=cart[i.id]||0;
    });
    const list=document.getElementById("cart-items-list");
    const head=document.getElementById("cart-header");
    const total=document.getElementById("total-price");
    list.innerHTML="";
    const {total:t,count}=totals();
    if(count===0){
      list.innerHTML="<li id='empty-cart-message'>Корзина пуста</li>";
      head.textContent="🛒 Ваша корзина";
      total.textContent="0"; webApp.MainButton.hide(); return;
    }
    head.textContent=`🛒 Ваша корзина (${count})`;
    Object.keys(cart).forEach(id=>{
      const i=Object.values(menu).flat().find(x=>x.id===id);
      if(i){const li=document.createElement("li");
      li.innerHTML=`<span>${i.name} ×${cart[id]}</span><strong>${i.price*cart[id]} ${CURRENCY}</strong>`;
      list.appendChild(li);}
    });
    total.textContent=total;
    webApp.MainButton.setText(`Оформить заказ (${t} ${CURRENCY})`);
    webApp.MainButton.show();
  }

  document.body.addEventListener("click",e=>{
    if(e.target.classList.contains("plus")) add(e.target.dataset.id);
    if(e.target.classList.contains("minus")) remove(e.target.dataset.id);
  });

  // раскрытие корзины
  const cartHead=document.getElementById("cart-header");
  const cartContent=document.getElementById("cart-content");
  cartHead.addEventListener("click",()=>{
    cartHead.classList.toggle("active");
    cartContent.style.maxHeight = cartContent.style.maxHeight ? null : cartContent.scrollHeight+"px";
  });

  // модалка
  const modal=document.getElementById("phone-modal");
  const input=document.getElementById("phone-input");
  const confirm=document.getElementById("confirm-order");
  const cancel=document.getElementById("cancel-order");
  cancel.onclick=()=>modal.classList.add("hidden");

  confirm.onclick=async()=>{
    if(sending) return;
    const phone=input.value.trim();
    if(!phone) return webApp.showAlert("Введите номер телефона!");
    sending=true;
    const {total}=totals();
    const order={cart:{},totalPrice:total,phoneNumber:phone,userInfo:webApp.initDataUnsafe?.user||{}};
    Object.keys(cart).forEach(id=>{
      const i=Object.values(menu).flat().find(x=>x.id===id);
      if(i) order.cart[i.name]={quantity:cart[id],price:i.price};
    });
    try{
      await fetch(BACKEND,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(order)});
      webApp.showAlert("✅ Заказ принят! Менеджер свяжется с вами.");
      cart={}; updateAll(); modal.classList.add("hidden");
    }catch{ webApp.showAlert("Ошибка отправки заказа"); }
    sending=false;
  };

  webApp.onEvent("mainButtonClicked",()=>{
    input.value=""; modal.classList.remove("hidden"); input.focus();
  });

  webApp.expand();
  loadMenu();
});
