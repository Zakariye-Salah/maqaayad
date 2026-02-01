// script.js (complete — updated with admin persistence to avoid re-login on page navigation)

const foodData = [
  // Pizzas (sizes + extras)
  {
    id: 1,
    name: "Margherita Pizza",
    category: "pizza",
    image: "img/food/p1.jpg",
    description: "Classic pizza with tomato sauce, mozzarella, and basil",
    sizes: [
      { name: "Small", price: 8.99 },
      { name: "Medium", price: 12.99 },
      { name: "Large", price: 16.99 }
    ],
    extras: [
      { id: 'chips', name: "Chips", price: 2.50 },
      { id: 'soda', name: "Soda", price: 1.50 },
      { id: 'extra_cheese', name: "Extra cheese", price: 1.75 }
    ]
  },
  {
    id: 2,
    name: "Pepperoni Pizza",
    category: "pizza",
    image: "img/category/pizza.jpg",
    description: "Pizza topped with pepperoni and mozzarella cheese",
    sizes: [
      { name: "Small", price: 9.99 },
      { name: "Medium", price: 14.99 },
      { name: "Large", price: 18.99 }
    ],
    extras: [
      { id: 'chips', name: "Chips", price: 2.50 },
      { id: 'soda', name: "Soda", price: 1.50 },
      { id: 'extra_cheese', name: "Extra cheese", price: 1.75 }
    ]
  },

  // Burgers
  { id: 3, name: "Cheeseburger", price: 9.99, category: "burger", image: "img/food/b1.jpg", description: "Juicy beef burger with cheese, lettuce, and tomato", extras: [{ id:'fries', name:'Fries', price:2.5 }, {id:'softdrink', name:'Soft drink', price:1.5}] },
  { id: 4, name: "Chicken Burger", price: 10.99, category: "burger", image: "img/category/burger.jpg", description: "Grilled chicken breast with special sauce", extras: [{ id:'fries', name:'Fries', price:2.5 }] },

  // Sandwiches
  { id: 5, name: "Club Sandwich", price: 8.99, category: "sandwich", image: "img/food/s1.jpg", description: "Triple-decker sandwich with turkey, bacon, and vegetables", extras: [{id:'chips', name:'Chips', price:2.0}] },
  { id: 6, name: "Veggie Sandwich", price: 7.99, category: "sandwich", image: "img/category/sandwich.jpg", description: "Fresh vegetables with hummus and sprouts" },

  // Somali / Traditional (cuntada dalka)
  { id: 7, name: "Canjeero", price: 1.50, category: ["somali","breakfast"], image: "img/food/canjeero.jpg", description: "Somali flatbread — served with honey or stew", extras: [{id:'honey', name:'Honey', price:0.5}] },
  { id: 8, name: "Cambuulo", price: 3.50, category: "somali", image: "img/food/cambuulo.jpg", description: "Sweet beans with butter — traditional Somali dish" },
  { id: 9, name: "Soor", price: 3.00, category: "somali", image: "img/food/soor.jpg", description: "Corn porridge (Soor) — hearty and warming" },
  { id: 12, name: "Oodkac (Sunrise)", price: 4.50, category: ["breakfast","somali"], image: "img/food/oodkac.jpg", description: "Full breakfast to start the day (oodkac)" },

  // Rice dishes
  { id: 10, name: "Bariis (Rice with spices)", price: 6.99, category: ["rice","somali"], image: "img/food/bariis.jpg", description: "Fragrant rice with light spices", extras: [{id:'moos', name:'Moos (banana)', price:0.8}, {id:'salad', name:'Small salad', price:1.5}] },
  { id: 11, name: "Dheylo Dheylo (Rice + Meat)", price: 9.99, category: ["rice","somali"], image: "img/food/dheylo.jpg", description: "Rich rice served with meat and sauce", extras: [{id:'moos', name:'Moos', price:0.8}] },

  // Fruits
  { id: 13, name: "Fruit Plate (seasonal)", price: 3.99, category: "fruits", image: "img/food/fruits.jpg", description: "Mixed seasonal fruits — healthy choice" },
  { id: 14, name: "Moos (Banana)", price: 0.80, category: "fruits", image: "img/food/banana.jpg", description: "Fresh banana (Moos)" },

  // Juice
  { id: 15, name: "Mango Juice", price: 2.50, category: "juice", image: "img/food/mango_juice.jpg", description: "Fresh mango juice" },
  { id: 16, name: "Orange Juice", price: 2.00, category: "juice", image: "img/food/orange_juice.jpg", description: "Fresh orange juice" },
  { id: 17, name: "Lemon Juice", price: 1.80, category: "juice", image: "img/food/lemon_juice.jpg", description: "Refreshing lemon juice" },

  // Extras / sides
  { id: 18, name: "Chips (Fries)", price: 2.50, category: "extras", image: "img/food/chips.jpg", description: "Crispy fries" },
  { id: 19, name: "Salad (Side)", price: 2.00, category: "extras", image: "img/food/salad.jpg", description: "Fresh salad side" },

  // More mains
  { id: 20, name: "Grilled Chicken Plate", price: 11.50, category: ["rice","main"], image: "img/food/grilled_chicken.jpg", description: "Grilled chicken served with side rice or salad", extras: [{id:'moos', name:'Moos', price:0.8}] },
  { id: 21, name: "Vegetable Stew", price: 5.50, category: ["main","somali"], image: "img/food/veg_stew.jpg", description: "Slow-cooked vegetable stew" }
];
// ----- end foodData -----

  
  // --- UI elements / state ---
  let cart = [];
  const cartLink = document.getElementById('cartLink');
  const cartModal = document.getElementById('cartModal');
  const closeCartBtn = document.getElementById('closeCart');
  const cartItems = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const cartCount = document.querySelector('.cart-count');
  const featuredFoods = document.getElementById('featuredFoods');
  const checkoutBtn = document.getElementById('checkoutBtn');
  
  // Order bell indicator (ensure exists)
  function ensureOrderBell() {
    let bell = document.getElementById('orderBell');
    if (!bell) {
      const nav = document.querySelector('nav .nav-links');
      if (nav) {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#" id="orderBell"><i class="fa fa-bell"></i> <span id="orderBellCount" class="cart-count">0</span></a>`;
        nav.appendChild(li);
      }
    }
  }
  ensureOrderBell();
  
  // visitor identity
  let visitorId = localStorage.getItem('visitorId');
  let visitorName = localStorage.getItem('visitorName') || "";
  if (!visitorId) {
    visitorId = 'visitor_' + Date.now() + '_' + Math.floor(Math.random()*9000+1000);
    localStorage.setItem('visitorId', visitorId);
  }
  



  /* -------------------
  Visitor order sync:
  - keeps localStorage.orders in sync when server/admin changes an order
  - tries multiple FirebaseDB hooks and falls back to polling
  Paste this after tryRehydrateAdminFromLocal() or inside DOMContentLoaded.
---------------------*/

let __visitorOrdersUnsub = null;   // unsubscribe function if provided by FirebaseDB
let __visitorOrdersPollId = null;  // poll interval id

function startVisitorOrderListener() {
  // stop previous
  try { if (typeof __visitorOrdersUnsub === 'function') __visitorOrdersUnsub(); } catch(e){}
  if (__visitorOrdersPollId) { clearInterval(__visitorOrdersPollId); __visitorOrdersPollId = null; }

  // Helper: merge remote order into localStorage orders
  function mergeRemoteIntoLocal(remote) {
    if (!remote) return;
    try {
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      // find match by remote id (remote.id) or remote.localId or by matching remoteId stored locally
      const idx = localOrders.findIndex(lo => {
        // prefer exact remote id matching if present
        if (remote.id && (String(lo.remoteId || lo.id || '') === String(remote.id) || String(lo.id || '') === String(remote.id))) return true;
        // if remote carries localId (if you pass localId when saving on server)
        if (remote.localId && String(lo.localId || '') === String(remote.localId)) return true;
        // also match if local order had remoteId already
        if (lo.remoteId && remote.id && String(lo.remoteId) === String(remote.id)) return true;
        return false;
      });

      if (idx !== -1) {
        const existing = localOrders[idx];
        // merge relevant fields (status, paymentStatus, maybe total or note)
        const updated = {
          ...existing,
          status: (remote.status !== undefined ? remote.status : existing.status),
          paymentStatus: (remote.paymentStatus !== undefined ? remote.paymentStatus : existing.paymentStatus),
          remoteId: (remote.id || existing.remoteId || existing.remoteId),
          // optionally merge any server-corrected timestamps or totals
          total: (remote.total !== undefined ? remote.total : existing.total),
          timestamp: (remote.timestamp !== undefined ? remote.timestamp : existing.timestamp),
        };
        // replace and persist
        localOrders[idx] = updated;
        localStorage.setItem('orders', JSON.stringify(localOrders));
        // update UI if order history open
        refreshVisitorOrderHistoryUI();
        refreshOrderBell();
      } else {
        // not found locally: optionally insert the remote order for completeness (commented out)
        // localOrders.unshift(remote);
        // localStorage.setItem('orders', JSON.stringify(localOrders));
      }
    } catch (err) {
      console.warn('mergeRemoteIntoLocal error', err);
    }
  }

  // If your FirebaseDB exposes a single-order snapshot listener, use it:
  if (window.FirebaseDB && typeof window.FirebaseDB.onOrderSnapshot === 'function') {
    try {
      __visitorOrdersUnsub = window.FirebaseDB.onOrderSnapshot(visitorId, (orderOrList) => {
        // some implementations may return a single order or list
        if (!orderOrList) return;
        if (Array.isArray(orderOrList)) {
          orderOrList.forEach(o => mergeRemoteIntoLocal(o));
        } else {
          mergeRemoteIntoLocal(orderOrList);
        }
      });
      console.log('visitor order listener attached: onOrderSnapshot');
      return;
    } catch (err) { console.warn('onOrderSnapshot attach failed', err); }
  }

  // If only a global orders snapshot exists, use it and filter by visitorId
  if (window.FirebaseDB && typeof window.FirebaseDB.onOrdersSnapshot === 'function') {
    try {
      __visitorOrdersUnsub = window.FirebaseDB.onOrdersSnapshot((orders) => {
        if (!orders || !orders.length) return;
        orders.forEach(o => {
          if (!o) return;
          // the server order should have visitorId — match and merge if it matches this visitor
          if (String(o.visitorId || '') === String(visitorId) || (o.localId && localStorageHasLocalId(o.localId))) {
            mergeRemoteIntoLocal(o);
          }
        });
      });
      console.log('visitor order listener attached: onOrdersSnapshot (filtered locally)');
      return;
    } catch (err) { console.warn('onOrdersSnapshot attach failed', err); }
  }

  // Fallback polling: call getOrdersForVisitor periodically (if available), or listAllOrders and filter
  const pollFn = async () => {
    try {
      if (window.FirebaseDB && typeof window.FirebaseDB.getOrdersForVisitor === 'function') {
        const res = await window.FirebaseDB.getOrdersForVisitor(visitorId);
        if (res && res.success && Array.isArray(res.orders)) {
          res.orders.forEach(o => mergeRemoteIntoLocal(o));
        }
      } else if (window.FirebaseDB && typeof window.FirebaseDB.listAllOrders === 'function') {
        // last-resort: fetch everything and filter by visitorId (inefficient but works)
        const res = await window.FirebaseDB.listAllOrders();
        if (res && res.success && Array.isArray(res.orders)) {
          res.orders.forEach(o => {
            if (String(o.visitorId || '') === String(visitorId) || (o.localId && localStorageHasLocalId(o.localId))) mergeRemoteIntoLocal(o);
          });
        }
      }
    } catch (err) { /* ignore but log */ console.warn('visitor poll error', err); }
  };

  // start initial poll and then repeat every 7–10 seconds
  pollFn();
  __visitorOrdersPollId = setInterval(pollFn, 8000);
  console.log('visitor order polling started (fallback)');
}

// small helper to check if localStorage orders contains a localId
function localStorageHasLocalId(localId) {
  try {
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    return localOrders.some(lo => String(lo.localId || '') === String(localId));
  } catch (e) { return false; }
}

// Refresh visitor order-history UI if open (rebuilds history modal contents)
function refreshVisitorOrderHistoryUI() {
  try {
    const historyModal = document.getElementById('historyModal');
    const historyList = document.getElementById('historyList');
    if (!historyModal || !historyList) return;
    // only update if visible
    if (historyModal.style.display !== 'flex' && historyModal.style.display !== 'block') {
      // still update bell counts and local in-memory state
      return;
    }
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    if (!localOrders || localOrders.length === 0) {
      historyList.innerHTML = '<p>No local orders yet.</p>';
      return;
    }
    let html = '';
    localOrders.forEach(o => { html += renderOrderCard(o); });
    historyList.innerHTML = html;
  } catch (err) { console.warn('refreshVisitorOrderHistoryUI error', err); }
}

// Start listening automatically when the page is ready
document.addEventListener('DOMContentLoaded', function() {
  // if visitorId exists, attach listener
  if (typeof visitorId !== 'undefined' && visitorId) startVisitorOrderListener();
});

// Also expose a stop function if you need it
function stopVisitorOrderListener() {
  try { if (typeof __visitorOrdersUnsub === 'function') __visitorOrdersUnsub(); } catch(e){}
  if (__visitorOrdersPollId) { clearInterval(__visitorOrdersPollId); __visitorOrdersPollId = null; }
}

  // admin state
  let isAdminSignedIn = false;
  let currentAdminDoc = null; // admin Firestore doc
  
// ----------------------
// Simplified: ensure single admin link + single bell (no duplicates)
// ----------------------

function forceHideAdminBellInMobileDropdown() {
  document.querySelectorAll('#orderBell, #orderBellLi').forEach(el => {
    el.style.display = 'none';
  });
}

/* header_mobile_admin_controls - plain JS (paste into script.js after your auth helpers) */

/* ensure global admin state vars exist (used by other code) */
window.isAdminSignedIn = window.isAdminSignedIn || false;
window.currentAdminDoc = window.currentAdminDoc || null;

