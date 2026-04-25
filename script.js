const supabase = window.supabase.createClient(
  "https://TUO-PROGETTO.supabase.co",
  "TUA_ANON_KEY"
);
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOMContentLoaded - Script avviato");

    const user = getCurrentUser();

    if (user) {
        setState(AppState.DASHBOARD);
        renderOrders();
    } else {
        setState(AppState.HOME);
    }
    // Trash bin lives in the DOM already; drag behaviour is handled per-card
    // via pointer events in attachOrderDragHandlers (see below).
    // === FIX BOTTONE + ===
    const addBtn = document.querySelector(".add-btn");
    if (addBtn) {
      console.log("✅ Bottone + trovato e listener attaccato");
      addBtn.addEventListener("click", () => {
          console.log("🟢 Click sul pulsante + rilevato!");
          openOrderModal();
      });
    } else {
        console.error("❌ Bottone .add-btn NON trovato nel DOM!");
    }

    // ================= SEARCH =================
    const searchInput = document.querySelector(".search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => handleSearch(e));
    }

    // ================= CUSTOM SELECT =================
    initCustomSelect();

    // ================= FILTER =================
    document.getElementById("totaliCard")?.addEventListener("click", () => {
    currentFilter = "all";
    applyFilter();
    updateActiveCard();
  });

  document.getElementById("transitoCard")?.addEventListener("click", () => {
    currentFilter = "transito";
    applyFilter();
    updateActiveCard();
  });

  document.getElementById("consegnateCard")?.addEventListener("click", () => {
    currentFilter = "consegnato";
    applyFilter();
    updateActiveCard();
  });
});
function updateActiveCard() {
  document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));

  if (currentFilter === "all") {
    document.getElementById("totaliCard")?.classList.add("active");
  }
  if (currentFilter === "transito") {
    document.getElementById("transitoCard")?.classList.add("active");
  }
  if (currentFilter === "consegnato") {
    document.getElementById("consegnateCard")?.classList.add("active");
  }
}
function initCustomSelect(selector, onChange) {
  const select = document.querySelector(selector);
  if (!select) return;

  const header = select.querySelector(".select-header");
  const options = select.querySelectorAll(".select-list div");

  header.onclick = () => {
    select.classList.toggle("open");
  };

  options.forEach(opt => {
    opt.onclick = () => {
      header.innerText = opt.innerText;
      onChange(opt.dataset.value);
      select.classList.remove("open");
    };
  });

  document.addEventListener("click", (e) => {
    if (!select.contains(e.target)) {
      select.classList.remove("open");
    }
  });
}
let currentFilter = "all"; // 👈 QUI, fuori da tutto

//GLOW
let targetX = 0, targetY = 0;
let currentX = 0, currentY = 0;

document.addEventListener("mousemove", (e) => {
  targetX = (e.clientX / window.innerWidth - 0.5) * 20;
  targetY = (e.clientY / window.innerHeight - 0.5) * 20;

  const bg = document.querySelector(".bg-hex");
  if (bg) {
    bg.style.setProperty("--x", e.clientX + "px");
    bg.style.setProperty("--y", e.clientY + "px");
  }
});

function animate() {
  currentX += (targetX - currentX) * 0.08;
  currentY += (targetY - currentY) * 0.08;

  const bg = document.querySelector(".bg-hex");
  if (bg) {
    bg.style.transform = `translate(${currentX}px, ${currentY}px) scale(1.05)`;
  }

  requestAnimationFrame(animate);
}

animate();
// ================= GLOBAL CLICK HANDLER =================
window.addEventListener("click", (e) => {
  const detailsModal = document.getElementById("orderDetailsModal");
if (e.target === detailsModal) closeOrderDetails();
  const authModal = document.getElementById("authModal");
  const orderModal = document.getElementById("orderModal");
  const settingsModal = document.getElementById("settingsModal");

  if (e.target === authModal) closeModal();
  if (e.target === orderModal) closeOrderModal();
  if (e.target === settingsModal) closeSettings();
});

// ================= STATE MACHINE =================
const AppState = {
  HOME: "HOME",
  AUTH_MODAL: "AUTH_MODAL",
  DASHBOARD: "DASHBOARD"
};

let currentState = null;

