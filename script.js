// ================= SUPABASE INIT =================
const SUPABASE_URL = "https://awsqwdexuulygqbmjrnh.supabase.co";
const SUPABASE_KEY = "sb_publishable_WxSvur3NIRIrrwWppEr5Vg_q68kxlAB";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= IN-MEMORY CACHES =================
let currentUserCache = null; // { id, email, company }
let ordersCache = [];        // mirror of public.orders for current user

function getCurrentUser() { return currentUserCache; }
function getOrders() { return ordersCache; }

// Map a DB row to the shape the rest of the UI expects
function mapOrderRow(row) {
  return {
    id: row.id,
    company: row.company,
    destination: row.destination,
    status: row.status,
    note: row.note || "",
    deliveryDate: row.delivery_date || "",
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now()
  };
}

async function loadProfileAndOrders(userId, fallbackEmail) {
  // profile
  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", userId).maybeSingle();

  currentUserCache = {
    id: userId,
    email: profile?.email || fallbackEmail || "",
    company: profile?.company || ""
  };

  // orders
  const { data: rows, error } = await supabase
    .from("orders").select("*").order("created_at", { ascending: true });

  if (error) { console.error(error); ordersCache = []; }
  else ordersCache = (rows || []).map(mapOrderRow);
}

// ================= BOOT =================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("\u2705 DOMContentLoaded");

  // Restore session if any
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await loadProfileAndOrders(session.user.id, session.user.email);
    setState(AppState.DASHBOARD);
    renderOrders();
  } else {
    setState(AppState.HOME);
  }

  document.querySelector(".add-btn")?.addEventListener("click", () => openOrderModal());
  document.querySelector(".search-input")?.addEventListener("input", (e) => handleSearch(e));

  document.getElementById("totaliCard")?.addEventListener("click", () => { currentFilter = "all"; applyFilter(); updateActiveCard(); });
  document.getElementById("transitoCard")?.addEventListener("click", () => { currentFilter = "transito"; applyFilter(); updateActiveCard(); });
  document.getElementById("consegnateCard")?.addEventListener("click", () => { currentFilter = "consegnato"; applyFilter(); updateActiveCard(); });
});

function updateActiveCard() {
  document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
  if (currentFilter === "all") document.getElementById("totaliCard")?.classList.add("active");
  if (currentFilter === "transito") document.getElementById("transitoCard")?.classList.add("active");
  if (currentFilter === "consegnato") document.getElementById("consegnateCard")?.classList.add("active");
}

let currentFilter = "all";

// ================= GLOW BG =================
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
  if (bg) bg.style.transform = `translate(${currentX}px, ${currentY}px) scale(1.05)`;
  requestAnimationFrame(animate);
}
animate();

// ================= GLOBAL CLICK =================
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

// ================= STATE =================
const AppState = { HOME: "HOME", AUTH_MODAL: "AUTH_MODAL", DASHBOARD: "DASHBOARD" };
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
      if (userLabel) userLabel.innerText = user?.company || user?.email || "";
      document.body.classList.add("dashboard");
      break;
  }
}

// ================= MODALS =================
function openModal()  { setState(AppState.AUTH_MODAL); setTimeout(() => switchTab(0), 100); }
function closeModal() { setState(AppState.HOME); }

function openOrderModal() {
  document.getElementById("orderModal")?.classList.add("active");
  document.body.classList.add("modal-open");
  setTimeout(() => document.getElementById("orderCompany")?.focus(), 100);
  document.addEventListener("keydown", handleOrderInputNavigation);
}
function closeOrderModal() {
  document.getElementById("orderModal")?.classList.remove("active");
  document.body.classList.remove("modal-open");
  document.removeEventListener("keydown", handleOrderInputNavigation);
}
function handleOrderInputNavigation(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const c = document.activeElement;
  if (c.id === "orderCompany") document.getElementById("orderDestination").focus();
  else if (c.id === "orderDestination") document.getElementById("orderDeliveryDate").focus();
  else if (c.id === "orderDeliveryDate") createOrder();
}
function openSettings()  { document.getElementById("settingsModal")?.classList.add("active"); document.body.classList.add("modal-open"); }
function closeSettings() { document.getElementById("settingsModal")?.classList.remove("active"); document.body.classList.remove("modal-open"); }