/* ------------------ Helpers: tag desktop li's to hide on mobile ------------------ */
function tagDesktopCartOrders() {
  try {
    const cartAnchor = document.getElementById('cartLink');
    if (cartAnchor) {
      const li = cartAnchor.closest('li');
      if (li) li.classList.add('hide-on-mobile');
    }
    const ordersAnchor = document.getElementById('orderHistoryLink');
    if (ordersAnchor) {
      const li2 = ordersAnchor.closest('li');
      if (li2) li2.classList.add('hide-on-mobile');
    }

    // hide the admin BELL list item from the mobile dropdown (but NOT the adminLink)
    const orderBellLi = document.getElementById('orderBellLi');
    if (orderBellLi) orderBellLi.classList.add('hide-on-mobile');

    // defensive: hide duplicates
    const duplicates = document.querySelectorAll('nav .nav-links [id="cartLink"], nav .nav-links [id="orderHistoryLink"]');
    duplicates.forEach(n => {
      const li = n.closest('li');
      if (li) li.classList.add('hide-on-mobile');
    });
  } catch (e) { console.warn('tagDesktopCartOrders failed', e); }
}

/* ------------------ Admin DOM controls (singleton-safe) ------------------ */


/* ------------------ Mobile header admin bell + counts ------------------ */
function updateMobileIconsAdminBell() {
  const container = document.getElementById('mobileIcons');
  if (!container) return;

  let btn = document.getElementById('mobileAdminBellBtn');

  if (window.isAdminSignedIn) {
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'mobileAdminBellBtn';
      btn.type = 'button';
      btn.className = 'icon-btn admin-bell';
      btn.setAttribute('aria-label', 'Admin orders');
      btn.title = 'Admin orders';
      btn.innerHTML = `🔔<span id="mobileAdminBellCount" class="count-badge" style="display:none">0</span>`;

      // append after cart button if exists
      const cartBtn = container.querySelector('#mobileCartBtn');
      if (cartBtn && cartBtn.parentNode === container) container.insertBefore(btn, cartBtn.nextSibling);
      else container.appendChild(btn);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.isAdminSignedIn) window.location.href = 'admin.html';
        else if (typeof openAdminLoginModal === 'function') openAdminLoginModal();
      });
    }
  } else {
    if (btn) btn.remove();
  }
}

function updateMobileHeaderCounts() {
  // cart count
  try {
    const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
    const total = Array.isArray(cartItems) ? cartItems.reduce((s,i)=> s + (i.quantity || 0), 0) : 0;
    const cartEl = document.getElementById('mobileCartCount');
    if (cartEl) {
      if (total > 0) { cartEl.style.display = 'inline-block'; cartEl.textContent = total; }
      else cartEl.style.display = 'none';
    }
    document.querySelectorAll('.cart-count').forEach(el => { el.textContent = total; });
  } catch(e){ /* ignore */ }

  // orders pending
  let pending = 0;
  try {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    pending = Array.isArray(orders) ? orders.filter(o => (o.status || o.paymentStatus || 'pending') === 'pending').length : 0;
    const orderEl = document.getElementById('mobileOrderCount');
    if (orderEl) {
      if (pending > 0) { orderEl.style.display = 'inline-block'; orderEl.textContent = pending; }
      else orderEl.style.display = 'none';
    }
    // sync desktop bell
    const bellCount = document.getElementById('orderBellCount');
    if (bellCount) bellCount.textContent = pending;
  } catch(e){ /* ignore */ }

  // mobile admin bell badge
  try {
    const mobileAdminBell = document.getElementById('mobileAdminBellCount');
    if (mobileAdminBell) {
      if (pending > 0) { mobileAdminBell.style.display = 'inline-block'; mobileAdminBell.textContent = pending; }
      else mobileAdminBell.style.display = 'none';
    }
  } catch(e){}

  // keep original desktop bell sync alive if available
  try { if (typeof refreshOrderBell === 'function') refreshOrderBell(); } catch(e){}
}

/* expose for other modules to call manually if needed */
window.updateMobileHeaderCounts = updateMobileHeaderCounts;
window.updateMobileIconsAdminBell = updateMobileIconsAdminBell;

/* ------------------ Admin state toggler (singleton-safe) ------------------ */
function setAdminSignedIn(adminDoc) {
  // set global flags
  window.isAdminSignedIn = !!adminDoc;
  window.currentAdminDoc = adminDoc || null;

  // query UI elements (some may be created elsewhere)
  const adminLi = document.getElementById('adminLi') || document.getElementById('adminLink')?.closest('li');
  const adminLink = document.getElementById('adminLink');
  const orderBellLi = document.getElementById('orderBellLi');
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const profileLink = document.getElementById('profileLink');

  try {
    if (window.isAdminSignedIn) {
      // 1) Show Dashboard (NO name, NO avatar)
      if (adminLi) adminLi.style.display = 'inline-block';
      if (adminLink) {
        adminLink.style.display = 'inline-block';
        // plain Dashboard text only
        adminLink.innerHTML = `Dashboard`;
        // always navigate straight to admin.html
        adminLink.href = 'admin.html';
        adminLink.onclick = function(e){ /* allow normal navigation */ };
      }

      // 2) Show desktop bell
      if (orderBellLi) orderBellLi.style.display = 'inline-block';

      // 3) Hide the Admin Login button (we don't want it visible while signed in)
      if (adminLoginBtn) adminLoginBtn.style.display = 'none';

      // 4) Show a visible Logout button for the admin — we reuse profileLink element
      if (profileLink) {
        const profileLi = profileLink.closest('li');
        if (profileLi) profileLi.style.display = 'inline-block';
        profileLink.textContent = 'Logout';
        // clicking Logout uses adminSignOutUI if available, otherwise clears local state
        profileLink.onclick = async function(e){
          e.preventDefault();
          // optional confirm
          if (!confirm('Logout from admin?')) return;
          if (typeof adminSignOutUI === 'function') {
            try {
              // adminSignOutUI should handle remote signout; if not available fallback below
              await adminSignOutUI();
            } catch(err){
              // fallback: clear UI
              setAdminSignedIn(null);
            }
          } else {
            setAdminSignedIn(null);
          }
        };
      }

      // 5) Persist admin session to localStorage
      try {
        localStorage.setItem('adminSigned', '1');
        localStorage.setItem('adminDoc', JSON.stringify(adminDoc || {}));
      } catch (err) { console.warn('persist adminDoc failed', err); }

    } else {
      // SIGNED OUT: show Admin Login + visitor Login

      // 1) Hide Dashboard and bell
      if (adminLi) adminLi.style.display = 'none';
      if (adminLink) adminLink.style.display = 'none';
      if (orderBellLi) orderBellLi.style.display = 'none';

      // 2) Show Admin Login button (if exists), wired to openAdminLoginModal
      if (adminLoginBtn) {
        adminLoginBtn.style.display = 'inline-block';
        adminLoginBtn.textContent = 'Admin Login';
        adminLoginBtn.onclick = function(e){
          e.preventDefault();
          if (typeof openAdminLoginModal === 'function') openAdminLoginModal();
        };
      } else {
        // defensive: if adminLoginBtn missing, create a minimal one appended to nav
        try {
          const nav = document.querySelector('nav .nav-links');
          if (nav && !document.getElementById('adminLoginBtn')) {
            const li = document.createElement('li');
            li.id = 'adminLoginBtnLi';
            li.innerHTML = `<a href="#" id="adminLoginBtn">Admin Login</a>`;
            nav.appendChild(li);
            const btn = document.getElementById('adminLoginBtn');
            if (btn) btn.addEventListener('click', (ev)=>{ ev.preventDefault(); if (typeof openAdminLoginModal === 'function') openAdminLoginModal(); });
          }
        } catch(e){}
      }

      // 3) Show visitor Login (profileLink) — restore visitor name if present
      if (profileLink) {
        const profileLi = profileLink.closest('li');
        if (profileLi) profileLi.style.display = 'inline-block';
        const name = localStorage.getItem('visitorName') || 'Login';
        profileLink.textContent = name;
        profileLink.onclick = function(e){
          e.preventDefault();
          if (typeof openLoginModal === 'function') openLoginModal();
        };
      } else {
        // defensive: create profileLink if missing
        try {
          const nav = document.querySelector('nav .nav-links');
          if (nav && !document.getElementById('profileLink')) {
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" id="profileLink">${localStorage.getItem('visitorName') || 'Login'}</a>`;
            nav.appendChild(li);
            const p = document.getElementById('profileLink');
            if (p) p.addEventListener('click', (ev)=>{ ev.preventDefault(); if (typeof openLoginModal === 'function') openLoginModal(); });
          }
        } catch(e){}
      }

      // 4) Remove persisted admin info
      try {
        localStorage.removeItem('adminSigned');
        localStorage.removeItem('adminDoc');
      } catch(err){ console.warn('remove admin persistence failed', err); }
    }
  } catch (err) {
    console.warn('setAdminSignedIn error', err);
  } finally {
    // keep mobile & header badges in sync with current admin state
    try { if (typeof updateMobileIconsAdminBell === 'function') updateMobileIconsAdminBell(); } catch(e){}
    try { if (typeof updateMobileHeaderCounts === 'function') updateMobileHeaderCounts(); } catch(e){}
    try { if (typeof refreshOrderBell === 'function') refreshOrderBell(); } catch(e){}
  }
}


/* ------------------ Mobile icons bootstrap (self-contained) ------------------ */
(function(){
  const MOBILE_ICONS_ID = 'mobileIcons';
  const ORDER_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M3 6h18v2H3zM5 10h14v2H5zM7 14h10v2H7z" fill="currentColor"/></svg>';
  const CART_SVG  = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M7 4h-2l-1 2h2l2 9h9l1-5H9.5" fill="currentColor"/><circle cx="10" cy="20" r="1.5" fill="currentColor"/><circle cx="18" cy="20" r="1.5" fill="currentColor"/></svg>';

  function ensureMobileIconsContainer() {
    let container = document.getElementById(MOBILE_ICONS_ID);
    if (!container) {
      const headerContainer = document.querySelector('header .container') || document.body;
      container = document.createElement('div');
      container.id = MOBILE_ICONS_ID;
      container.className = 'mobile-icons';
      headerContainer.insertBefore(container, headerContainer.querySelector('nav'));
    }
    return container;
  }

  function initMobileButtons() {
    const container = ensureMobileIconsContainer();
    if (container.dataset.initted) return;
    container.dataset.initted = '1';

    const orderBtn = document.createElement('button');
    orderBtn.type = 'button'; orderBtn.id = 'mobileOrderBtn'; orderBtn.className = 'icon-btn order-icon';
    orderBtn.setAttribute('aria-label','Orders');
    orderBtn.innerHTML = ORDER_SVG + '<span id="mobileOrderCount" class="count-badge" style="display:none">0</span>';

    const cartBtn = document.createElement('button');
    cartBtn.type = 'button'; cartBtn.id = 'mobileCartBtn'; cartBtn.className = 'icon-btn cart-icon';
    cartBtn.setAttribute('aria-label','Cart');
    cartBtn.innerHTML = CART_SVG + '<span id="mobileCartCount" class="count-badge" style="display:none">0</span>';

    container.appendChild(orderBtn);
    container.appendChild(cartBtn);

    orderBtn.addEventListener('click', function(e){ e.preventDefault(); if (typeof openOrderHistory === 'function') return openOrderHistory(); const a = document.getElementById('orderHistoryLink'); if (a) a.click(); });
    cartBtn.addEventListener('click', function(e){ e.preventDefault(); if (typeof openCart === 'function') return openCart(); if (typeof checkout === 'function') return checkout(); const a = document.getElementById('cartLink'); if (a) a.click(); });

    [orderBtn, cartBtn].forEach(btn => {
      btn.addEventListener('keydown', function(ev){ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); btn.click(); } });
    });

    // Tag desktop nav items so CSS hides them in mobile dropdown
    tagDesktopCartOrders();

    // initial counts
    try { updateMobileHeaderCounts(); } catch(e){}
  }

  // storage observer to keep counts fresh across tabs
  window.addEventListener('storage', function(e){
    if (!e.key) { try{ updateMobileHeaderCounts(); }catch(e){}; return; }
    if (e.key === 'cart' || e.key === 'orders') { try{ updateMobileHeaderCounts(); }catch(e){} }
  });

  // polling fallback
  let _lastCartSnapshot = '';
  setInterval(function(){ try { const snapshot = localStorage.getItem('cart') + '|' + localStorage.getItem('orders'); if (snapshot !== _lastCartSnapshot) { _lastCartSnapshot = snapshot; updateMobileHeaderCounts(); } } catch(e){} }, 1000);

  // Boot
  document.addEventListener('DOMContentLoaded', function(){
    try { if (typeof loadCartFromLocalStorage === 'function') loadCartFromLocalStorage(); } catch(e){}
    initMobileButtons();
    // ensure admin controls exist inside nav
    try { updateMobileHeaderCounts(); } catch(e){}
    // ensure mobile admin bell matches admin state
    try { updateMobileIconsAdminBell(); } catch(e){}
    // short delayed update to catch late changes
    setTimeout(function(){ try{ updateMobileHeaderCounts(); }catch(e){} }, 400);
  });

})();


  // setup header handlers (call once)