function setState(newState) {
  currentState = newState;

  const hero = document.querySelector(".hero");
  const dashboard = document.getElementById("dashboardPanel");
  const modal = document.getElementById("authModal");
  const orderModal = document.getElementById("orderModal");
  const logoutBtn = document.getElementById("logoutBtn");
  const userLabel = document.getElementById("userLabel");
  const demo = document.getElementById("demoSection");

  const user = getCurrentUser();

  hero?.classList.add("hidden");
  dashboard?.classList.add("hidden");
  demo?.classList.add("hidden");

  modal?.classList.remove("active");
  orderModal?.classList.remove("active");

  document.body.classList.remove("home", "dashboard", "modal-open");

  switch (newState) {
    case AppState.HOME:
      hero?.classList.remove("hidden");
      demo?.classList.remove("hidden");
      logoutBtn?.classList.add("hidden");
      if (userLabel) userLabel.innerText = "";
      document.body.classList.add("home");
      break;

    case AppState.AUTH_MODAL:
      hero?.classList.remove("hidden");
      demo?.classList.remove("hidden");
      modal?.classList.add("active");
      document.body.classList.add("home", "modal-open");
      break;

    case AppState.DASHBOARD:
      dashboard?.classList.remove("hidden");
      logoutBtn?.classList.remove("hidden");
      if (userLabel) userLabel.innerText = user?.company || "";
      document.body.classList.add("dashboard");
      break;
  }
}

// ================= MODAL =================
function openModal() {
  setState(AppState.AUTH_MODAL);

  setTimeout(() => {
    switchTab(0);        // parte sempre dalla tab Login
  }, 100);
}

function closeModal() {
  setState(AppState.HOME);
}

// ================= ORDER MODAL =================
function openOrderModal() {
  console.log("chiamata");
  document.getElementById("orderModal")?.classList.add("active");
  document.body.classList.add("modal-open");

  // Utilizza setTimeout per assicurarti che il focus venga applicato dopo la visualizzazione del modal
  setTimeout(() => {
    const firstInput = document.getElementById("orderCompany");
    if (firstInput) {
      firstInput.focus();
    }
  }, 100); // 100 millisecondi sono solitamente sufficienti
  // Aggiungi il listener per la navigazione con invio
  document.addEventListener("keydown", handleOrderInputNavigation);
}

function closeOrderModal() {
  document.getElementById("orderModal")?.classList.remove("active");
  document.body.classList.remove("modal-open");
  document.removeEventListener("keydown", handleOrderInputNavigation);
}
function handleOrderInputNavigation(event) {
  if (event.key === "Enter") {
    event.preventDefault(); // per evitare che il form venga inviato

    const current = document.activeElement;

    if (current.id === "orderCompany") {
      document.getElementById("orderDestination").focus();
    } else if (current.id === "orderDestination") {
      document.getElementById("orderStatus").focus();
    } else if (current.id === "orderStatus") {
      // Se è l'ultimo, chiama createOrder()
      createOrder();
    }
  }
}

// ================= SETTINGS =================
function openSettings() {
  document.getElementById("settingsModal")?.classList.add("active");
  document.body.classList.add("modal-open");
}

function closeSettings() {
  document.getElementById("settingsModal")?.classList.remove("active");
  document.body.classList.remove("modal-open");
}

// ================= STORAGE =================
function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser"));
}