// ================= AUTH (SUPABASE) =================
async function login() {
  const email = (document.getElementById("loginEmail").value || "").trim().toLowerCase();
  const pass  = document.getElementById("loginPass").value;
  if (!email || !pass) { showToast("Inserisci email e password"); triggerShake(); return; }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) { showToast("Credenziali errate"); triggerShake(); return; }

  await loadProfileAndOrders(data.user.id, data.user.email);
  showToast("Login riuscito");
  setTimeout(() => { setState(AppState.DASHBOARD); renderOrders(); }, 200);
}

async function doRegister() {
  const email = (document.getElementById("regEmail").value || "").trim().toLowerCase();
  const pass  = document.getElementById("regPass").value;
  const company = (document.getElementById("regCompany").value || "").trim();
  if (!email || !pass || !company) { showToast("Compila tutti i campi"); triggerShake(); return; }

  const { data, error } = await supabase.auth.signUp({ email, password: pass });
  if (error) {
    showToast(error.message?.includes("registered") ? "Email gi\u00e0 registrata" : (error.message || "Errore registrazione"));
    triggerShake();
    return;
  }

  // No session => email confirmation is enabled. Tell the user.
  if (!data.session) {
    showToast("Controlla l'email per confermare l'account");
    return;
  }

  // Insert profile (RLS allows because we are authenticated)
  const { error: pErr } = await supabase.from("profiles").insert({
    id: data.user.id, email, company
  });
  if (pErr) console.error("profile insert", pErr);

  currentUserCache = { id: data.user.id, email, company };
  ordersCache = [];
  showToast("Registrazione riuscita");
  setTimeout(() => { setState(AppState.DASHBOARD); renderOrders(); }, 200);
}
// alias legacy
function register() { return doRegister(); }

async function logout() {
  await supabase.auth.signOut();
  currentUserCache = null;
  ordersCache = [];
  showToast("Log-out effettuato");
  setTimeout(() => setState(AppState.HOME), 200);
}

// ================= ORDERS (SUPABASE) =================
async function createOrder() {
  const company = document.getElementById("orderCompany").value;
  const destination = document.getElementById("orderDestination").value;
  const deliveryDate = document.getElementById("orderDeliveryDate")?.value || "";
  const status = selectedValue;
  if (!company || !destination || !deliveryDate) { showToast("Compila tutti i campi"); triggerShake(); return; }

  const user = getCurrentUser();
  if (!user) { showToast("Non sei loggato"); return; }

  const { data, error } = await supabase.from("orders").insert({
    user_id: user.id,
    company, destination, status,
    delivery_date: deliveryDate,
    note: ""
  }).select().single();

  if (error) { console.error(error); showToast("Errore creazione: " + error.message); return; }

  ordersCache.push(mapOrderRow(data));
  showToast("Ordine creato");
  closeOrderModal();
  // reset fields
  document.getElementById("orderCompany").value = "";
  document.getElementById("orderDestination").value = "";
  document.getElementById("orderDeliveryDate").value = "";
  renderOrders();
}

async function deleteOrder(id) {
  ordersCache = ordersCache.filter(o => o.id !== id);
  renderOrders();
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) { console.error(error); showToast("Errore eliminazione"); }
}

async function toggleOrder(id) {
  const o = ordersCache.find(x => x.id == id);
  if (!o) return;
  o.status = o.status === "consegnato" ? "transito" : "consegnato";
  renderOrders();
  await supabase.from("orders").update({ status: o.status }).eq("id", id);
}

async function saveOrderChanges() {
  const id = document.getElementById("detailId").innerText;
  const company = document.getElementById("detailCompanyInput").value;
  const destination = document.getElementById("detailDestinationInput").value;
  const note = document.getElementById("detailNote").value;
  const deliveryDate = document.getElementById("detailDeliveryDate")?.value || "";

  // optimistic update
  ordersCache = ordersCache.map(o => o.id == id
    ? { ...o, company, destination, status: detailSelectedValue, note, deliveryDate }
    : o);
  renderOrders();

  const { error } = await supabase.from("orders").update({
    company, destination, status: detailSelectedValue, note,
    delivery_date: deliveryDate || null
  }).eq("id", id);
  if (error) { console.error(error); showToast("Errore salvataggio"); return; }

  showSaveFeedback();
  setTimeout(() => { closeOrderDetails(); showToast("Modifiche salvate"); }, 900);
}

function updateStats() {
  const orders = getOrders();
  document.getElementById("totali").innerText = orders.length;
  document.getElementById("transito").innerText = orders.filter(o => o.status === "transito").length;
  document.getElementById("consegnate").innerText = orders.filter(o => o.status === "consegnato").length;
}