function setupHeaderUI() {
  const orderHistoryLink = document.getElementById('orderHistoryLink');
  if (orderHistoryLink) orderHistoryLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof openOrderHistory === 'function') openOrderHistory();
  });

  // Ensure profileLink shows visitor name (if present) but clicking it opens visitor login modal
  try {
    const profileLink = document.getElementById('profileLink');
    if (profileLink) {
      profileLink.textContent = visitorName || localStorage.getItem('visitorName') || 'Login';
      profileLink.onclick = function(e) {
        e.preventDefault();
        if (typeof openLoginModal === 'function') openLoginModal();
      };
    }
  } catch(e){ /* ignore */ }

  // Admin link: ALWAYS go to admin.html (no checks, no modal)
  const adminLink = document.getElementById('adminLink');
  if (adminLink) {
    // ensure href present and remove any logic-based handlers
    adminLink.href = 'admin.html';
    adminLink.onclick = function(e){
      // allow normal navigation to admin.html
      // using location.href to ensure cross-page navigation works reliably
      e.preventDefault();
      window.location.href = 'admin.html';
    };
  } else {
    // Defensive: create a minimal adminLink if missing
    try {
      const nav = document.querySelector('nav .nav-links');
      if (nav && !document.getElementById('adminLink')) {
        const li = document.createElement('li');
        li.id = 'adminLi';
        li.innerHTML = `<a href="admin.html" id="adminLink">Dashboard</a>`;
        nav.appendChild(li);
        document.getElementById('adminLink').addEventListener('click', function(e){ e.preventDefault(); window.location.href = 'admin.html'; });
      }
    } catch(e){}
  }

  // Desktop bell: also always go to admin.html (no checks)
  const orderBell = document.getElementById('orderBell');
  if (orderBell) {
    orderBell.onclick = function(e) {
      e.preventDefault();
      window.location.href = 'admin.html';
    };
  }
}

    // Attempt to rehydrate admin state from localStorage right away (fast UX)// Relaxed rehydrate: use stored adminDoc if adminSigned === '1'

    function tryRehydrateAdminFromLocal() {
      try {
        // run synchronously if possible so header click handlers see persisted state quickly
        const signed = localStorage.getItem('adminSigned');
        const doc = localStorage.getItem('adminDoc');
        if (signed === '1' && doc) {
          const adm = JSON.parse(doc || '{}');
          setAdminSignedIn(adm);
        }
      } catch (e) {
        console.warn('rehydrate admin failed', e);
      }
    }
    
  tryRehydrateAdminFromLocal();
  
  // SINGLE auth-state listener using database.js helper
  if (window.FirebaseDB && typeof window.FirebaseDB.onAuthStateChange === 'function') {
    window.FirebaseDB.onAuthStateChange((user) => {
      // user is null OR { uid, email, adminDoc }
      if (!user) {
        // no signed-in firebase user -> clear admin UI
        setAdminSignedIn(null);
      } else {
        // if DB reports adminDoc for this user, use it; otherwise still try local cache
        if (user.adminDoc) setAdminSignedIn(user.adminDoc);
        else {
          // fallback: check local cache and use it if email matches (fast)
          try {
            const localDoc = JSON.parse(localStorage.getItem('adminDoc') || '{}');
            if (localDoc && localDoc.email && localDoc.email === user.email) {
              setAdminSignedIn(localDoc);
            } else {
              setAdminSignedIn(null);
            }
          } catch (e) {
            setAdminSignedIn(null);
          }
        }
      }
      // refresh bell counts
      refreshOrderBell();
    });
  } else {
    // DB isn't ready — ensure admin UI hidden (unless local rehydrate already showed it)
    // keep the rehydrated UI if available, otherwise hide:
    if (!localStorage.getItem('adminSigned')) setAdminSignedIn(null);
    refreshOrderBell();
  }
  
  // Admin login modal (no auto-redirect after sign-in)
  function openAdminLoginModal() {
    // ensure setButtonLoading exists (no-op fallback)
    if (typeof setButtonLoading !== 'function') {
      window.setButtonLoading = function(btn, isLoading, label) {
        if (!btn) return;
        if (isLoading) {
          if (btn.dataset._origHtml === undefined) btn.dataset._origHtml = btn.innerHTML;
          btn.disabled = true;
          btn.classList.add('btn-loading');
          btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${label || 'Processing...'}`;
        } else {
          btn.classList.remove('btn-loading');
          btn.disabled = false;
          if (btn.dataset._origHtml !== undefined) { btn.innerHTML = btn.dataset._origHtml; delete btn.dataset._origHtml; }
        }
      };
    }
  
    let modal = document.getElementById('adminLoginModal');
  
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'adminLoginModal';
      modal.className = 'cart-modal';
      modal.innerHTML = `
        <div class="cart-content" role="dialog" aria-modal="true" aria-labelledby="adminLoginTitle">
          <div class="cart-header">
            <h2 id="adminLoginTitle">Admin Login</h2>
            <button class="close-btn" id="closeAdminLogin" aria-label="Close">&times;</button>
          </div>
          <div class="cart-body">
            <form id="adminLoginForm" autocomplete="on" novalidate>
              <div class="form-row">
                <label for="adminEmail">Email</label>
                <input id="adminEmail" name="adminEmail" type="email" required autocomplete="email" placeholder="admin@restaurant.com" />
              </div>
  
              <div class="form-row">
                <label for="adminPassword">Password</label>
                <div class="input-group">
                  <input id="adminPassword" name="adminPassword" type="password" required autocomplete="current-password" placeholder="Password" />
                  <button type="button" class="pw-toggle" id="adminPwToggle" aria-pressed="false" aria-label="Show password">
                    <i class="fa fa-eye" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
  
              <div style="text-align:center; margin-top:12px;">
                <button class="btn-primary" type="submit" id="adminSignBtn">Sign In</button>
              </div>
  
              <p class="hint" style="margin-top:12px;">Use a Firebase Auth user that is also added in the <code>admins</code> collection.</p>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
  
    // show modal
    modal.style.display = 'flex';
  
    // DOM refs
    const closeBtn = modal.querySelector('#closeAdminLogin');
    const form = modal.querySelector('#adminLoginForm');
    const emailInput = modal.querySelector('#adminEmail');
    const passInput = modal.querySelector('#adminPassword');
    const pwToggle = modal.querySelector('#adminPwToggle');
    const submitBtn = modal.querySelector('#adminSignBtn');
  
    // close handlers (idempotent)
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
  
    // escape handler (ensure single listener)
    const escHandler = (e) => { if (e.key === 'Escape') modal.style.display = 'none'; };
    document.removeEventListener('keydown', escHandler);
    document.addEventListener('keydown', escHandler);
  
    // password toggle logic
    if (pwToggle) {
      pwToggle.setAttribute('aria-pressed', 'false');
      const icon = pwToggle.querySelector('i');
      if (icon) icon.className = 'fa fa-eye'; // eye shown when hidden
  
      pwToggle.onclick = () => {
        const currentlyHidden = passInput.getAttribute('type') === 'password';
        // toggle type but do not touch classes or styles
        passInput.setAttribute('type', currentlyHidden ? 'text' : 'password');
  
        // update icon: eye -> password hidden; eye-slash -> visible (so user can hide)
        if (icon) icon.className = currentlyHidden ? 'fa fa-eye-slash' : 'fa fa-eye';
        pwToggle.setAttribute('aria-pressed', String(currentlyHidden));
  
        // keep focus and caret at end
        passInput.focus();
        try { const len = passInput.value.length; passInput.setSelectionRange(len, len); } catch(e){/*ignore*/ }
      };
    }
  
    // form submit handler (idempotent)
    form.onsubmit = async function(e) {
      e.preventDefault();
  
      const email = (emailInput.value || '').trim();
      const password = (passInput.value || '').trim();
      if (!email || !password) {
        showToast && showToast('Enter email and password');
        return;
      }
  
      setButtonLoading(submitBtn, true, 'Signing in...');
  
      try {
        if (!window.FirebaseDB || typeof window.FirebaseDB.adminSignIn !== 'function') {
          showToast && showToast('Auth not available. Make sure database.js is loaded.');
          return;
        }
  
        const res = await window.FirebaseDB.adminSignIn(email, password);
  
        if (!res || !res.success) {
          if (res && res.error === 'not-an-admin') {
            showToast && showToast('This account is not registered as an admin.');
          } else {
            const msg = (res && res.error && (res.error.message || res.error)) || 'Sign-in failed';
            showToast && showToast(msg);
          }
          return;
        }
  
        // success
        modal.style.display = 'none';
        try { setAdminSignedIn(res.adminDoc || {}); } catch(err) { console.warn('setAdminSignedIn failed', err); }
        showToast && showToast('Signed in as admin');
  
        try { window.location.href = 'admin.html'; } catch(e){ /* ignore */ }
      } catch (err) {
        console.error('admin sign-in error', err);
        const friendly = (err && err.message) ? err.message : 'Sign-in failed. Try again.';
        showToast && showToast(friendly);
      } finally {
        setButtonLoading(submitBtn, false);
      }
    };
  
    // autofocus email
    setTimeout(() => { if (emailInput) emailInput.focus(); }, 120);
  }
  
  
  // Admin logout function (UI)
  async function adminSignOutUI() {
    // try remote signout if available
    if (window.FirebaseDB && typeof window.FirebaseDB.adminSignOut === 'function') {
      try {
        const res = await window.FirebaseDB.adminSignOut();
        // we don't require success — we'll clear UI regardless to avoid stuck state
      } catch (e) { /* ignore */ }
    }
  
    // clear UI and local persistence
    setAdminSignedIn(null);
  
    // ensure bell + mobile admin removed and counts reset
    try {
      const bellCount = document.getElementById('orderBellCount');
      if (bellCount) bellCount.textContent = '0';
      const orderBellLi = document.getElementById('orderBellLi');
      if (orderBellLi) orderBellLi.style.display = 'none';
      const mobileBell = document.getElementById('mobileAdminBellBtn');
      if (mobileBell) mobileBell.remove();
      const mobileDash = document.getElementById('mobileAdminDashBtn');
      if (mobileDash) mobileDash.remove();
    } catch(e){}
  
    showToast('Signed out');
  }
  
  
  function removeOrderFromLocalStorage(orderId) {
    try {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      const filtered = orders.filter(o => o.id !== orderId);
      localStorage.setItem('orders', JSON.stringify(filtered));
    } catch (e) {}
  }
  
  function addOrderHistoryNav() {
    const nav = document.querySelector('nav .nav-links');
    if (nav && !document.getElementById('orderHistoryLink')) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#" id="orderHistoryLink">Orders</a>`;
      nav.appendChild(li);
      document.getElementById('orderHistoryLink').addEventListener('click', function(e){
        e.preventDefault();
        openOrderHistory();
      });
    
      // Also add a Login/Profile link
      const li2 = document.createElement('li');
      li2.innerHTML = `<a href="#" id="profileLink">${visitorName ? visitorName : 'Login'}</a>`;
      nav.appendChild(li2);
      document.getElementById('profileLink').addEventListener('click', function(e){
        e.preventDefault();
        openLoginModal();
      });
    }
    }


  // --- rest of your existing UI logic (cart, checkout, order history, etc.) ---
  // For brevity I keep the same implementations you had but ensure refreshOrderBell is used to update bell count.
  
  function openFoodOptionsModal(foodId) {
    const food = foodData.find(f => f.id === foodId);
    if (!food) return;
  
    // create modal container if missing
    let modal = document.getElementById('foodOptionsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'foodOptionsModal';
      modal.className = 'cart-modal';
      // basic modal wrapper style (flex center)
      modal.style.display = 'none';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      document.body.appendChild(modal);
    }
  
    // build sizes html
    let sizesHtml = '';
    if (food.sizes && food.sizes.length > 0) {
      sizesHtml += '<div style="margin-bottom:12px;"><label style="font-weight:600;">Size</label><br>';
      food.sizes.forEach((s, idx) => {
        const checked = idx === 0 ? 'checked' : '';
        sizesHtml += `<label style="margin-right:10px; display:inline-block; margin-top:8px;"><input type="radio" name="foodSize" value="${idx}" ${checked}/> ${s.name} (${formatMoney(s.price)})</label>`;
      });
      sizesHtml += '</div>';
    }
  
    // build extras html
    let extrasHtml = '';
    if (food.extras && food.extras.length > 0) {
      extrasHtml += '<div style="margin-bottom:12px;"><label style="font-weight:600;">Extras (optional)</label><br>';
      food.extras.forEach(e => {
        extrasHtml += `<label style="display:block; margin:6px 0;"><input type="checkbox" name="foodExtra" value="${e.id}" data-price="${e.price}"/> ${e.name} (+${formatMoney(e.price)})</label>`;
      });
      extrasHtml += '</div>';
    }
  
    // modal inner markup: image at top, then content beneath (single column)
    modal.innerHTML = `
      <div class="cart-content" style="width:92%; max-width:520px; border-radius:12px; overflow:hidden;">
        <div class="cart-header" style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid #eef1f6;">
          <h2 style="margin:0; font-size:18px;">${food.name}</h2>
          <button class="close-btn" id="closeFoodOptions" aria-label="Close" style="background:none; border:none; font-size:22px; cursor:pointer;">&times;</button>
        </div>
  
        <div class="cart-body" style="padding:18px; display:block; gap:12px;">
          <img class="food-modal-image" src="${food.image}" alt="${food.name}" style="width:100%; height:220px; object-fit:cover; display:block; border-radius:8px; margin-bottom:12px;" />
          <p style="margin:0 0 12px 0; color:#333;">${food.description || ''}</p>
  
          ${sizesHtml}
          ${extrasHtml}
  
          <div style="margin-bottom:12px;">
            <label style="font-weight:600;">Quantity</label><br>
            <input id="optQuantity" type="number" min="1" value="1" style="width:84px; padding:8px; border-radius:6px; border:1px solid #ddd; margin-top:8px;" />
          </div>
  
          <div id="optionsTotal" style="font-weight:700; font-size:16px; text-align:right; margin-bottom:12px;"></div>
  
          <div style="text-align:center; margin-top:8px;">
            <button id="confirmAddToCart" class="btn-primary" style="padding:10px 18px; border-radius:8px;">Add to Cart</button>
          </div>
        </div>
      </div>
    `;
  
    // show modal
    modal.style.display = 'flex';
  
    // close button
    const closeBtn = document.getElementById('closeFoodOptions');
    if (closeBtn) {
      closeBtn.onclick = () => { modal.style.display = 'none'; };
    }
  
    // clicking outside modal content closes it
    modal.addEventListener('click', function onOuterClick(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  
    // helper format money (local copy to ensure available)
    function formatMoney(v) { return '$' + Number(v || 0).toFixed(2); }
  
    // compute & show live total
    function updateOptionsTotal() {
      // base price from chosen size (or default)
      let basePrice = 0;
      const chosenSizeEl = document.querySelector('#foodOptionsModal input[name="foodSize"]:checked');
      if (chosenSizeEl && food.sizes && food.sizes[parseInt(chosenSizeEl.value)]) {
        basePrice = Number(food.sizes[parseInt(chosenSizeEl.value)].price || 0);
      } else if (food.sizes && food.sizes.length > 0) {
        basePrice = Number(food.sizes[0].price || 0);
      } else {
        basePrice = Number(food.price || 0);
      }
  
      // extras
      const extrasEls = Array.from(document.querySelectorAll('#foodOptionsModal input[name="foodExtra"]:checked'));
      let extrasTotal = 0;
      extrasEls.forEach(el => {
        const p = parseFloat(el.getAttribute('data-price') || '0');
        extrasTotal += (isNaN(p) ? 0 : p);
      });
  
      const qtyEl = document.getElementById('optQuantity');
      const qty = qtyEl ? (parseInt(qtyEl.value) || 1) : 1;
  
      const unitPrice = Number((basePrice + extrasTotal).toFixed(2));
      const total = Number((unitPrice * qty).toFixed(2));
  
      const totalEl = document.getElementById('optionsTotal');
      if (totalEl) totalEl.innerHTML = `Unit: ${formatMoney(unitPrice)} &nbsp; × ${qty} = <span style="color:#0b74de;">${formatMoney(total)}</span>`;
    }
  
    // attach inputs listeners (use modal querySelector to limit scope)
    const modalRoot = document.getElementById('foodOptionsModal');
    if (modalRoot) {
      // delegate: re-run for newly created inputs
      const inputs = modalRoot.querySelectorAll('input[name="foodSize"], input[name="foodExtra"], #optQuantity');
      inputs.forEach(el => {
        el.addEventListener('input', updateOptionsTotal);
        el.addEventListener('change', updateOptionsTotal);
      });
    }
  
    // initialize total display
    updateOptionsTotal();
  
    // confirm add button: set onclick (replace any previous)
    const confirmBtn = document.getElementById('confirmAddToCart');
    if (confirmBtn) {
      confirmBtn.onclick = function() {
        const qty = parseInt(document.getElementById('optQuantity').value) || 1;
        const chosenSizeEl = document.querySelector('#foodOptionsModal input[name="foodSize"]:checked');
        const sizeIdx = chosenSizeEl ? parseInt(chosenSizeEl.value) : null;
  
        const extrasEls = Array.from(document.querySelectorAll('#foodOptionsModal input[name="foodExtra"]:checked'));
        const extras = extrasEls.map(el => {
          const id = el.value;
          let price = parseFloat(el.getAttribute('data-price') || 0);
          let name = id;
          if (food.extras && Array.isArray(food.extras)) {
            const found = food.extras.find(x => String(x.id) === String(id));
            if (found) {
              name = found.name;
              price = Number(found.price || price || 0);
            }
          }
          return { id, name, price: Number(price) };
        });
  
        addToCart(foodId, { quantity: qty, sizeIndex: sizeIdx, extras: extras });
  
        // close modal & update UI
        modal.style.display = 'none';
        updateCartUI();
      };
    }
  }
  
  
  function attachAddToCartButtons() {
    document.querySelectorAll('.add-to-cart').forEach(button => {
      // remove previous listener if any (best-effort)
      try { button.replaceWith(button.cloneNode(true)); } catch(e){}
    });
  
    document.querySelectorAll('.add-to-cart').forEach(button => {
      button.addEventListener('click', function() {
        const foodId = parseInt(this.getAttribute('data-id'));
        const food = foodData.find(f => f.id === foodId);
        if (!food) return;
        if ((food.sizes && food.sizes.length > 0) || (food.extras && food.extras.length > 0)) {
          openFoodOptionsModal(foodId);
        } else {
          addToCart(foodId, { quantity: 1 });
        }
      });
    });
  }
  
  
  // Toast helper
  function showToast(message, duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.position = 'fixed';
      container.style.right = '20px';
      container.style.bottom = '20px';
      container.style.zIndex = 99999;
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = 'toastMessage';
    t.style.background = 'rgba(0,0,0,0.85)';
    t.style.color = '#fff';
    t.style.padding = '10px 14px';
    t.style.marginTop = '8px';
    t.style.borderRadius = '6px';
    t.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    t.style.fontSize = '14px';
    t.style.maxWidth = '320px';
    t.style.wordBreak = 'break-word';
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity 300ms, transform 300ms';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      setTimeout(() => container.removeChild(t), 300);
    }, duration);
  }
  
  function addToCart(foodId, options = {}) {
    const food = foodData.find(item => item.id === foodId);
    if (!food) return;
  
    // determine base price
    let basePrice = 0;
    let sizeName = null;
    if (options.sizeIndex != null && food.sizes && food.sizes[options.sizeIndex]) {
      basePrice = food.sizes[options.sizeIndex].price;
      sizeName = food.sizes[options.sizeIndex].name;
    } else if (food.sizes && food.sizes.length > 0) {
      basePrice = food.sizes[0].price;
      sizeName = food.sizes[0].name;
    } else {
      basePrice = food.price || 0;
    }
  
    // extras price
    let extras = options.extras || [];
    if (!Array.isArray(extras)) extras = [];
  
    const extrasTotal = extras.reduce((s, e) => s + (e.price || 0), 0);
  
    // final unit price
    const unitPrice = parseFloat((basePrice + extrasTotal).toFixed(2));
  
    const quantity = options.quantity || 1;
  
    // create unique uid for cart item (so two pepperoni-large and pepperoni-small are separate)
    const uid = 'ci_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  
    const cartItem = {
      uid,              // unique id for this cart instance
      id: food.id,      // original food id
      name: food.name,
      sizeName: sizeName,
      extras: extras.map(e => ({ id: e.id, name: e.name, price: e.price })),
      price: unitPrice, // price per unit (including extras)
      quantity: quantity,
      image: food.image
    };
  
    // push item to cart
    cart.push(cartItem);
    saveCartToLocalStorage();
    updateCartUI();
    showToast(`${food.name} added to cart`);
  }
  
  function removeFromCart(uid) {
    cart = cart.filter(i => i.uid !== uid);
    saveCartToLocalStorage();
    updateCartUI();
  }
  
  function updateQuantity(uid, change) {
    const item = cart.find(i => i.uid === uid);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) removeFromCart(uid);
    else { saveCartToLocalStorage(); updateCartUI(); }
  }
  
  
  function updateCartUI() {
    const totalItems = cart.reduce((t, i) => t + i.quantity, 0);
    if (cartCount) cartCount.textContent = totalItems;
    const bellCount = document.getElementById('orderBellCount');
    if (bellCount) bellCount.textContent = getPendingLocalOrdersCount();
  
    if (!cartItems) return;
    if (cart.length === 0) {
      cartItems.innerHTML = '<p class="empty-cart-message">Your cart is empty</p>';
      if (cartTotalEl) cartTotalEl.textContent = '0.00';
      return;
    }
  
    cartItems.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
  
      // extras display
      const extrasText = (item.extras && item.extras.length > 0) ? `<div style="font-size:12px; color:#666;">Extras: ${item.extras.map(e => e.name).join(', ')}</div>` : '';
  
      const sizeText = item.sizeName ? `<div style="font-size:13px; color:#333;">Size: ${item.sizeName}</div>` : '';
  
      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';
      cartItem.innerHTML = `
        <div class="item-info">
          <h4>${item.name}</h4>
          ${sizeText}
          ${extrasText}
          <p class="item-price">$${item.price.toFixed(2)} each</p>
        </div>
        <div class="item-quantity">
          <button class="quantity-btn minus" data-uid="${item.uid}">-</button>
          <span class="quantity">${item.quantity}</span>
          <button class="quantity-btn plus" data-uid="${item.uid}">+</button>
        </div>
        <p class="item-total">$${itemTotal.toFixed(2)}</p>
        <button class="remove-item" data-uid="${item.uid}">×</button>
      `;
      cartItems.appendChild(cartItem);
    });
  
    if (cartTotalEl) cartTotalEl.textContent = total.toFixed(2);
  
    // attach updated handlers (by uid)
    document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
      btn.addEventListener('click', function(){ updateQuantity(this.getAttribute('data-uid'), -1); });
    });
    document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
      btn.addEventListener('click', function(){ updateQuantity(this.getAttribute('data-uid'), 1); });
    });
    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', function(){ removeFromCart(this.getAttribute('data-uid')); });
    });
  }
  
  
  function openCart(){ if (cartModal) cartModal.style.display = 'flex'; }
  function closeCartModal(){ if (cartModal) cartModal.style.display = 'none'; }
  
  function saveCartToLocalStorage() { localStorage.setItem('cart', JSON.stringify(cart)); }
  function loadCartFromLocalStorage() { const saved = localStorage.getItem('cart'); if (saved) cart = JSON.parse(saved); }
  

  /**
 * Set a single button into loading state (adds spinner + disables).
 * btn: DOM button element
 * isLoading: boolean
 * label: optional text to show while loading (defaults to "Processing...")
 */