// ================= LOGIN =================
function login() {
  const email = (document.getElementById("loginEmail").value || "").trim().toLowerCase();
  const pass = document.getElementById("loginPass").value;

  if (!email || !pass) {
    showToast("Inserisci email e password");
    triggerShake();
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === pass);

  if (!user) {
    showToast("Credenziali errate");
    triggerShake();
    return;
  }

  localStorage.setItem("currentUser", JSON.stringify(user));

  showToast("Login riuscito");

  setTimeout(() => {
    setState(AppState.DASHBOARD);
    renderOrders();
  }, 300);
}
//realregister
async function register(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    showToast(error.message);
  } else {
    showToast("Registrazione completata");
  }
}
//reallogin
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showToast("Credenziali errate");
    return;
  }

  showToast("Login riuscito");
  setState(AppState.DASHBOARD);
  loadOrders();
}
//reallogout
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showToast("Credenziali errate");
    return;
  }

  showToast("Login riuscito");
  setState(AppState.DASHBOARD);
  loadOrders();
}
// ================= REGISTER =================
function doRegister() {
  const email = (document.getElementById("regEmail").value || "").trim().toLowerCase();
  const pass = document.getElementById("regPass").value;
  const company = (document.getElementById("regCompany").value || "").trim();

  if (!email || !pass || !company) {
    showToast("Compila tutti i campi");
    triggerShake();
    return;
  }

  const users = getUsers();
  if (users.some(u => u.email === email)) {
    showToast("Email già registrata");
    triggerShake();
    return;
  }

  const user = {
    id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email,
    password: pass,
    company
  };

  users.push(user);
  saveUsers(users);
  localStorage.setItem("currentUser", JSON.stringify(user));

  // Ensure this brand-new account starts with an empty, isolated order list —
  // never inherits anything from a legacy global `orders` key.
  localStorage.setItem(`orders:${user.id || user.email}`, JSON.stringify([]));

  showToast("Registrazione riuscita");

  setTimeout(() => {
    setState(AppState.DASHBOARD);
    renderOrders();
  }, 300);
}
// Legacy alias in case anything still calls register()
function register() { return doRegister(); }

// ================= LOGOUT =================
function logout() {
  showToast("Log-out effettuato");

  setTimeout(() => {
    localStorage.removeItem("currentUser");
    setState(AppState.HOME);
  }, 300);
}

// ================= ORDERS =================
// Orders are scoped per-user so registering or logging in with a different
// account does NOT show another user's orders.
function ordersKey() {
  const user = getCurrentUser();
  if (!user) return null;
  const uid = user.id || user.email;
  return `orders:${uid}`;
}

function getOrders() {
  const key = ordersKey();
  if (!key) return [];

  // Clear any legacy shared-across-accounts `orders` key. It predates
  // per-user scoping and must never leak into any account.
  if (localStorage.getItem("orders") !== null) {
    localStorage.removeItem("orders");
  }

  return JSON.parse(localStorage.getItem(key)) || [];
}

function saveOrders(orders) {
  const key = ordersKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(orders));
}

function createOrder() {
  const company = document.getElementById("orderCompany").value;
  const destination = document.getElementById("orderDestination").value;
  const deliveryDate = document.getElementById("orderDeliveryDate")?.value || "";
  const status = selectedValue;
  if (!company || !destination || !deliveryDate) {
    showToast("Compila tutti i campi");
    triggerShake();
    return;
  }

  const orders = getOrders();

  const newOrder = {
    id: Date.now(),
    company,
    destination,
    status,
    note: "",
    createdAt: Date.now(),
    deliveryDate // ISO yyyy-mm-dd
  };

  orders.push(newOrder);
  saveOrders(orders);

  showToast("Ordine creato");

  closeOrderModal();
  renderOrders();
}

// ================= PROGRESS / DEADLINE =================
// Returns { pct, overdue, daysLeft, label } describing an order's progress
// toward its delivery deadline. pct is clamped [0,1].
function computeOrderProgress(order) {
  if (!order.deliveryDate) return null;
  const deadline = new Date(`${order.deliveryDate}T23:59:59`).getTime();
  if (Number.isNaN(deadline)) return null;

  const start = order.createdAt || order.id || Date.now();
  const now = Date.now();

  const totalMs = Math.max(1, deadline - start);
  const elapsed = now - start;
  let pct = elapsed / totalMs;
  if (pct < 0) pct = 0;
  if (pct > 1) pct = 1;

  const overdue = now > deadline && order.status !== "consegnato";
  const delivered = order.status === "consegnato";

  if (delivered) pct = 1;

  const msDay = 86400000;
  const daysLeft = Math.ceil((deadline - now) / msDay);

  const dd = new Date(deadline);
  const label = `${String(dd.getDate()).padStart(2, "0")}/${String(dd.getMonth() + 1).padStart(2, "0")}/${dd.getFullYear()}`;

  return { pct, overdue, delivered, daysLeft, label };
}