// ================= PROGRESS BAR =================
function computeOrderProgress(order) {
  if (!order.deliveryDate) return null;
  const deadline = new Date(`${order.deliveryDate}T23:59:59`).getTime();
  if (Number.isNaN(deadline)) return null;
  const start = order.createdAt || Date.now();
  const now = Date.now();
  const totalMs = Math.max(1, deadline - start);
  const elapsed = now - start;
  let pct = elapsed / totalMs;
  if (pct < 0) pct = 0; if (pct > 1) pct = 1;
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
  if (p.delivered) info = `Consegnato (${p.label})`;
  else if (p.overdue) {
    const lateDays = Math.abs(p.daysLeft);
    info = `In ritardo di ${lateDays} ${lateDays === 1 ? "giorno" : "giorni"} \u2014 scadenza ${p.label}`;
  } else {
    const d = p.daysLeft;
    const dayTxt = d <= 0 ? "Oggi" : `${d} ${d === 1 ? "giorno" : "giorni"} rimanenti`;
    info = `${dayTxt} \u2014 scadenza ${p.label}`;
  }
  const warnIcon = p.overdue
    ? `<span class="order-warning"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L22 20 H2 Z M11 10 h2 v5 h-2z M11 16 h2 v2 h-2z"/></svg></span>`
    : "";
  return `
    <div class="order-progress ${stateClass}" style="--pct:${p.pct}">
      <div class="order-progress-meta">
        <span class="order-progress-info">${warnIcon}${info}</span>
        <span class="order-progress-pct">${pctDisplay}%</span>
      </div>
      <div class="order-progress-track"><div class="order-progress-fill" style="width:${pctDisplay}%"></div></div>
    </div>
  `;
}

// ================= RENDER =================
function renderOrders() {
  const container = document.getElementById("ordersList");
  if (!container) return;
  container.innerHTML = "";
  const orders = getOrders();

  orders.forEach((order) => {
    const div = document.createElement("div");
    div.className = "order-card";
    const shortId = String(order.id).slice(0, 8);
    div.dataset.id = order.id;
    div.dataset.company = order.company.toLowerCase();
    div.dataset.destination = order.destination.toLowerCase();
    div.innerHTML = `
      <div class="order-row">
        <div>
          <span class="order-id"><strong>#${shortId}</strong></span> -
          <span class="order-company">${order.company}</span>
          <span class="status-dot status-${order.status}"></span>
        </div>
        <div class="order-destination">${order.destination}</div>
      </div>
      ${progressBarHTML(order)}
    `;
    container.appendChild(div);
    attachOrderDragHandlers(div, order);
  });

  updateStats();
  applyFilter();
}