function setButtonLoading(btn, isLoading, label) {
  if (!btn) return;
  if (isLoading) {
    // preserve original state
    if (btn.dataset._origHtml === undefined) btn.dataset._origHtml = btn.innerHTML;
    if (btn.dataset._origDisabled === undefined) btn.dataset._origDisabled = String(btn.disabled || false);

    btn.disabled = true;
    btn.classList.add('btn-loading');
    const spinner = `<span class="spinner" aria-hidden="true"></span>`;
    btn.innerHTML = `${spinner}${label || 'Processing...'}`;
    btn.setAttribute('aria-busy', 'true');
  } else {
    btn.classList.remove('btn-loading');
    btn.removeAttribute('aria-busy');
    // restore original html & disabled state
    if (btn.dataset._origHtml !== undefined) {
      btn.innerHTML = btn.dataset._origHtml;
      delete btn.dataset._origHtml;
    }
    if (btn.dataset._origDisabled !== undefined) {
      btn.disabled = (btn.dataset._origDisabled === 'true');
      delete btn.dataset._origDisabled;
    }
  }
}


// Checkout / order-history functions kept the same (only ensure refreshOrderBell called where appropriate)
function checkout() {
  if (cart.length === 0) { alert('Your cart is empty!'); return; }

  // build checkout modal (same UI you had)
  let checkoutModal = document.getElementById('checkoutModal');
  // --- CHECKOUT: improved district/area UI (client-only 'other place') ---
  if (!checkoutModal) {
    checkoutModal = document.createElement('div');
    checkoutModal.id = 'checkoutModal';
    checkoutModal.className = 'cart-modal';
    checkoutModal.innerHTML = `
      <div class="cart-content" style="width:90%; max-width:700px;">
        <div class="cart-header"><h2>Checkout - Delivery Info</h2><span class="close-btn" id="closeCheckout">&times;</span></div>
        <div class="cart-body" style="padding:20px;">
          <div id="billPreview"></div>

          <form id="checkoutForm">
            <div style="margin-bottom:10px;">
              <label for="custName">Name</label><br>
              <input required id="custName" name="custName" type="text" value="${visitorName || ''}" placeholder="Customer name" />
            </div>

            <div style="margin-bottom:10px;">
              <label for="custPhone">Phone</label><br>
              <input required id="custPhone" name="custPhone" type="text" value="${localStorage.getItem('visitorPhone') || ''}" placeholder="Phone number" style="width:100%; padding:8px; margin-top:6px;" />
            </div>

            <div style="margin-bottom:10px;">
              <label for="districtSelect">District (Banadir region)</label><br>
              <select id="districtSelect" required style="width:100%; padding:8px; margin-top:6px;">
                <!-- populated by JS -->
              </select>
            </div>

            <div style="margin-bottom:10px;">
              <label for="areaSelect">Nearest place / locality</label><br>
              <select id="areaSelect" required style="width:100%; padding:8px; margin-top:6px;">
                <option value="">Select area</option>
              </select>
            </div>

            <!-- shown when user chooses Other for district -->
            <div id="otherDistrictContainer" style="display:none; margin-bottom:10px;">
              <label>Add other district</label><br>
              <input id="otherDistrictInput" placeholder="New district name" style="width:70%; padding:8px; margin-top:6px;" />
              <button id="saveOtherDistrict" type="button" class="btn-small" style="margin-left:8px;">Add district</button>
            </div>

            <!-- shown when user chooses Other for area (client only) -->
            <div id="otherPlaceContainer" style="display:none; margin-bottom:10px;">
              <label>Add other nearest place (this will only be saved for your device/session)</label><br>
              <input id="otherPlace" placeholder="New nearest place / locality" style="width:70%; padding:8px; margin-top:6px;" />
              <button id="saveOtherPlace" type="button" class="btn-small" style="margin-left:8px;">Use this place (for this order)</button>
            </div>

            <div style="text-align:center; margin-top:10px;">
              <button type="submit" class="btn-primary">Confirm Order</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(checkoutModal);

    document.getElementById('closeCheckout').addEventListener('click', () => { checkoutModal.style.display = 'none'; });
    checkoutModal.addEventListener('click', (e) => { if (e.target === checkoutModal) checkoutModal.style.display = 'none'; });

    // ----- Districts / areas data for Banaadir (edit as needed) -----
    const defaultDistrictAreas = {
      "Hamarweyne": ["Bakara Market", "Shingani area", "Old Port"],
      "Shangani": ["Shangani Market", "Coast Road"],
      "Bondhere": ["Bondhere Market", "Afrika Hotel area"],
      "Hodan": ["Taleex", "Albarako", "Tarabuun", "Digfeer", "Warshada Caanaha", "Soonakey", "Banaadir"],
      "Wadajir": ["Madina", "Bakaara outskirts"],
      "Daynile": ["Daynile main", "Airport road"],
      "Dharkenley": ["Sodonka", "KM4 area"],
      "Kaxda": ["Kaxda Market", "New residential"],
      "Yaaqshiid": ["Intelligence quarter", "Stadium area"],
      "Heliwa": ["Heliwa Market", "Surroundings"],
      "Shibis": ["Shibis Market", "Upcountry road"]
    };

    // Helpers shared between login & checkout to persist custom districts/areas
    const CUSTOM_DISTRICTS_KEY = 'customDistricts_v1';
    const CUSTOM_AREAS_KEY = 'customAreas_v1';

    function getCustomDistricts() {
      try { return JSON.parse(localStorage.getItem(CUSTOM_DISTRICTS_KEY) || '[]'); } catch(e){ return []; }
    }
    function saveCustomDistricts(arr) {
      try { localStorage.setItem(CUSTOM_DISTRICTS_KEY, JSON.stringify(arr || [])); } catch(e){ console.warn(e); }
    }
    function getCustomAreas() {
      try { return JSON.parse(localStorage.getItem(CUSTOM_AREAS_KEY) || '{}'); } catch(e){ return {}; }
    }
    function saveCustomAreas(obj) {
      try { localStorage.setItem(CUSTOM_AREAS_KEY, JSON.stringify(obj || {})); } catch(e){ console.warn(e); }
    }

    // DOM refs
    const districtSelect = document.getElementById('districtSelect');
    const areaSelect = document.getElementById('areaSelect');
    const otherDistrictContainer = document.getElementById('otherDistrictContainer');
    const otherDistrictInput = document.getElementById('otherDistrictInput');
    const saveOtherDistrictBtn = document.getElementById('saveOtherDistrict');
    const otherPlaceContainer = document.getElementById('otherPlaceContainer');
    const otherPlaceInput = document.getElementById('otherPlace');
    const saveOtherPlaceBtn = document.getElementById('saveOtherPlace');

    // temporary client-only area value (not persisted globally)
    let tempClientArea = null;

    function buildDistrictOptions() {
      const custom = getCustomDistricts();
      const districts = Object.keys(defaultDistrictAreas).slice();
      custom.forEach(cd => { if (!districts.includes(cd)) districts.push(cd); });
      districtSelect.innerHTML = '<option value="">Select district</option>';
      districts.forEach(d => {
        const opt = document.createElement('option'); opt.value = d; opt.textContent = d;
        districtSelect.appendChild(opt);
      });
      const otherOpt = document.createElement('option'); otherOpt.value = 'Other'; otherOpt.textContent = 'Other (add new district)';
      districtSelect.appendChild(otherOpt);
    }

    function populateAreasForDistrict(district) {
      areaSelect.innerHTML = '<option value="">Select area</option>';
      if (!district || district === 'Other') return;
      const defaultList = defaultDistrictAreas[district] || [];
      const customAreasObj = getCustomAreas();
      const savedForDistrict = Array.isArray(customAreasObj[district]) ? customAreasObj[district] : [];
      const merged = defaultList.slice();
      savedForDistrict.forEach(x => { if (!merged.includes(x)) merged.push(x); });
      merged.forEach(a => {
        const opt = document.createElement('option'); opt.value = a; opt.textContent = a;
        areaSelect.appendChild(opt);
      });
      // add Other at bottom (client-local)
      const otherOpt = document.createElement('option'); otherOpt.value = 'Other'; otherOpt.textContent = 'Other (add new nearest place)';
      areaSelect.appendChild(otherOpt);
    }

    districtSelect.addEventListener('change', function() {
      const d = this.value;
      otherDistrictContainer.style.display = (d === 'Other') ? 'block' : 'none';
      otherPlaceContainer.style.display = 'none';
      tempClientArea = null;
      if (d && d !== 'Other') {
        populateAreasForDistrict(d);
      } else {
        areaSelect.innerHTML = '<option value="">Select area</option>';
      }
    });

    areaSelect.addEventListener('change', function() {
      const a = this.value;
      otherPlaceContainer.style.display = (a === 'Other') ? 'block' : 'none';
      // if user selects a real area from dropdown, ensure tempClientArea cleared
      if (a && a !== 'Other') tempClientArea = null;
    });

    // Add new district (persist globally)
    saveOtherDistrictBtn.addEventListener('click', function() {
      const val = (otherDistrictInput.value || '').trim();
      if (!val) { alert('Enter the district name'); return; }
      const custom = getCustomDistricts();
      if (!custom.includes(val)) {
        custom.push(val);
        saveCustomDistricts(custom);
      }
      // rebuild and select new district
      buildDistrictOptions();
      districtSelect.value = val;
      otherDistrictInput.value = '';
      otherDistrictContainer.style.display = 'none';
      populateAreasForDistrict(val);
      showToast && showToast(`Added district "${val}"`);
    });

    // Add new place (CLIENT ONLY: do NOT persist globally)
    saveOtherPlaceBtn.addEventListener('click', function() {
      const d = districtSelect.value;
      if (!d || d === 'Other') { alert('Select a district first'); return; }
      const val = (otherPlaceInput.value || '').trim();
      if (!val) { alert('Enter the nearest place name'); return; }
      // Do not save to global storage — only keep for this session/order
      tempClientArea = val;
      // add an option temporarily to the current areaSelect so it becomes selected
      const opt = document.createElement('option'); opt.value = val; opt.textContent = val; opt.selected = true;
      // remove possible "Other" option then readd it at bottom
      const otherOption = Array.from(areaSelect.options).find(o => o.value === 'Other');
      if (otherOption) areaSelect.removeChild(otherOption);
      areaSelect.appendChild(opt);
      const newOther = document.createElement('option'); newOther.value = 'Other'; newOther.textContent = 'Other (add new nearest place)';
      areaSelect.appendChild(newOther);
      otherPlaceInput.value = '';
      otherPlaceContainer.style.display = 'none';
      showToast && showToast(`Using nearest place "${val}" (this is local to your device)`);
    });

    // initial build
    buildDistrictOptions();

    // --- PREFILL checkout fields from localStorage (name, phone, district, area) ---
    (function prefillCheckoutFields() {
      try {
        const nameSaved = localStorage.getItem('visitorName') || '';
        const phoneSaved = localStorage.getItem('visitorPhone') || '';
        const savedDistrict = localStorage.getItem('visitorDistrict') || '';
        const savedArea = localStorage.getItem('visitorArea') || '';

        const custNameEl = document.getElementById('custName');
        const custPhoneEl = document.getElementById('custPhone');
        const districtSelectNow = document.getElementById('districtSelect');
        const areaSelectNow = document.getElementById('areaSelect');

        // quick fill for name/phone if fields empty
        if (custNameEl && !custNameEl.value) custNameEl.value = nameSaved;
        if (custPhoneEl && !custPhoneEl.value) custPhoneEl.value = phoneSaved;

        // delay a tiny bit so options exist (safe microtask)
        setTimeout(() => {
          try {
            if (districtSelectNow && savedDistrict) {
              // if savedDistrict missing from options -> add to custom districts & rebuild
              const hasDistrictOpt = Array.from(districtSelectNow.options).some(o => o.value === savedDistrict);
              if (!hasDistrictOpt) {
                const custom = getCustomDistricts();
                if (!custom.includes(savedDistrict)) {
                  custom.push(savedDistrict);
                  saveCustomDistricts(custom);
                }
                // rebuild so the new district appears
                buildDistrictOptions();
              }

              // set the district, then populate the areas dropdown
              districtSelectNow.value = savedDistrict;
              populateAreasForDistrict(savedDistrict);

              if (areaSelectNow && savedArea) {
                const hasAreaOpt = Array.from(areaSelectNow.options).some(o => o.value === savedArea);
                if (!hasAreaOpt) {
                  // persist savedArea into customAreas for that district so it appears next time
                  const obj = getCustomAreas();
                  obj[savedDistrict] = obj[savedDistrict] || [];
                  if (!obj[savedDistrict].includes(savedArea)) {
                    obj[savedDistrict].push(savedArea);
                    saveCustomAreas(obj);
                  }
                  // repopulate to pick up the persisted custom area
                  populateAreasForDistrict(savedDistrict);
                }
                areaSelectNow.value = savedArea;
              }
            }
          } catch (err) { console.warn('prefill checkout (inner) failed', err); }
        }, 10);
      } catch (err) { console.warn('prefill checkout failed', err); }
    })();

  } // end checkoutModal exists

  // show modal
  checkoutModal.style.display = 'flex';

  // build bill preview (keeps original function behavior)
  buildBillPreviewHtml();

  // --- Replace checkout submit handler that saves order & opens payment modal ---
  // remove previous listener if any (defensive)
  try { document.getElementById('checkoutForm').removeEventListener && document.getElementById('checkoutForm').removeEventListener('submit', window.__checkoutFormHandler); } catch(e){}

  window.__checkoutFormHandler = async function(e){
    e.preventDefault();
  
    // find the submit button and set loading
    const submitBtn = document.querySelector('#checkoutForm button[type="submit"]');
    setButtonLoading(submitBtn, true, 'Processing order...');
  
    try {
      const name = document.getElementById('custName').value.trim();
      const phone = document.getElementById('custPhone').value.trim();
      const district = document.getElementById('districtSelect').value;
      // prefer tempClientArea if set, else areaSelect.value
      const area = (typeof tempClientArea === 'string' && tempClientArea.length > 0) ? tempClientArea : (document.getElementById('areaSelect').value || '');
      const otherPlace = ''; // we used tempClientArea instead of a persisted otherPlace field
  
      const totalAmount = parseFloat(cartTotalEl ? cartTotalEl.textContent : '0') || cart.reduce((s,i)=> s + i.price*i.quantity, 0);
      const localId = 'local_' + Date.now();
  
      const orderObj = {
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, sizeName: i.sizeName || null, extras: (i.extras || []).map(e => ({ id: e.id, name: e.name, price: e.price })) })),
        total: totalAmount,
        timestamp: (new Date()).toISOString(),
        visitorId: visitorId,
        visitorName: name,
        phone: phone,
        district: district,
        area: area,
        otherPlace: '',
        paymentStatus: 'pending',
        status: 'pending',
        localId
      };
  
      // Save locally
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      localOrders.unshift({ ...orderObj });
      localStorage.setItem('orders', JSON.stringify(localOrders));
  
      // Save visitor name & phone & location for UI (persist locally)
      visitorName = name;
      try {
        localStorage.setItem('visitorName', visitorName);
        localStorage.setItem('visitorPhone', phone || '');
        localStorage.setItem('visitorDistrict', district || '');
        localStorage.setItem('visitorArea', area || '');
      } catch(err) { console.warn('persist visitor data failed', err); }
  
      const profileLink = document.getElementById('profileLink');
      if (profileLink) profileLink.textContent = visitorName || 'Login';
  
      // Try to save remotely if DB present
      let remoteRes = null;
      if (window.FirebaseDB && typeof window.FirebaseDB.saveOrder === 'function') {
        try {
          remoteRes = await window.FirebaseDB.saveOrder(orderObj);
          if (remoteRes && remoteRes.success) {
            // attach remote id locally for reference
            localOrders[0].remoteId = remoteRes.id;
            localStorage.setItem('orders', JSON.stringify(localOrders));
            orderObj.remoteId = remoteRes.id;
            // --- Send order summary to restaurant WhatsApp (opens composer) ---
            try {
              const waNumber = '617125558'; // restaurant WhatsApp number (use exactly as requested)
              // build items text
              const itemsText = (orderObj.items || []).map(it => {
                const line = `${it.name}${it.sizeName ? ' ('+it.sizeName+')' : ''} x ${it.quantity} — $${(it.price * it.quantity).toFixed(2)}`;
                const extras = (it.extras && it.extras.length) ? ` | Extras: ${it.extras.map(x=>x.name).join(', ')}` : '';
                return line + extras;
              }).join('\n');
  
              const orderIdPart = orderObj.remoteId ? `Remote ID: ${orderObj.remoteId}\n` : '';
              const msg =
                `New order received\n` +
                `${orderIdPart}` +
                `Local ID: ${orderObj.localId}\n` +
                `Customer: ${orderObj.visitorName || ''}\n` +
                `Phone: ${orderObj.phone || ''}\n` +
                `District: ${orderObj.district || ''}\n` +
                `Area: ${orderObj.area || ''}\n\n` +
                `Items:\n${itemsText}\n\n` +
                `Total: $${(orderObj.total || 0).toFixed(2)}\n\n` +
                `Notes: ${orderObj.otherPlace || ''}\n\n` +
                `Please confirm.`;
  
              const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
              // open a new tab/window to compose WhatsApp message (user must press send)
              window.open(waUrl, '_blank');
            } catch (e) {
              console.warn('WhatsApp send skipped', e);
            }
          } else {
            console.warn('Order save to Firestore failed; kept only locally', remoteRes && remoteRes.error);
          }
        } catch (err) {
          console.warn('Order save error', err);
        }
      }
  
      // Clear cart and UI
      cart = [];
      saveCartToLocalStorage();
      updateCartUI();
  
      // Close checkout modal
      checkoutModal.style.display = 'none';
  
      // Open payment modal and pass the order object (has localId and maybe remoteId)
      openPaymentModal(orderObj);
  
      refreshOrderBell();
    } catch (err) {
      console.error('Order processing failed', err);
      showToast && showToast('Failed to place order. Please try again.');
    } finally {
      // always restore the button state
      setButtonLoading(submitBtn, false);
    }
  };
  
  document.getElementById('checkoutForm').addEventListener('submit', window.__checkoutFormHandler);

  checkoutModal.style.display = 'flex';

  // build a simple human-readable bill preview showing sizes/extras
  function buildBillPreviewHtml() {
    if (!document.getElementById('billPreview')) return;
    if (!cart || cart.length === 0) {
      document.getElementById('billPreview').innerHTML = '<div style="padding:12px; background:#fff; border-radius:6px;">Your cart is empty.</div>';
      return;
    }

    let html = '<div style="background:#fff; padding:12px; border-radius:8px; margin-bottom:14px;">';
    html += '<strong>Order preview:</strong><br/><br/>';
    cart.forEach(ci => {
      const extras = (ci.extras && ci.extras.length) ? ` | Extras: ${ci.extras.map(x => x.name).join(', ')}` : '';
      const size = ci.sizeName ? ` | Size: ${ci.sizeName}` : '';
      html += `- ${ci.name} ${size}${extras} x ${ci.quantity} = $${(ci.price * ci.quantity).toFixed(2)}<br/>`;
    });
    const total = cart.reduce((s,i)=> s + i.price * i.quantity, 0);
    html += `<br/><strong>Total: $${total.toFixed(2)}</strong>`;
    html += '</div>';
    document.getElementById('billPreview').innerHTML = html;
  }

  // ---------------------------
  // Fixed-restaurant USSD helper
  // ---------------------------
  // Fixed-restaurant USSD helper (keep exact 2-decimal amount)
  function generateUSSD(operator, amount) {
    // Restaurant (fixed) numbers — change these if you want different restaurant numbers later
    const RESTAURANT_NUMBERS = {
      'Hormuud': '67125558',   // *712*67125558*AMOUNT#
      'Somtel':  '627125558'   // *110*627125558*AMOUNT#
    };

    // Ensure amount is shown exactly with 2 decimals (no rounding to integer)
    const amtNum = Number(amount) || 0;
    const amtStr = amtNum.toFixed(2); // "9.90", "12.50", etc.

    if (operator === 'Hormuud') return `*712*${RESTAURANT_NUMBERS['Hormuud']}*${amtStr}#`;
    if (operator === 'Somtel')  return `*110*${RESTAURANT_NUMBERS['Somtel']}*${amtStr}#`;

    // fallback to Hormuud format
    return `*712*${RESTAURANT_NUMBERS['Hormuud']}*${amtStr}#`;
  }

  // ---------------------------
  // Payment modal (uses fixed restaurant numbers in USSD)
  // ---------------------------
  function openPaymentModal(order) {
    const total = order && order.total ? Number(order.total) : 0;
    const displayTotal = total.toFixed(2);

    // Recipient input still prefilled from order or saved visitorPhone for user's convenience,
    // but the USSD will always use the restaurant number defined in generateUSSD().
    const defaultRecipient = order && order.phone ? order.phone : (localStorage.getItem('visitorPhone') || '617125558');

    let payModal = document.getElementById('paymentModal');
    if (!payModal) {
      payModal = document.createElement('div');
      payModal.id = 'paymentModal';
      payModal.className = 'cart-modal';
      payModal.innerHTML = `
        <div class="cart-content" style="width:90%; max-width:520px;">
          <div class="cart-header"><h2>Payment</h2><span class="close-btn" id="closePaymentModal">&times;</span></div>
          <div class="cart-body" style="padding:18px;">
            <p>Please use one of the USSD codes below to pay, or choose 'I'll pay on delivery'.</p>

            <div style="margin-bottom:10px;">
              <label>Operator</label><br/>
              <select id="payOperator" style="width:100%; padding:8px; margin-top:6px;">
                <option value="Hormuud">Hormuud (EVC+)</option>
                <option value="Somtel">Somtel</option>
              </select>
            </div>

            <div style="margin-bottom:10px;">
              <label>Recipient number (for your reference)</label><br/>
              <input id="payRecipient" type="text" value="${defaultRecipient}" style="width:100%; padding:8px; margin-top:6px;" />
              <small style="color:#666;">You can edit this field for convenience, but the USSD dial code will always send to the restaurant's fixed number.</small>
            </div>

            <div style="margin-bottom:10px;">
              <label>Amount</label><br/>
              <input id="payAmount" type="text" value="${displayTotal}" style="width:100%; padding:8px; margin-top:6px;" readonly />
              <small style="color:#666;">(Amount is read-only and will be used in the USSD.)</small>
            </div>

            <div style="margin:14px 0; background:#f8fafc; padding:10px; border-radius:8px;">
              <div style="display:flex; gap:8px; align-items:center; justify-content:space-between;">
                <div style="flex:1; min-width:0;">
                  <div style="font-size:13px; color:#333;">USSD Code (restaurant number is fixed)</div>
                  <div id="ussdCode" style="word-break:break-all; font-weight:700; margin-top:6px;">...</div>
                  <div style="font-size:13px; color:#666;">Tap Dial to open your phone dialer with the code (mobile only).</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px; margin-left:8px;">
                  <button id="copyUssdBtn" class="btn-smalll">Copy</button>
                  <a id="dialUssdBtn" class="btn-smalll" style="text-decoration:none; display:inline-block;">Dial</a>
                </div>
              </div>
            </div>

            <div style="text-align:center; margin-top:10px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
              <button id="paidNotifyBtn" class="btn-primary">I've Paid — Notify</button>
              <button id="codBtn" class="btn-small">I'll pay on delivery</button>
              <button id="closePaymentBtn" class="btn-small">Done</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(payModal);

      // close handlers
      document.getElementById('closePaymentModal').addEventListener('click', () => payModal.style.display = 'none');
      document.getElementById('closePaymentBtn').addEventListener('click', () => payModal.style.display = 'none');

      // Rebuild USSD string (IMPORTANT: uses the fixed restaurant number from generateUSSD)
      function refreshUSSD() {
        const op = document.getElementById('payOperator').value;
        // take exact displayed value (string) and if empty use total with two decimals
        const rawAmt = (document.getElementById('payAmount').value || '').trim();
        const amt = rawAmt.length > 0 ? rawAmt : total.toFixed(2);
        const ussd = generateUSSD(op, amt);
        document.getElementById('ussdCode').textContent = ussd;
        const encoded = encodeURIComponent(ussd);
        const telHref = `tel:${encoded}`;
        const dialBtn = document.getElementById('dialUssdBtn');
        dialBtn.setAttribute('href', telHref);
        dialBtn.setAttribute('onclick', `window.location.href='${telHref}'; return false;`);
      }

      // Attach events: operator change or amount (amount is read-only but we still rebuild if anything changes)
      document.getElementById('payOperator').addEventListener('change', refreshUSSD);
      // keep recipient input editable for user's convenience but DO NOT use it to build the USSD
      document.getElementById('payRecipient').addEventListener('input', function(){ /* no-op for USSD generation */ });

      // copy USSD
      document.getElementById('copyUssdBtn').addEventListener('click', async function(){
        const txt = document.getElementById('ussdCode').textContent;
        try {
          await navigator.clipboard.writeText(txt);
          showToast('USSD code copied to clipboard');
        } catch (err) {
          const ta = document.createElement('textarea');
          ta.value = txt;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); showToast('USSD copied'); } catch(e){ alert('Copy failed, please copy manually: ' + txt); }
          ta.remove();
        }
      });

      document.getElementById('paidNotifyBtn').addEventListener('click', async function() {
        try {
          const orders = JSON.parse(localStorage.getItem('orders') || '[]');
          const idx = orders.findIndex(o => (order.localId && o.localId === order.localId) || (order.remoteId && o.remoteId === order.remoteId));
          if (idx !== -1) {
            orders[idx].paymentStatus = 'paid';
            orders[idx].status = 'pending'; // keep pending until admin confirms
            orders[idx].visitorName = orders[idx].visitorName || (localStorage.getItem('visitorName') || order.visitorName || '');
            orders[idx].phone = orders[idx].phone || (localStorage.getItem('visitorPhone') || order.phone || '');
            // store client location timestamp if available
            orders[idx].clientLocation = orders[idx].clientLocation || null;
            localStorage.setItem('orders', JSON.stringify(orders));
          }
        } catch (err) { console.warn('update local order paid failed', err); }

        // Try server updates (non-blocking)
        try {
          if (window.FirebaseDB && typeof window.FirebaseDB.updateOrderPaymentStatus === 'function') {
            await window.FirebaseDB.updateOrderPaymentStatus(order.remoteId || order.localId || order.localId, 'paid');
          }
          if (window.FirebaseDB && typeof window.FirebaseDB.notifyPayment === 'function') {
            await window.FirebaseDB.notifyPayment(order.remoteId || order.localId || order.localId, { paid: true });
          }
        } catch (e) { console.warn('server payment notify failed', e); }

        const name = (order && (order.visitorName || localStorage.getItem('visitorName'))) || 'Customer';
        showToast(`Thanks, ${name}! We marked your payment as PAID. Admin will confirm.`, 2200, 'confirmed');

        payModal.style.display = 'none';
        refreshOrderBell();
        refreshVisitorOrderHistoryUI();
      });

      document.getElementById('codBtn').addEventListener('click', async function() {
        try {
          const orders = JSON.parse(localStorage.getItem('orders') || '[]');
          const idx = orders.findIndex(o => (order.localId && o.localId === order.localId) || (order.remoteId && o.remoteId === order.remoteId));
          if (idx !== -1) {
            orders[idx].paymentStatus = 'cod';
            orders[idx].status = 'pending';
            orders[idx].visitorName = orders[idx].visitorName || (localStorage.getItem('visitorName') || order.visitorName || '');
            orders[idx].phone = orders[idx].phone || (localStorage.getItem('visitorPhone') || order.phone || '');
            localStorage.setItem('orders', JSON.stringify(orders));
          }
        } catch (err) { console.warn('mark COD failed', err); }

        try {
          if (window.FirebaseDB && typeof window.FirebaseDB.updateOrderPaymentStatus === 'function') {
            await window.FirebaseDB.updateOrderPaymentStatus(order.remoteId || order.localId || order.localId, 'cod');
          }
          if (window.FirebaseDB && typeof window.FirebaseDB.notifyPayment === 'function') {
            await window.FirebaseDB.notifyPayment(order.remoteId || order.localId || order.localId, { paid: false, method: 'cod' });
          }
        } catch (e) { console.warn('server COD notify failed', e); }

        const name = (order && (order.visitorName || localStorage.getItem('visitorName'))) || 'Customer';
        showToast(`Thanks, ${name}! We'll collect payment on delivery.`, 2000, 'info');

        payModal.style.display = 'none';
        refreshOrderBell();
        refreshVisitorOrderHistoryUI();
      });

    } // end if !payModal

    // Ensure fields reflect current order each time modal opens
    const payAmountEl = document.getElementById('payAmount');
    const payRecipientEl = document.getElementById('payRecipient');
    const payOperatorEl = document.getElementById('payOperator');

    if (payAmountEl) {
      payAmountEl.value = displayTotal;
      payAmountEl.setAttribute('readonly','');
    }
    if (payRecipientEl) payRecipientEl.value = order && order.phone ? order.phone : (localStorage.getItem('visitorPhone') || defaultRecipient);
    if (payOperatorEl) payOperatorEl.value = 'Hormuud';

    // initial USSD build and show modal
    const opEl = document.getElementById('payOperator');
    if (opEl) opEl.dispatchEvent(new Event('change'));
    const pm = document.getElementById('paymentModal');
    if (pm) pm.style.display = 'flex';
  }

  // call immediately to populate preview when checkout opens
  buildBillPreviewHtml();

  // also re-populate preview after any cart changes (so it's up-to-date)
  const _origUpdateCartUI = updateCartUI;
  updateCartUI = function() { _origUpdateCartUI(); buildBillPreviewHtml(); };
}

  
  // Order History code (same behaviour)
  async function openOrderHistory() {
    let historyModal = document.getElementById('historyModal');
    if (!historyModal) {
      historyModal = document.createElement('div');
      historyModal.id = 'historyModal';
      historyModal.className = 'cart-modal';
      historyModal.innerHTML = `
        <div class="cart-content" style="width:90%; max-width:800px;">
          <div class="cart-header"><h2>Your Orders</h2><span class="close-btn" id="closeHistory">&times;</span></div>
          <div class="cart-body" style="padding:20px;">
            <div id="historyList">Loading orders...</div>
          </div>
        </div>
      `;
      document.body.appendChild(historyModal);
  
      document.getElementById('closeHistory').addEventListener('click', ()=> historyModal.style.display='none');
      historyModal.addEventListener('click', (e)=> { if (e.target === historyModal) historyModal.style.display='none'; });
    }
  
    historyModal.style.display = 'flex';
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '<p>Loading orders...</p>';
  
    // First show local orders
    const localOrders = JSON.parse(localStorage.getItem('orders')) || [];
    let html = '';
    if (localOrders.length === 0) {
      html += `<p>No local orders yet.</p>`;
    } else {
      localOrders.forEach(o => { html += renderOrderCard(o); });
    }
  
    // Try to fetch remote orders for this visitor
    if (window.FirebaseDB && typeof window.FirebaseDB.getOrdersForVisitor === 'function') {
      const res = await window.FirebaseDB.getOrdersForVisitor(visitorId);
      if (res.success) {
        const remoteOrders = res.orders || [];
        if (remoteOrders.length > 0) {
          html += `<h3>Orders on Server</h3>`;
          remoteOrders.forEach(o => { html += renderOrderCard(o); });
        }
      } else {
        console.warn('Could not fetch remote orders (see error):', res.error);
        html += `<div style="color:#b00; margin-top:10px;"><strong>Note:</strong> Unable to fetch server orders. ${res.error && res.error.message ? res.error.message : 'Please check your network or Firestore indexes.'}</div>`;
        html += `<div style="font-size:12px; color:#666; margin-top:6px;">If you see a message about "requires an index" — create a composite index (visitorId + createdAt) in Firestore.</div>`;
      }
    }
  
    historyList.innerHTML = html;
  }
  function renderOrderCard(o) {
    const created = o.createdAt ? (o.createdAt.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleString() : new Date(o.timestamp).toLocaleString()) : new Date(o.timestamp).toLocaleString();
    const status = o.status || o.paymentStatus || 'pending';
    let itemsHtml = '';
    (o.items || []).forEach(it => itemsHtml += `<li>${it.name} x ${it.quantity} — $${(it.price*it.quantity).toFixed(2)}</li>`);
    const name = o.visitorName || localStorage.getItem('visitorName') || '';
    const phone = o.phone || localStorage.getItem('visitorPhone') || '';
    return `
      <div class="order-card" style="border:1px solid #eee; padding:12px; margin-bottom:10px; border-radius:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>Order</strong> <small>${created}</small><br>
            <small>${o.district || ''} / ${o.area || ''} ${o.otherPlace ? ' - ' + o.otherPlace : ''}</small>
          </div>
          <div>
            <span style="display:block; text-align:right;">Total: $${(o.total || 0).toFixed(2)}</span>
<span style="display:block; text-align:right;">Status: <strong>${status}</strong></span>
<span style="display:block; text-align:right;">Payment: <strong>${(o.paymentStatus||'pending').toUpperCase()}</strong></span>
<div style="text-align:right; margin-top:6px;">
<div style="text-align:right; margin-top:6px;">
  <button class="btn-small " onclick="window.open('order-track.html?id=${o.localId || o.remoteId || o.id}', '_blank')">Open tracking</button>
</div>
</div>
          </div>
        </div>
  
        <div style="margin-top:8px;">
          ${ name ? `<div><strong>Name:</strong> ${name}</div>` : '' }
          ${ phone ? `<div><strong>Phone:</strong> ${phone}</div>` : '' }
        </div>
  
        <ul style="margin-top:8px;">${itemsHtml}</ul>
        ${o.remoteId ? `<div style="font-size:12px; color:#666">Remote ID: ${o.remoteId}</div>` : ''}
      </div>
    `;
  }
  
  
  // refresh bell: if admin signed in -> fetch server pending orders count, else show local pending count
  async function refreshOrderBell() {
    const bellCount = document.getElementById('orderBellCount');
    if (!bellCount) return;
  
    // if admin, try to read server orders and count pending
    if (isAdminSignedIn && window.FirebaseDB && typeof window.FirebaseDB.listAllOrders === 'function') {
      try {
        const res = await window.FirebaseDB.listAllOrders();
        if (res && res.success) {
          const pending = (res.orders || []).filter(o => ((o.status || o.paymentStatus || 'pending') === 'pending')).length;
          bellCount.textContent = pending;
          return;
        }
      } catch (err) {
        console.warn('refreshOrderBell: server count failed', err);
        // fall through to local count
      }
    }
  
    // fallback: local pending orders count for visitors
    const localCount = getPendingLocalOrdersCount();
    bellCount.textContent = localCount;
  }
  
  function getPendingLocalOrdersCount() {
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    return orders.filter(o => (o.status || o.paymentStatus || 'pending') === 'pending').length;
  }
  
  // Login Modal (visitor)