function progressBarHTML(order) {
  const p = computeOrderProgress(order);
  if (!p) return "";
  const pctDisplay = Math.round(p.pct * 100);

  let stateClass = "";
  if (p.delivered) stateClass = "is-delivered";
  else if (p.overdue) stateClass = "is-overdue";
  else if (p.pct >= 0.75) stateClass = "is-warn";

  let info;
  if (p.delivered) {
    info = `Consegnato (${p.label})`;
  } else if (p.overdue) {
    const lateDays = Math.abs(p.daysLeft);
    info = `In ritardo di ${lateDays} ${lateDays === 1 ? "giorno" : "giorni"} — scadenza ${p.label}`;
  } else {
    const d = p.daysLeft;
    const dayTxt = d <= 0
      ? "Oggi"
      : `${d} ${d === 1 ? "giorno" : "giorni"} rimanenti`;
    info = `${dayTxt} — scadenza ${p.label}`;
  }

  const warnIcon = p.overdue
    ? `<span class="order-warning" title="In ritardo" aria-label="In ritardo">
         <svg viewBox="0 0 24 24" aria-hidden="true">
           <path d="M12 3 L22 20 H2 Z" fill="currentColor" stroke="none"/>
           <rect x="11" y="9" width="2" height="6" rx="1" fill="#1f1300"/>
           <rect x="11" y="16" width="2" height="2" rx="1" fill="#1f1300"/>
         </svg>
       </span>`
    : "";

  return `
    <div class="order-progress ${stateClass}">
      <div class="order-progress-meta">
        <span class="order-progress-info">${warnIcon}<span>${info}</span></span>
        <span class="order-progress-pct">${pctDisplay}%</span>
      </div>
      <div class="order-progress-track">
        <div class="order-progress-fill" style="width:${pctDisplay}%"></div>
      </div>
    </div>
  `;
}

function renderOrders() {
  const container = document.getElementById("ordersList");
  if (!container) return;

  container.innerHTML = "";

  let orders = getOrders(); // 👉 NIENTE filtro qui

  orders.forEach((order) => {
    const div = document.createElement("div");
    div.className = "order-card";

    div.dataset.id = order.id;
    div.dataset.company = order.company.toLowerCase();
    div.dataset.destination = order.destination.toLowerCase();

    div.innerHTML = `
      <div class="order-row">
        <div class="order-text">
          <strong class="order-id">#${order.id}</strong> -
          <span class="order-company">${order.company}</span>
          <div class="order-destination">${order.destination}</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="status-dot status-${order.status}"></div>
          <label class="switch">
            <input type="checkbox" ${order.status === "consegnato" ? "checked" : ""}
            onchange="toggleOrder(${order.id})">
            <span class="slider"></span>
          </label>
        </div>
      </div>
      ${progressBarHTML(order)}
    `;

    container.appendChild(div);

    attachOrderDragHandlers(div, order);
  });

  updateStats();
  applyFilter(); // 👉 SOLO QUI
}