// ================= DRAG-TO-DELETE =================
function attachOrderDragHandlers(card, order) {
  let startX = 0, startY = 0, startRect = null, ghost = null, dragging = false;
  let pointerIdCaptured = null, suppressClick = false;
  const DRAG_THRESHOLD = 6, PROXIMITY_MAX = 320, PROXIMITY_MIN = 70, DROP_RADIUS = 95, SPHERE_SIZE = 96;

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest(".switch")) return;
    startX = e.clientX; startY = e.clientY;
    startRect = card.getBoundingClientRect();
    pointerIdCaptured = e.pointerId;
    try { card.setPointerCapture(pointerIdCaptured); } catch(_) {}
    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerup", onPointerUp);
    card.addEventListener("pointercancel", onPointerUp);
  }
  function onPointerMove(e) {
    const dx = e.clientX - startX, dy = e.clientY - startY;
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
    try { card.releasePointerCapture(pointerIdCaptured); } catch(_) {}
    if (!dragging) return;
    finishDrag(e.clientX, e.clientY);
  }
  function beginDrag() {
    dragging = true; suppressClick = true;
    ghost = card.cloneNode(true);
    ghost.classList.remove("order-card");
    ghost.classList.add("order-ghost");
    ghost.removeAttribute("data-id");
    ghost.style.setProperty("--morph", "0");
    ghost.style.left = startRect.left + "px";
    ghost.style.top  = startRect.top + "px";
    ghost.style.width = startRect.width + "px";
    ghost.style.height = startRect.height + "px";
    ghost.style.setProperty("--radius", "14px");
    ghost.querySelectorAll("input, button, a").forEach(el => { el.disabled = true; el.tabIndex = -1; });
    document.body.appendChild(ghost);
    card.classList.add("order-source-hidden");
  }
  function updateDrag(px, py) {
    const bin = document.getElementById("trashBin"); if (!bin) return;
    const r = bin.getBoundingClientRect();
    const bx = r.left + r.width / 2, by = r.top + r.height / 2;
    const dist = Math.hypot(px - bx, py - by);
    let morph = 1 - (dist - PROXIMITY_MIN) / (PROXIMITY_MAX - PROXIMITY_MIN);
    morph = Math.max(0, Math.min(1, morph));
    const baseW = startRect.width, baseH = startRect.height;
    const w = baseW + (SPHERE_SIZE - baseW) * morph;
    const h = baseH + (SPHERE_SIZE - baseH) * morph;
    const dx = px - startX, dy = py - startY;
    const origLeft = startRect.left + dx, origTop = startRect.top + dy;
    const centerLeft = px - w / 2, centerTop = py - h / 2;
    const left = origLeft + (centerLeft - origLeft) * morph;
    const top  = origTop  + (centerTop  - origTop ) * morph;
    const radius = 14 + (Math.min(w, h) / 2 - 14) * morph;
    ghost.style.width = w + "px"; ghost.style.height = h + "px";
    ghost.style.left = left + "px"; ghost.style.top = top + "px";
    ghost.style.setProperty("--morph", morph);
    ghost.style.setProperty("--radius", radius + "px");
    if (morph > 0.15) bin.classList.add("open"); else bin.classList.remove("open");
    if (dist < DROP_RADIUS) bin.classList.add("armed"); else bin.classList.remove("armed");
  }
  function finishDrag(px, py) {
    const bin = document.getElementById("trashBin");
    const r = bin.getBoundingClientRect();
    const bx = r.left + r.width / 2, by = r.top + r.height / 2;
    const dist = Math.hypot(px - bx, py - by);
    if (dist < DROP_RADIUS) {
      const gw = ghost.getBoundingClientRect().width, gh = ghost.getBoundingClientRect().height;
      ghost.classList.add("consumed");
      ghost.style.left = (bx - gw / 2) + "px";
      ghost.style.top  = (by - gh / 2) + "px";
      ghost.style.setProperty("--morph", 1);
      const cleanup = () => {
        bin.classList.remove("open", "armed"); bin.classList.add("shut");
        setTimeout(() => bin.classList.remove("shut"), 350);
        if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
        deleteOrder(order.id);
      };
      ghost.addEventListener("transitionend", cleanup, { once: true });
      setTimeout(cleanup, 500);
    } else {
      bin.classList.remove("open", "armed");
      ghost.classList.add("returning");
      ghost.style.setProperty("--morph", 0);
      ghost.style.setProperty("--radius", "14px");
      ghost.style.left = startRect.left + "px";
      ghost.style.top  = startRect.top + "px";
      ghost.style.width = startRect.width + "px";
      ghost.style.height = startRect.height + "px";
      const cleanup = () => {
        if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
        card.classList.remove("order-source-hidden");
      };
      ghost.addEventListener("transitionend", cleanup, { once: true });
      setTimeout(cleanup, 400);
    }
    dragging = false;
  }
  card.addEventListener("pointerdown", onPointerDown);
  card.addEventListener("click", (e) => {
    if (suppressClick) { suppressClick = false; e.stopImmediatePropagation(); return; }
    if (e.target.closest(".switch")) return;
    openOrderDetails(order);
  });
}

// ================= TOAST / SHAKE =================
function triggerShake() {
  const box = document.querySelector(".modal-box");
  if (!box) return;
  box.classList.add("shake");
  setTimeout(() => box.classList.remove("shake"), 350);
}
function showToast(message, duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast"; toast.innerText = message;
  toast.style.opacity = "0";
  toast.style.transform = "translateY(20px) scale(0.95)";
  toast.style.animation = "toastIn 0.3s forwards";
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s forwards";
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}
function showSaveFeedback() {
  const fb = document.getElementById("saveFeedback");
  if (!fb) return;
  fb.classList.remove("show"); void fb.offsetWidth; fb.classList.add("show");
  setTimeout(() => fb.classList.remove("show"), 1800);
}