// Replace existing openLoginModal with this complete function
function openLoginModal() {
  let loginModal = document.getElementById('loginModal');

  // create modal markup + wiring if not present
  if (!loginModal) {
    loginModal = document.createElement('div');
    loginModal.id = 'loginModal';
    loginModal.className = 'cart-modal';
    loginModal.innerHTML = `
      <div class="cart-content" style="width:90%; max-width:480px;">
        <div class="cart-header">
          <h2>Your details (saved on this device)</h2>
          <span class="close-btn" id="closeLogin">&times;</span>
        </div>
        <div class="cart-body" style="padding:20px;">
          <form id="loginForm">
            <div style="margin-bottom:10px;">
              <label for="visitorNameInput">Name</label><br>
              <input id="visitorNameInput" type="text" value="" placeholder="Name to show on orders (optional)" style="width:100%; padding:8px; margin-top:6px;" />
            </div>

            <div style="margin-bottom:10px;">
              <label for="visitorPhoneInput">Phone</label><br>
              <input id="visitorPhoneInput" type="text" value="" placeholder="Phone number" style="width:100%; padding:8px; margin-top:6px;" />
            </div>

            <div style="margin-bottom:10px;">
              <label for="loginDistrictSelect">District (Banadir region)</label><br>
              <select id="loginDistrictSelect" required style="width:100%; padding:8px; margin-top:6px;">
                <!-- populated by JS -->
              </select>
            </div>

            <div style="margin-bottom:10px;">
              <label for="loginAreaSelect">Nearest place / locality</label><br>
              <select id="loginAreaSelect" required style="width:100%; padding:8px; margin-top:6px;">
                <option value="">Select area</option>
              </select>
            </div>

            <div id="loginOtherDistrictContainer" style="display:none; margin-bottom:10px;">
              <label>Add other district</label><br>
              <input id="loginOtherDistrictInput" placeholder="New district name" style="width:70%; padding:8px; margin-top:6px;" />
              <button id="loginSaveOtherDistrict" type="button" class="btn-small" style="margin-left:8px;">Add district</button>
            </div>

            <div id="loginOtherPlaceContainer" style="display:none; margin-bottom:10px;">
              <label>Add other nearest place (saved to your device)</label><br>
              <input id="loginOtherPlaceInput" placeholder="New nearest place / locality" style="width:70%; padding:8px; margin-top:6px;" />
              <button id="loginSaveOtherPlace" type="button" class="btn-small" style="margin-left:8px;">Save place</button>
            </div>

            <div style="text-align:center; margin-top:12px;">
              <button class="btn-primary" type="submit">Save</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(loginModal);

    // close
    document.getElementById('closeLogin').addEventListener('click', () => loginModal.style.display = 'none');
    loginModal.addEventListener('click', (e) => { if (e.target === loginModal) loginModal.style.display = 'none'; });

    // ----- District/area data and helpers -----
    const defaultDistrictAreas = {
      "Hamarweyne": ["Bakara Market", "Shingani area", "Old Port"],
      "Shangani": ["Shangani Market", "Coast Road"],
      "Bondhere": ["Bondhere Market", "Afrika Hotel area"],
      "Hodan": ["Taleex","Albarako","Tarabuun","Digfeer","Warshada Caanaha","Soonakey","Banaadir"],
      "Wadajir": ["Madina","Bakaara outskirts"],
      "Daynile": ["Daynile main","Airport road"],
      "Dharkenley": ["Sodonka","KM4 area"],
      "Kaxda": ["Kaxda Market","New residential"],
      "Yaaqshiid": ["Intelligence quarter","Stadium area"],
      "Heliwa": ["Heliwa Market","Surroundings"],
      "Shibis": ["Shibis Market","Upcountry road"]
    };

    // keys used for storing custom districts/areas
    const CUSTOM_DISTRICTS_KEY = 'customDistricts_v1';
    const CUSTOM_AREAS_KEY = 'customAreas_v1';

    // define global helpers only if not already present (keeps compatibility)
    if (typeof window.getCustomDistricts !== 'function') {
      window.getCustomDistricts = function() { try { return JSON.parse(localStorage.getItem(CUSTOM_DISTRICTS_KEY) || '[]'); } catch(e){ return []; } };
      window.saveCustomDistricts = function(arr) { try { localStorage.setItem(CUSTOM_DISTRICTS_KEY, JSON.stringify(arr || [])); } catch(e){ console.warn(e); } };
      window.getCustomAreas = function() { try { return JSON.parse(localStorage.getItem(CUSTOM_AREAS_KEY) || '{}'); } catch(e){ return {}; } };
      window.saveCustomAreas = function(obj) { try { localStorage.setItem(CUSTOM_AREAS_KEY, JSON.stringify(obj || {})); } catch(e){ console.warn(e); } };
    }

    // DOM refs inside modal
    const dSelect = document.getElementById('loginDistrictSelect');
    const aSelect = document.getElementById('loginAreaSelect');
    const otherDistrictContainer = document.getElementById('loginOtherDistrictContainer');
    const otherDistrictInput = document.getElementById('loginOtherDistrictInput');
    const saveOtherDistrictBtn = document.getElementById('loginSaveOtherDistrict');
    const otherPlaceContainer = document.getElementById('loginOtherPlaceContainer');
    const otherPlaceInput = document.getElementById('loginOtherPlaceInput');
    const saveOtherPlaceBtn = document.getElementById('loginSaveOtherPlace');

    // Build district options (default + custom)
    function buildDistrictOptions() {
      const custom = window.getCustomDistricts();
      const districts = Object.keys(defaultDistrictAreas).slice();
      custom.forEach(cd => { if (!districts.includes(cd)) districts.push(cd); });
      districts.sort();
      dSelect.innerHTML = '<option value="">Select district</option>';
      districts.forEach(d => {
        const opt = document.createElement('option'); opt.value = d; opt.textContent = d;
        dSelect.appendChild(opt);
      });
      const otherOpt = document.createElement('option'); otherOpt.value = 'Other'; otherOpt.textContent = 'Other (add new district)';
      dSelect.appendChild(otherOpt);
    }

    // Populate areas for chosen district, including saved custom areas
    function populateAreasForDistrict(district) {
      aSelect.innerHTML = '<option value="">Select area</option>';
      if (!district || district === 'Other') return;
      const defaultList = defaultDistrictAreas[district] || [];
      const customAreasObj = window.getCustomAreas();
      const savedForDistrict = Array.isArray(customAreasObj[district]) ? customAreasObj[district] : [];
      const merged = defaultList.slice();
      savedForDistrict.forEach(x => { if (!merged.includes(x)) merged.push(x); });
      merged.forEach(a => {
        const opt = document.createElement('option'); opt.value = a; opt.textContent = a;
        aSelect.appendChild(opt);
      });
      const otherOpt = document.createElement('option'); otherOpt.value = 'Other'; otherOpt.textContent = 'Other (add new nearest place)';
      aSelect.appendChild(otherOpt);
    }

    // wiring
    dSelect.addEventListener('change', function() {
      const v = this.value;
      otherDistrictContainer.style.display = (v === 'Other') ? 'block' : 'none';
      otherPlaceContainer.style.display = 'none';
      if (v && v !== 'Other') populateAreasForDistrict(v);
      else aSelect.innerHTML = '<option value="">Select area</option>';
    });

    aSelect.addEventListener('change', function() {
      const v = this.value;
      otherPlaceContainer.style.display = (v === 'Other') ? 'block' : 'none';
    });

    // add new district (persist globally)
    saveOtherDistrictBtn.addEventListener('click', function() {
      const val = (otherDistrictInput.value || '').trim();
      if (!val) { alert('Enter the district name'); return; }
      const custom = window.getCustomDistricts();
      if (!custom.includes(val)) {
        custom.push(val);
        window.saveCustomDistricts(custom);
      }
      buildDistrictOptions();
      dSelect.value = val;
      otherDistrictInput.value = '';
      otherDistrictContainer.style.display = 'none';
      populateAreasForDistrict(val);
      try { showToast && showToast(`Added district "${val}"`); } catch(e){}
    });

    // add new area (persist to customAreas for that district)
    saveOtherPlaceBtn.addEventListener('click', function() {
      const district = dSelect.value;
      if (!district || district === 'Other') { alert('Select a district first'); return; }
      const val = (otherPlaceInput.value || '').trim();
      if (!val) { alert('Enter the nearest place name'); return; }
      const customAreas = window.getCustomAreas();
      customAreas[district] = customAreas[district] || [];
      if (!customAreas[district].includes(val)) customAreas[district].push(val);
      window.saveCustomAreas(customAreas);
      // rebuild area dropdown and select new place
      populateAreasForDistrict(district);
      aSelect.value = val;
      otherPlaceInput.value = '';
      otherPlaceContainer.style.display = 'none';
      try { showToast && showToast(`Saved place "${val}" for ${district}`); } catch(e){}
    });

    // initial build
    buildDistrictOptions();
  } // end modal creation

  // Show modal
  loginModal.style.display = 'flex';

  // Populate fields from localStorage (every time the modal opens)
  try {
    const name = localStorage.getItem('visitorName') || '';
    const phone = localStorage.getItem('visitorPhone') || '';
    const savedDistrict = localStorage.getItem('visitorDistrict') || '';
    const savedArea = localStorage.getItem('visitorArea') || '';

    const nameEl = document.getElementById('visitorNameInput');
    const phoneEl = document.getElementById('visitorPhoneInput');
    const dSelectNow = document.getElementById('loginDistrictSelect');
    const aSelectNow = document.getElementById('loginAreaSelect');

    if (nameEl) nameEl.value = name;
    if (phoneEl) phoneEl.value = phone;

    // Set district & area after a short microtask so options exist
    setTimeout(() => {
      try {
        if (dSelectNow && savedDistrict) {
          // ensure savedDistrict option exists; if not, add to custom and rebuild
          const hasOption = Array.from(dSelectNow.options).some(o => o.value === savedDistrict);
          if (!hasOption) {
            const custom = window.getCustomDistricts();
            if (!custom.includes(savedDistrict)) { custom.push(savedDistrict); window.saveCustomDistricts(custom); }
            buildDistrictOptions();
          }
          dSelectNow.value = savedDistrict;

          // populate areas (will include customAreas if any)
          populateAreasForDistrict(savedDistrict);

          if (aSelectNow && savedArea) {
            const exists = Array.from(aSelectNow.options).some(o => o.value === savedArea);
            if (!exists) {
              // persist savedArea into customAreas and repopulate
              try {
                const obj = window.getCustomAreas();
                obj[savedDistrict] = obj[savedDistrict] || [];
                if (!obj[savedDistrict].includes(savedArea)) obj[savedDistrict].push(savedArea);
                window.saveCustomAreas(obj);
                populateAreasForDistrict(savedDistrict);
              } catch(err){}
            }
            aSelectNow.value = savedArea;
          }
        }
      } catch (err) { console.warn('prefill district/area failed', err); }
    }, 10);
  } catch (err) { console.warn('prefill login modal failed', err); }

  // form submit handler: save name, phone, district, area to localStorage
  const loginForm = document.getElementById('loginForm');
  // remove previous listener (defensive) then attach
  try { loginForm.removeEventListener && loginForm.removeEventListener('submit', window.__loginFormHandler); } catch(e){}
  window.__loginFormHandler = function(e) {
    e.preventDefault();
    try {
      const name = (document.getElementById('visitorNameInput').value || '').trim();
      const phone = (document.getElementById('visitorPhoneInput').value || '').trim();
      const district = (document.getElementById('loginDistrictSelect').value || '').trim();
      const area = (document.getElementById('loginAreaSelect').value || '').trim();

      if (phone && phone.length < 6) {
        if (!confirm('Phone looks short — save anyway?')) return;
      }

      // persist
      try {
        localStorage.setItem('visitorName', name);
        localStorage.setItem('visitorPhone', phone);
        localStorage.setItem('visitorDistrict', district);
        localStorage.setItem('visitorArea', area);
      } catch(err) { console.warn('persist visitor data failed', err); }

      // update runtime & UI
      visitorName = name;
      const profileLink = document.getElementById('profileLink');
      if (profileLink) profileLink.textContent = visitorName || (localStorage.getItem('visitorName') || 'Login');

      loginModal.style.display = 'none';
      try { showToast && showToast('Saved: name, phone and location'); } catch(e){}
    } catch (err) {
      console.warn('login save failed', err);
      alert('Save failed — check console for details.');
    }
  };
  loginForm.addEventListener('submit', window.__loginFormHandler);
}


  // Menu helpers (same)
// keep this global to remember current category between actions
window.currentMenuCategory = 'all';

// ---------- replace old setupFilterButtonsIfNeeded() with this ----------
function setupFilterDropdown() {
  const filterBtn = document.getElementById('filterBtn');
  const filterList = document.getElementById('filterList');
  const options = Array.from(document.querySelectorAll('.filter-option'));
  const filterLabel = document.getElementById('filterLabel');

  if (!filterBtn || !filterList || !options.length) return;

  // toggle dropdown
  filterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const show = !filterList.classList.contains('show');
    filterList.classList.toggle('show', show);
    filterBtn.setAttribute('aria-expanded', String(show));
  });

  // option click
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => { o.classList.remove('selected'); o.setAttribute('aria-selected','false'); });
      opt.classList.add('selected');
      opt.setAttribute('aria-selected','true');

      const category = opt.dataset.category || 'all';
      filterLabel.textContent = opt.textContent.trim();
      filterList.classList.remove('show');
      filterBtn.setAttribute('aria-expanded','false');

      // remember selection and render
      window.currentMenuCategory = category;
      displayMenuFoods(category);
    });

    // keyboard support
    opt.setAttribute('tabindex','0');
    opt.addEventListener('keydown', (e) => {
      const idx = options.indexOf(opt);
      if (e.key === 'ArrowDown') { e.preventDefault(); options[(idx + 1) % options.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); options[(idx - 1 + options.length) % options.length].focus(); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.click(); }
      if (e.key === 'Escape') { filterList.classList.remove('show'); filterBtn.setAttribute('aria-expanded','false'); filterBtn.focus(); }
    });
  });

  // close on outside click
  document.addEventListener('click', (e) => {
    if (!filterBtn.contains(e.target) && !filterList.contains(e.target)) {
      filterList.classList.remove('show');
      filterBtn.setAttribute('aria-expanded','false');
    }
  });

  // initial selection already in markup (All)
  const selected = options.find(o => o.classList.contains('selected')) || options[0];
  if (selected) {
    window.currentMenuCategory = selected.dataset.category || 'all';
    filterLabel.textContent = selected.textContent.trim();
  }
}

// ---------- helper: update visible count badge ----------
function updateVisibleCount(count) {
  const el = document.getElementById('visibleCount');
  if (!el) return;
  el.textContent = String(count);
}

// ---------- updated displayMenuFoods (replace your existing version) ----------
function displayMenuFoods(category = 'all') {
  const menuFoods = document.getElementById('menuFoods');
  if (!menuFoods) return;
  menuFoods.innerHTML = '';

  const cat = (category || 'all').toString().toLowerCase();

  function matchesCategory(food, c) {
    if (!c || c === 'all') return true;
    const fc = food.category;
    if (!fc) return false;
    if (Array.isArray(fc)) return fc.map(x => x.toString().toLowerCase()).includes(c);
    return String(fc).toLowerCase() === c;
  }

  const filtered = cat === 'all' ? foodData : foodData.filter(f => matchesCategory(f, cat));

  if (filtered.length === 0) {
    menuFoods.innerHTML = '<p style="padding:12px;">No items found for this category.</p>';
    updateVisibleCount(0);
    return;
  }

  filtered.forEach(food => {
    const card = document.createElement('div');
    card.className = 'food-card';

    // ensure card has a data-category attribute (space-separated)
    let catAttr = '';
    if (Array.isArray(food.category)) {
      catAttr = food.category.join(' ');
    } else if (food.category) {
      catAttr = String(food.category);
    }
    card.setAttribute('data-category', catAttr);

    // price text
    let priceText = '';
    if (food.sizes && food.sizes.length > 0) {
      const minPrice = Math.min(...food.sizes.map(s => s.price));
      priceText = `From $${minPrice.toFixed(2)}`;
    } else {
      priceText = `$${(food.price || 0).toFixed(2)}`;
    }

    card.innerHTML = `
      <img src="${food.image}" alt="${food.name}">
      <div class="food-info">
        <h3>${food.name}</h3>
        <p>${food.description || ''}</p>
        <span class="price">${priceText}</span>
        <button class="add-to-cart" data-id="${food.id}">Add to Cart</button>
      </div>
    `;
    menuFoods.appendChild(card);
  });

  // attach buttons & update visible count
  attachAddToCartButtons();
  updateVisibleCount(filtered.length);
}

/* ---------- render helper (used by displayMenuFoods & search) ---------- */
function renderFoodList(list) {
  const menuFoods = document.getElementById('menuFoods');
  if (!menuFoods) return;
  menuFoods.innerHTML = '';

  if (!list || list.length === 0) {
    menuFoods.innerHTML = '<p style="padding:12px;">No items found.</p>';
    updateVisibleCount(0);
    return;
  }

  list.forEach(food => {
    const card = document.createElement('div');
    card.className = 'food-card';

    let priceText = '';
    if (food.sizes && food.sizes.length > 0) {
      const minPrice = Math.min(...food.sizes.map(s => s.price));
      priceText = `From $${minPrice.toFixed(2)}`;
    } else {
      priceText = `$${(food.price || 0).toFixed(2)}`;
    }

    card.innerHTML = `
      <img src="${food.image}" alt="${food.name}">
      <div class="food-info">
        <h3>${food.name}</h3>
        <p>${food.description || ''}</p>
        <span class="price">${priceText}</span>
        <button class="add-to-cart" data-id="${food.id}">Add to Cart</button>
      </div>
    `;
    // ensure card has data-category for potential future filtering via DOM
    let catAttr = '';
    if (Array.isArray(food.category)) catAttr = food.category.join(' ');
    else if (food.category) catAttr = String(food.category);
    if (catAttr) card.setAttribute('data-category', catAttr);

    menuFoods.appendChild(card);
  });

  attachAddToCartButtons();
  updateVisibleCount(list.length);
}

/* ---------- Search bar setup (in menu header) ---------- */

function setupMenuSearch() {
  const menuHeader = document.querySelector('.menu-header');
  if (!menuHeader) return;

  // create search bar only if absent
  if (!document.getElementById('menuSearchContainer')) {
    const searchWrap = document.createElement('div');
    searchWrap.id = 'menuSearchContainer';
    searchWrap.style.margin = '18px 0';
    searchWrap.style.display = 'flex';
    searchWrap.style.gap = '8px';
    searchWrap.style.alignItems = 'center';
    searchWrap.style.flexWrap = 'wrap';

    // NOTE: Clear button removed here
    searchWrap.innerHTML = `
      <div class="menu-search" style="display:flex; gap:8px; align-items:center; flex:1;">
        <input id="menuSearchInput" type="search" placeholder="Search menu (e.g. pizza, bariis, canjeero)" style="flex:1; min-width:180px; padding:10px; border-radius:8px; border:1px solid #ddd;" />
        <button id="menuSearchBtn" class="btn-primary" style="padding:10px 14px; border-radius:8px; font-size:14px;">Search</button>
      </div>
    `;
    menuHeader.appendChild(searchWrap);

    // If filter-dropdown exists in DOM, move it into searchWrap so it sits next to the search button
    const filterDropdown = document.querySelector('.filter-dropdown');
    if (filterDropdown) {
      searchWrap.appendChild(filterDropdown);
      filterDropdown.style.margin = '0';
    }

    const input = document.getElementById('menuSearchInput');
    const btn = document.getElementById('menuSearchBtn');

    // Search by clicking button
    btn.addEventListener('click', () => {
      const q = (input.value || '').trim();
      performMenuSearch(q);
    });

    // Enter key triggers search
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = (input.value || '').trim();
        performMenuSearch(q);
      }
    });

    // When the input changes and becomes empty (user cleared using native X or backspaced),
    // restore the current dropdown category automatically.
    input.addEventListener('input', () => {
      const q = (input.value || '').trim();
      if (!q) {
        // restore display using current dropdown selection
        displayMenuFoods(window.currentMenuCategory || 'all');

        // restore dropdown visual selection (if any)
        const selected = document.querySelector('.filter-option.selected');
        if (selected) {
          const lbl = document.getElementById('filterLabel');
          if (lbl) lbl.textContent = selected.textContent.trim();
        } else {
          const lbl = document.getElementById('filterLabel');
          if (lbl) lbl.textContent = 'All Items';
        }
      }
    });
  }
}



/* ---------- perform search (case-insensitive name search) ---------- */
function performMenuSearch(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    const active = document.querySelector('.filter-btn.active');
    displayMenuFoods(active ? active.getAttribute('data-category') : 'all');
    return;
  }

  // search by name and description
  const results = foodData.filter(f => {
    const name = (f.name || '').toString().toLowerCase();
    const desc = (f.description || '').toString().toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  // visually clear filter active state (search mode)
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));

  renderFoodList(results);
}

/* ---------- Mobile menu injection & behavior (dynamically insert hamburger) ---------- */
function ensureMobileMenu() {
  const headerContainer = document.querySelector('header .container');
  if (!headerContainer) return;
  if (document.getElementById('mobileMenuBtn')) return; // already added

  // hamburger button
  const btn = document.createElement('button');
  btn.id = 'mobileMenuBtn';
  btn.setAttribute('aria-label', 'Toggle menu');
  btn.innerHTML = `
    <span class="hamburger" aria-hidden="true">
      <span></span><span></span><span></span>
    </span>
  `;
  // do NOT set inline display here (CSS controls visibility)

  // mobile admin quick button (visible only on small screens / when admin)
  const adminBtn = document.createElement('button');
  adminBtn.id = 'mobileAdminBtn';
  adminBtn.setAttribute('aria-label', 'Admin menu');
  adminBtn.innerHTML = `<i class="fa fa-user-shield"></i> <span style="font-weight:600; font-size:14px;">Admin</span>`;
  adminBtn.style.display = 'none'; // we'll toggle via updateMobileAdminVisibility()

  // mobile admin dropdown
  const adminMenu = document.createElement('div');
  adminMenu.id = 'mobileAdminMenu';
  adminMenu.innerHTML = `<div style="padding:6px;"></div>`;

  // insert hamburger and admin btn before nav
  headerContainer.insertBefore(btn, headerContainer.querySelector('nav'));
  headerContainer.insertBefore(adminBtn, headerContainer.querySelector('nav'));
  document.body.appendChild(adminMenu);

  // toggle nav open/close and animate btn
  btn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const nav = document.querySelector('nav .nav-links');
    if (!nav) return;
    nav.classList.toggle('nav-open');
    btn.classList.toggle('open');
    // hide admin menu if nav toggled
    adminMenu.classList.remove('show');
  });

  // toggle admin menu
  adminBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    adminMenu.classList.toggle('show');
  });

  // clicking outside should close panels
  document.addEventListener('click', (e) => {
    const nav = document.querySelector('nav .nav-links');
    if (nav && nav.classList.contains('nav-open')) {
      if (!e.target.closest('#mobileMenuBtn') && !e.target.closest('nav .nav-links')) {
        nav.classList.remove('nav-open');
        btn.classList.remove('open');
      }
    }
    if (adminMenu.classList.contains('show')) {
      if (!e.target.closest('#mobileAdminBtn') && !e.target.closest('#mobileAdminMenu')) {
        adminMenu.classList.remove('show');
      }
    }
  });

  // Close nav when any nav link clicked (mobile UX)
  const nav = document.querySelector('nav .nav-links');
  if (nav) {
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
        nav.classList.remove('nav-open');
        btn.classList.remove('open');
      }
    });
  }

  // helper to populate admin menu content depending on admin state
  function updateMobileAdminContent() {
    const inner = adminMenu.querySelector('div');
    if (!inner) return;
    if (isAdminSignedIn && currentAdminDoc) {
      inner.innerHTML = `
   
      `;
      const logoutBtn = document.getElementById('mobileAdminLogoutBtn');
      if (logoutBtn) logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await adminSignOutUI();
        adminMenu.classList.remove('show');
      });
    } else {
      inner.innerHTML = `
        <button id="mobileAdminLoginBtn">Admin Login</button>
      `;
      const loginBtn = document.getElementById('mobileAdminLoginBtn');
      if (loginBtn) loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openAdminLoginModal();
        adminMenu.classList.remove('show');
      });
    }
  }

  window.updateMobileAdminContent = updateMobileAdminContent;
  updateMobileAdminContent();
}


/* call this after setAdminSignedIn to sync mobile admin UI */
function updateMobileAdminVisibility() {
  const adminBtn = document.getElementById('mobileAdminBtn');
  const adminMenu = document.getElementById('mobileAdminMenu');
  if (!adminBtn) return;
  if (isAdminSignedIn) {
    adminBtn.style.display = 'inline-flex';
  } else {
    adminBtn.style.display = 'none';
    if (adminMenu) adminMenu.classList.remove('show');
  }
  // refresh menu content if helper exists
  if (typeof window.updateMobileAdminContent === 'function') window.updateMobileAdminContent();
}



  
  
  // display featured foods
function displayFeaturedFoods() {
  if (!featuredFoods) return;
  featuredFoods.innerHTML = '';
  const featuredItems = foodData.slice(0,3);
  featuredItems.forEach(food => {
    const foodCard = document.createElement('div');
    foodCard.className = 'food-card';

    // compute price text safely (if sizes exist use min price)
    let priceText = '';
    if (food.sizes && food.sizes.length > 0) {
      const minPrice = Math.min(...food.sizes.map(s => Number(s.price || 0)));
      priceText = `From $${minPrice.toFixed(2)}`;
    } else if (typeof food.price === 'number') {
      priceText = `$${food.price.toFixed(2)}`;
    } else {
      priceText = ''; // fallback blank (or text like 'Ask' if you prefer)
    }

    // ensure description exists
    const desc = food.description ? food.description : '';

    foodCard.innerHTML = `
      <img src="${food.image}" alt="${food.name}">
      <div class="food-info">
        <h3>${food.name}</h3>
        <p>${desc}</p>
        <span class="price">${priceText}</span>
        <button class="add-to-cart" data-id="${food.id}">Add to Cart</button>
      </div>
    `;
    featuredFoods.appendChild(foodCard);
  });
  attachAddToCartButtons();
}
/* ===== HEADER + MOBILE ICONS BOOTSTRAP (paste at end of script.js) ===== */


/* ---------------------------- */
/* ADMIN UI OVERRIDES (paste at end of script.js) */
/* ---------------------------- */




  
  
  document.addEventListener('DOMContentLoaded', function() {
    loadCartFromLocalStorage();
    displayFeaturedFoods();
    updateCartUI();
    refreshOrderBell();
  
    // setup event listeners
    if (cartLink) cartLink.addEventListener('click', e => { e.preventDefault(); openCart(); });
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartModal);
    if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);
  
    // add Order History link to nav
    addOrderHistoryNav();
  
    // setup header UI
    setupHeaderUI();
  
    // restore admin session on refresh
try {
  if (localStorage.getItem('adminSigned') === '1') {
    const savedAdmin = JSON.parse(localStorage.getItem('adminDoc') || '{}');
    if (savedAdmin && Object.keys(savedAdmin).length) {
      setAdminSignedIn(savedAdmin);
    }
  }
} catch (e) {
  console.warn('Failed to restore admin session', e);
}


    // setup menu filters if any
// setup menu filters (dropdown)
setupFilterDropdown();
  
    // setup search bar in the menu header
    setupMenuSearch();
  
    // inject mobile menu button and wiring
    ensureMobileMenu();
  
    // Render initial menu using the active filter if present (fixes "All" not rendering first time)
// render initial menu using dropdown selection (or default 'all')
displayMenuFoods(window.currentMenuCategory || 'all');

    
  });
  
  