// ================= DRAG-TO-DELETE (morph into orange sphere) =================
function attachOrderDragHandlers(card, order) {
  let startX = 0, startY = 0;
  let startRect = null;
  let ghost = null;
  let dragging = false;
  let pointerIdCaptured = null;
  let suppressClick = false;

  const DRAG_THRESHOLD = 6;
  const PROXIMITY_MAX = 320; // px from bin center: morph starts
  const PROXIMITY_MIN = 70;  // px from bin center: morph fully complete
  const DROP_RADIUS   = 95;  // px: release here = delete
  const SPHERE_SIZE   = 96;  // final sphere diameter

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    // Don't start a drag when interacting with the status toggle switch
    if (e.target.closest(".switch")) return;

    startX = e.clientX;
    startY = e.clientY;
    startRect = card.getBoundingClientRect();
    pointerIdCaptured = e.pointerId;

    try { card.setPointerCapture(pointerIdCaptured); } catch (_) {}

    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerup", onPointerUp);
    card.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(e) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      beginDrag();
    }
    updateDrag(e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    card.removeEventListener("pointermove", onPointerMove);
    card.removeEventListener("pointerup", onPointerUp);
    card.removeEventListener("pointercancel", onPointerUp);
    try { card.releasePointerCapture(pointerIdCaptured); } catch (_) {}

    if (!dragging) {
      // No drag started → treat as a click (open details)
      return;
    }
    finishDrag(e.clientX, e.clientY);
  }

  function beginDrag() {
    dragging = true;
    suppressClick = true;

    ghost = card.cloneNode(true);
    ghost.classList.remove("order-card");
    ghost.classList.add("order-ghost");
    ghost.removeAttribute("data-id");
    ghost.style.setProperty("--morph", "0");
    ghost.style.left = startRect.left + "px";
    ghost.style.top = startRect.top + "px";
    ghost.style.width = startRect.width + "px";
    ghost.style.height = startRect.height + "px";
    ghost.style.setProperty("--radius", "14px");
    // Neutralise interactive children in the clone
    ghost.querySelectorAll("input, button, a").forEach(el => {
      el.disabled = true;
      el.tabIndex = -1;
    });
    document.body.appendChild(ghost);

    card.classList.add("order-source-hidden");
  }

  function updateDrag(px, py) {
    const bin = document.getElementById("trashBin");
    if (!bin) return;

    const r = bin.getBoundingClientRect();
    const bx = r.left + r.width / 2;
    const by = r.top + r.height / 2;
    const dist = Math.hypot(px - bx, py - by);

    let morph = 1 - (dist - PROXIMITY_MIN) / (PROXIMITY_MAX - PROXIMITY_MIN);
    morph = Math.max(0, Math.min(1, morph));

    const baseW = startRect.width, baseH = startRect.height;
    const w = baseW + (SPHERE_SIZE - baseW) * morph;
    const h = baseH + (SPHERE_SIZE - baseH) * morph;

    const dx = px - startX, dy = py - startY;
    const origLeft   = startRect.left + dx;
    const origTop    = startRect.top + dy;
    const centerLeft = px - w / 2;
    const centerTop  = py - h / 2;
    const left = origLeft + (centerLeft - origLeft) * morph;
    const top  = origTop  + (centerTop  - origTop)  * morph;

    const radius = 14 + (Math.min(w, h) / 2 - 14) * morph;

    ghost.style.width = w + "px";
    ghost.style.height = h + "px";
    ghost.style.left = left + "px";
    ghost.style.top = top + "px";
    ghost.style.setProperty("--morph", morph);
    ghost.style.setProperty("--radius", radius + "px");

    // Bin reactions
    if (morph > 0.15) bin.classList.add("open");
    else bin.classList.remove("open");

    if (dist < DROP_RADIUS) bin.classList.add("armed");
    else bin.classList.remove("armed");
  }

  function finishDrag(px, py) {
    const bin = document.getElementById("trashBin");
    const r = bin.getBoundingClientRect();
    const bx = r.left + r.width / 2;
    const by = r.top + r.height / 2;
    const dist = Math.hypot(px - bx, py - by);

    if (dist < DROP_RADIUS) {
      // Consumed by the bin: shoot into it, then delete
      const gw = ghost.getBoundingClientRect().width;
      const gh = ghost.getBoundingClientRect().height;
      ghost.classList.add("consumed");
      ghost.style.left = (bx - gw / 2) + "px";
      ghost.style.top  = (by - gh / 2) + "px";
      ghost.style.setProperty("--morph", 1);

      const cleanup = () => {
        bin.classList.remove("open", "armed");
        bin.classList.add("shut");
        setTimeout(() => bin.classList.remove("shut"), 350);
        if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
        deleteOrder(order.id);
      };
      ghost.addEventListener("transitionend", cleanup, { once: true });
      setTimeout(cleanup, 500); // safety net
    } else {
      // Returned to its place
      bin.classList.remove("open", "armed");
      ghost.classList.add("returning");
      ghost.style.setProperty("--morph", 0);
      ghost.style.setProperty("--radius", "14px");
      ghost.style.left = startRect.left + "px";
      ghost.style.top = startRect.top + "px";
      ghost.style.width = startRect.width + "px";
      ghost.style.height = startRect.height + "px";

      const cleanup = () => {
        if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
        card.classList.remove("order-source-hidden");
      };
      ghost.addEventListener("transitionend", cleanup, { once: true });
      setTimeout(cleanup, 400); // safety net
    }
    dragging = false;
  }

  card.addEventListener("pointerdown", onPointerDown);

  // Clicks open details — but only if we did not just finish a drag and
  // the click didn't originate from the status toggle switch (its click
  // bubbles up from the slider/label even though onChange handles it).
  card.addEventListener("click", (e) => {
    if (suppressClick) {
      suppressClick = false;
      e.stopImmediatePropagation();
      return;
    }
    if (e.target.closest(".switch")) return;
    openOrderDetails(order);
  });
}
// Kept as a no-op for any remaining call sites: card-level transitions now
// make the list height animate naturally, so no manual height juggling.
function animateListHeight(callback) {
  if (typeof callback === "function") callback();
}
function deleteOrder(id) {
  let orders = getOrders();

  orders = orders.filter(o => o.id !== id);

  saveOrders(orders);
  renderOrders();
}