// ================= ORDER DETAILS =================
let detailSelectedValue = "programmato";
function openOrderDetails(order) {
  document.getElementById("detailId").innerText = order.id;
  document.getElementById("detailCompanyInput").value = order.company;
  document.getElementById("detailDestinationInput").value = order.destination;
  document.getElementById("detailNote").value = order.note || "";
  const dateInput = document.getElementById("detailDeliveryDate");
  if (dateInput) dateInput.value = order.deliveryDate || "";
  detailSelectedValue = order.status;
  const header = document.querySelector("#detailStatusCustom .select-header");
  if (header) {
    if (order.status === "programmato") header.innerText = "Programmato";
    if (order.status === "transito")    header.innerText = "In transito";
    if (order.status === "consegnato")  header.innerText = "Consegnato";
  }
  document.getElementById("orderDetailsModal").classList.add("active");
  document.body.classList.add("modal-open");
  initDetailSelect();
}
function closeOrderDetails() {
  document.getElementById("orderDetailsModal").classList.remove("active");
  document.body.classList.remove("modal-open");
}
function initDetailSelect() {
  const select = document.getElementById("detailStatusCustom");
  if (!select || select.dataset.initialized === "1") return;
  select.dataset.initialized = "1";
  const header = select.querySelector(".select-header");
  header.addEventListener("click", (e) => { e.stopPropagation(); select.classList.toggle("open"); });
  const list = select.querySelector(".select-list");
  list.addEventListener("click", (e) => {
    const opt = e.target.closest("[data-value]");
    if (!opt || !list.contains(opt)) return;
    e.stopPropagation();
    header.innerText = opt.innerText;
    detailSelectedValue = opt.dataset.value;
    select.classList.remove("open");
  });
  document.addEventListener("click", (e) => { if (!select.contains(e.target)) select.classList.remove("open"); });
}

// ================= TABS =================
function switchTab(tabIndex) {
  const pill = document.getElementById("pill");
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  if (pill) pill.style.transform = `translateX(${tabIndex * 100}%)`;
  loginTab.classList.toggle("active", tabIndex === 0);
  registerTab.classList.toggle("active", tabIndex === 1);
  loginForm.classList.toggle("active", tabIndex === 0);
  registerForm.classList.toggle("active", tabIndex === 1);
  setTimeout(() => {
    if (tabIndex === 0) { setupLoginEnterLogic(); document.getElementById("loginEmail")?.focus(); }
    else { setupRegisterEnterLogic(); document.getElementById("regEmail")?.focus(); }
  }, 280);
}
function setupLoginEnterLogic() {
  const email = document.getElementById("loginEmail");
  const password = document.getElementById("loginPass");
  email.onkeypress = (e) => { if (e.key === "Enter") { e.preventDefault(); password.focus(); } };
  password.onkeypress = (e) => { if (e.key === "Enter") { e.preventDefault(); login(); } };
}
function setupRegisterEnterLogic() {
  const email = document.getElementById("regEmail");
  const password = document.getElementById("regPass");
  const company = document.getElementById("regCompany");
  email.onkeypress = (e) => { if (e.key === "Enter") { e.preventDefault(); password.focus(); } };
  password.onkeypress = (e) => { if (e.key === "Enter") { e.preventDefault(); company.focus(); } };
  company.onkeypress = (e) => { if (e.key === "Enter") { e.preventDefault(); doRegister(); } };
}

// ================= STATUS SELECT (create modal) =================
let selectedValue = "programmato";
document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("orderStatusCustom");
  if (!select) return;
  const header = select.querySelector(".select-header");
  const options = select.querySelectorAll(".select-list div");
  header.addEventListener("click", () => select.classList.toggle("open"));
  options.forEach(opt => {
    opt.addEventListener("click", () => {
      header.innerText = opt.innerText;
      selectedValue = opt.dataset.value;
      select.classList.remove("open");
    });
  });
  document.addEventListener("click", (e) => { if (!select.contains(e.target)) select.classList.remove("open"); });
});

// ================= SEARCH =================
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  document.querySelectorAll(".order-card").forEach(card => {
    const text = card.innerText.toLowerCase();
    card.classList.toggle("is-hidden", !text.includes(query));
  });
}

// ================= FILTER =================
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

// ================= DEMO VIDEO =================
const video = document.getElementById("demoVideo");
const container = document.getElementById("demoSection");
if (video) {
  video.addEventListener("click", () => {
    if (video.paused) { video.play(); container.classList.add("playing"); }
    else { video.pause(); container.classList.remove("playing"); }
  });
}