function toggleOrder(id) {
  let orders = getOrders();

  orders = orders.map(o => {
    if (o.id === id) {
      o.status = o.status === "consegnato" ? "transito" : "consegnato";
    }
    return o;
  });

  saveOrders(orders);
  renderOrders();
}

function updateStats() {
  const orders = getOrders();

  document.getElementById("totali").innerText = orders.length;
  document.getElementById("transito").innerText =
    orders.filter(o => o.status === "transito").length;

  document.getElementById("consegnate").innerText =
    orders.filter(o => o.status === "consegnato").length;
}

// ================= TOAST =================


function triggerShake() {
  const box = document.querySelector(".modal-box");
  if (!box) return;

  box.classList.add("shake");

  setTimeout(() => {
    box.classList.remove("shake");
  }, 350);
}
function openOrderDetails(order) {
  document.getElementById("detailId").innerText = order.id;

  document.getElementById("detailCompanyInput").value = order.company;
  document.getElementById("detailDestinationInput").value = order.destination;
  document.getElementById("detailNote").value = order.note || "";
  const dateInput = document.getElementById("detailDeliveryDate");
  if (dateInput) dateInput.value = order.deliveryDate || "";

  // stato
  detailSelectedValue = order.status;

  const header = document.querySelector("#detailStatusCustom .select-header");

  if (header) {
    if (order.status === "programmato") header.innerText = "Programmato";
    if (order.status === "transito") header.innerText = "In transito";
    if (order.status === "consegnato") header.innerText = "Consegnato";
  }

  document.getElementById("orderDetailsModal").classList.add("active");
  document.body.classList.add("modal-open");

  initDetailSelect(); // 👈 IMPORTANTISSIMO
}
function saveOrderChanges() {
  const id = document.getElementById("detailId").innerText;

  const company = document.getElementById("detailCompanyInput").value;
  const destination = document.getElementById("detailDestinationInput").value;
  const note = document.getElementById("detailNote").value;
  const deliveryDate = document.getElementById("detailDeliveryDate")?.value || "";

  let orders = getOrders();

  orders = orders.map(o => {
    if (o.id == id) {
      o.company = company;
      o.destination = destination;
      o.status = detailSelectedValue;
      o.note = note;
      o.deliveryDate = deliveryDate;
    }
    return o;
  });

  saveOrders(orders);

  renderOrders();

  // ✨ mostra feedback dentro il modal
  showSaveFeedback();

  // 👉 aspetta prima di chiudere (effetto iOS)
  setTimeout(() => {
    closeOrderDetails();
    showToast("Modifiche salvate");
  }, 900);
}
function closeOrderDetails() {
  document.getElementById("orderDetailsModal").classList.remove("active");
  document.body.classList.remove("modal-open");
}
let currentTab = 0;

// ================= TAB PILL SWITCHER (stile iPhone) =================
// ================= TAB PILL SWITCHER + AUTO FOCUS + ENTER =================
// ================= TAB PILL SWITCHER + SMART ENTER =================
function switchTab(tabIndex) {
  const pill = document.getElementById("pill");
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  // Muove la pill
  if (pill) {
    pill.style.transform = `translateX(${tabIndex * 100}%)`;
  }

  loginTab.classList.toggle("active", tabIndex === 0);
  registerTab.classList.toggle("active", tabIndex === 1);

  loginForm.classList.toggle("active", tabIndex === 0);
  registerForm.classList.toggle("active", tabIndex === 1);

  // Auto-focus + setup della logica Invio
  setTimeout(() => {
    if (tabIndex === 0) {
      setupLoginEnterLogic();
      document.getElementById("loginEmail")?.focus();
    } else {
      setupRegisterEnterLogic();
      document.getElementById("regEmail")?.focus();
    }
  }, 280);
}
// ================= LOGICA INVIO PER LOGIN =================
function setupLoginEnterLogic() {
  const email = document.getElementById("loginEmail");
  const password = document.getElementById("loginPass");

  // Rimuovo eventuali listener precedenti per evitare duplicati
  email.onkeypress = null;
  password.onkeypress = null;

  email.onkeypress = function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      password.focus();
    }
  };

  password.onkeypress = function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      login();           // esegue il login
    }
  };
}
//salva feedback modifiche
function showSaveFeedback() {
  const feedback = document.getElementById("saveFeedback");
  if (!feedback) return;
  feedback.classList.remove("show"); // reset animazione
 void feedback.offsetWidth;         // force reflow 🔥
  feedback.classList.add("show");

  setTimeout(() => {
    feedback.classList.remove("show");
  }, 1800);
}
// ================= LOGICA INVIO PER REGISTER =================
function setupRegisterEnterLogic() {
  const email = document.getElementById("regEmail");
  const password = document.getElementById("regPass");
  const company = document.getElementById("regCompany");

  email.onkeypress = null;
  password.onkeypress = null;
  company.onkeypress = null;

  email.onkeypress = function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      password.focus();
    }
  };

  password.onkeypress = function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      company.focus();
    }
  };

  company.onkeypress = function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      doRegister();      // esegue la registrazione
    }
  };
}
// ================= TOAST =================
function showToast(message, duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) {
    console.warn("Contenitore toast non trovato");
    return;
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;

  // Imposta lo stile iniziale
  toast.style.opacity = "0";
  toast.style.transform = "translateY(20px) scale(0.95)";

  // Applica l'animazione di ingresso
  toast.style.animation = "toastIn 0.3s forwards";

  container.appendChild(toast);

  // Rimuovi il toast dopo il tempo stabilito
  setTimeout(() => {
    // Avvia l'animazione di uscita
    toast.style.animation = "toastOut 0.3s forwards";

    // Rimuovi dal DOM al termine dell'animazione
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, duration);
}
function handleKeyDown(event) {
  const active = document.activeElement;

  if (
    event.key === "Enter" &&
    (active.id === "orderCompany" ||
     active.id === "orderDestination" ||
     active.id === "orderStatus")
  ) {
    createOrder();
  }
}
// ================= CUSTOM SELECT =================
let selectedValue = "programmato";

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("orderStatusCustom");
  if (!select) return; // evita errori se non esiste

  const header = select.querySelector(".select-header");
  const options = select.querySelectorAll(".select-list div");

  header.addEventListener("click", () => {
    select.classList.toggle("open");
  });

  options.forEach(opt => {
    opt.addEventListener("click", () => {
      header.innerText = opt.innerText;
      selectedValue = opt.dataset.value;
      select.classList.remove("open");
    });
  });

  // chiusura clic fuori
  document.addEventListener("click", (e) => {
    if (!select.contains(e.target)) {
      select.classList.remove("open");
    }
  });
});
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  document.querySelectorAll(".order-card").forEach(card => {
    const text = card.innerText.toLowerCase();
    card.classList.toggle("is-hidden", !text.includes(query));
  });
}
const video = document.getElementById("demoVideo");
const container = document.getElementById("demoSection");

if (video) {
  video.addEventListener("click", () => {
    if (video.paused) {
      video.play();
      container.classList.add("playing");
    } else {
      video.pause();
      container.classList.remove("playing");
    }
  });
}
function highlight(text, query) {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, `<span class="highlight">$1</span>`);
}
// ================= PATCH FINALE SEARCH + FIX BUG =================

// stato ricerca
let filteredResults = [];
let selectedIndex = -1;

// patch handleSearch (override SENZA rimuovere il tuo)
const originalHandleSearch = handleSearch;

handleSearch = function(e) {
  const query = e.target.value.toLowerCase().trim();
  const cards = document.querySelectorAll(".order-card");

  filteredResults = [];
  selectedIndex = -1;

  cards.forEach(card => {
    const id = card.dataset.id || "";
    const company = card.dataset.company || "";
    const destination = card.dataset.destination || "";

    const fullText = `${id} ${company} ${destination}`;
    const match = fullText.includes(query);

    card.classList.toggle("is-hidden", !match);

    const idEl = card.querySelector(".order-id");
    const compEl = card.querySelector(".order-company");
    const destEl = card.querySelector(".order-destination");

    if (match) {
      filteredResults.push(card);
      if (idEl) idEl.innerHTML = highlight(`#${id}`, query);
      if (compEl) compEl.innerHTML = highlight(company, query);
      if (destEl) destEl.innerHTML = highlight(destination, query);
    } else {
      // strip any previous <span class="highlight"> so re-matches are clean
      if (idEl) idEl.textContent = `#${id}`;
      if (compEl) compEl.textContent = company;
      if (destEl) destEl.textContent = destination;
    }
  });
};

// ================= FIX ENTER (NO CREATE ORDER) =================

document.addEventListener("keydown", (e) => {
  const active = document.activeElement;

  if (active.id !== "searchInput") return;

  if (e.key === "Enter") {
    e.preventDefault();

    if (filteredResults.length && selectedIndex >= 0) {
      const selected = filteredResults[selectedIndex];
      const id = selected.dataset.id;

      const orders = getOrders();
      const order = orders.find(o => o.id == id);

      if (order) openOrderDetails(order);
    }
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex = (selectedIndex + 1) % filteredResults.length;
    updateSelection();
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex =
      (selectedIndex - 1 + filteredResults.length) % filteredResults.length;
    updateSelection();
  }
});

// ================= SELEZIONE VISIVA =================

function updateSelection() {
  document.querySelectorAll(".order-card").forEach(card => {
    card.classList.remove("selected");
  });

  if (filteredResults[selectedIndex]) {
    const el = filteredResults[selectedIndex];
    el.classList.add("selected");

    el.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }
}
function applyFilter() {
  const cards = document.querySelectorAll(".order-card");

  cards.forEach(card => {
    const statusDot = card.querySelector(".status-dot");
    if (!statusDot) return;

    const isTransito = statusDot.classList.contains("status-transito");
    const isConsegnato = statusDot.classList.contains("status-consegnato");

    let show = true;
    if (currentFilter === "transito") show = isTransito;
    if (currentFilter === "consegnato") show = isConsegnato;

    card.classList.toggle("is-hidden", !show);
  });
}

// ================= FIX DATASET SENZA TOCCARE IL TUO CODICE =================

const originalRenderOrders = renderOrders;

renderOrders = function() {
  originalRenderOrders();
  const cards = document.querySelectorAll(".order-card");

  cards.forEach(card => {
    const idEl = card.querySelector(".order-id");
    const compEl = card.querySelector(".order-company");
    const destEl = card.querySelector(".order-destination");

    card.dataset.id = idEl?.innerText.replace("#", "") || "";
    card.dataset.company = compEl?.innerText.toLowerCase() || "";
    card.dataset.destination = destEl?.innerText.toLowerCase() || "";
  });
};

// ================= BLOCCA BUG ENTER GLOBALE =================

const originalHandleKeyDown = handleKeyDown;

handleKeyDown = function(event) {
  const active = document.activeElement;

  // 👉 blocca completamente search input
  if (active.id === "searchInput") return;

  originalHandleKeyDown(event);
};
let detailSelectedValue = "programmato";

// Idempotent: every call to openOrderDetails re-invokes this, so we must
// attach listeners exactly ONCE. Otherwise the header accumulates toggle
// handlers and after a few opens clicking it no-ops (even toggles cancel).
function initDetailSelect() {
  const select = document.getElementById("detailStatusCustom");
  if (!select || select.dataset.initialized === "1") return;
  select.dataset.initialized = "1";

  const header = select.querySelector(".select-header");

  header.addEventListener("click", (e) => {
    e.stopPropagation();
    select.classList.toggle("open");
  });

  // Event-delegation on the list — only the three real options carry
  // data-value, so stray nodes can't hijack the dropdown.
  const list = select.querySelector(".select-list");
  list.addEventListener("click", (e) => {
    const opt = e.target.closest("[data-value]");
    if (!opt || !list.contains(opt)) return;
    e.stopPropagation();
    header.innerText = opt.innerText;
    detailSelectedValue = opt.dataset.value;
    select.classList.remove("open");
  });

  document.addEventListener("click", (e) => {
    if (!select.contains(e.target)) {
      select.classList.remove("open");
    }
  });
}
// Legacy HTML5 drag hooks removed — dragging is handled via pointer events
// in attachOrderDragHandlers (see "DRAG-TO-DELETE" section above).
