now it looks better please i want to add for the admin sde please for if client paid or not if he said i will pay for delivery please appear also if he say i paid please make it appear for that please  appear please please and please make that please please also please for the client in order please please appear everytime please for like if still pending please make it pending if it delivered make deilvered if it denied denied if it confirmed confirmed please so please make like that please please also for delivered please please add new status please loweest for deinid , next pending next please here add for next statues like if he paid money like if he say like i paid notify me  like so we want to answere please to see we see his money and his order please so add new statuse please ,next  delivered and last for confimed so please add for the cliend side for the local storage for delivery and percentage please for motocyle please so when we delivered please we delivered please also please add for big and big real location cliend please to see his real location please please this feature add please and also cliend local storage he will see for the location of the delivery motocycle please on map also for the motoctcyle dleiery man can see his and the cliend also for the cliend same please please and please make like this please :so plese for the delivery we just sent for the link it so when this link open he will allow to open location then he will his real location now and the cliend he will delivery please his location please and client name and for number and total please money please and for locatin already submit please:




    function showOrderView(order) {
  if (!order) return;
  orderViewTitle.textContent = `Order # ${order.id}`;
  const created = order.createdAt && order.createdAt.seconds ? new Date(order.createdAt.seconds*1000).toLocaleString() : (order.timestamp ? new Date(order.timestamp).toLocaleString() : '');
  orderViewSub.textContent = `${created} • ${ (order.status || order.paymentStatus || 'pending').toUpperCase() }`;

  // build items list with size & extras
  const itemsListHtml = (order.items || []).map(it => {
    const sizeHtml = it.sizeName ? `<span style="color:#333; font-weight:600;">Size: ${escapeHtml(it.sizeName)}</span>` : '';
    const extrasHtml = (it.extras && it.extras.length) ? `<div style="font-size:13px; color:#555; margin-top:4px;">Extras: ${it.extras.map(e => escapeHtml(e.name)).join(', ')}</div>` : '';
    return `<li style="margin-bottom:8px;">
              <div><strong>${escapeHtml(it.name)}</strong> &nbsp; x ${it.quantity} &nbsp; — &nbsp; $${(it.price * it.quantity).toFixed(2)}</div>
              <div style="margin-top:4px;">${sizeHtml}${extrasHtml}</div>
            </li>`;
  }).join('');

  orderViewBody.innerHTML = `
    <div><strong>Customer:</strong> ${escapeHtml(order.visitorName || 'Guest')} • ${escapeHtml(order.phone || '')}</div>
    <div style="margin-top:6px;"><strong>Address:</strong> ${escapeHtml(order.district || '')} / ${escapeHtml(order.area || '')} ${order.otherPlace ? ' - ' + escapeHtml(order.otherPlace) : ''}</div>
    <hr />
    <div><strong>Items</strong></div>
    <ul class="order-items" style="margin-top:8px; padding-left:18px;">
      ${itemsListHtml || '<li>No items</li>'}
    </ul>
    <div style="margin-top:8px;"><strong>Total:</strong> $${(order.total || 0).toFixed(2)}</div>
    <div style="margin-top:8px;"><strong>Notes:</strong> ${escapeHtml(order.note || '')}</div>
  `;

  // Footer actions
  orderViewFooter.innerHTML = `
    <button class="btn-small" id="viewConfirmBtn">Confirm</button>
    <button class="btn-small" id="viewDeliveredBtn">Delivered</button>
    <button class="btn-small" id="viewDenyBtn">Deny</button>
    <button class="btn-small" id="viewDeleteBtn">Delete</button>
  `;
// attach actions (overwrite any previous handlers)
document.getElementById('viewConfirmBtn').onclick = () => changeStatusWithConfirm(order.id, 'confirmed');
document.getElementById('viewDeliveredBtn').onclick = () => changeStatusWithConfirm(order.id, 'delivered');
document.getElementById('viewDenyBtn').onclick = () => changeStatusWithConfirm(order.id, 'denied');
document.getElementById('viewDeleteBtn').onclick = () => { if (confirm(`Delete order ${order.id} permanently?`)) deleteOrderCompletely(order.id); };




  orderViewModal.style.display = 'flex';
  orderViewModal.setAttribute('aria-hidden', 'false');
}

    function hideOrderView() {
      orderViewModal.style.display = 'none';
      orderViewModal.setAttribute('aria-hidden', 'true');
    }

    function escapeHtml(s) {
      if (!s && s !== 0) return '';
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    async function changeStatusWithConfirm(orderId, newStatus) {
  // create tracking sets if missing
  if (!window._confirmingOrders) window._confirmingOrders = new Set();
  if (!window._updatingOrders) window._updatingOrders = new Set();

  // prevent duplicate confirm dialogs / re-entrancy
  if (window._confirmingOrders.has(orderId)) {
    showToast('Action already in progress for this order');
    return;
  }
  window._confirmingOrders.add(orderId);

  try {
    // find local order and current status
    const ord = ordersCache.find(x => String(x.id || x.localId || '') === String(orderId));
    const currentStatus = (ord && (ord.status || ord.paymentStatus)) ? String((ord.status || ord.paymentStatus)).toLowerCase() : 'pending';

    // if already same status, skip and inform
    if (currentStatus === newStatus) {
      showToast(`Order already ${newStatus}`);
      return;
    }

    // prevent repeated update if one already running for this order
    if (window._updatingOrders.has(orderId)) {
      showToast('Update already running for this order');
      return;
    }

    // single confirm prompt (will only run if not already confirming)
    const ok = confirm(`Change order ${orderId} to status "${newStatus}"?`);
    if (!ok) return;

    // mark updating
    window._updatingOrders.add(orderId);

    // call optimistic updater (will update UI quickly)
    const res = await updateOrderStatusOptimistic(orderId, newStatus);

    // handle result
    if (!res || !res.success) {
      // if skipped because already equal, applyFilters to be safe
      if (res && res.skipped) {
        showToast('No change needed');
        return;
      }
      // failure
      alert('Failed to update status');
      return;
    }

    // success path: reflect change in local cache (if helper returned updated doc, merge it)
    if (res.updatedOrder) {
      const idx = ordersCache.findIndex(x => String(x.id || x.localId || '') === String(orderId));
      if (idx !== -1) ordersCache[idx] = { ...ordersCache[idx], ...res.updatedOrder };
    } else {
      // best-effort: set status locally for UI consistency
      const idx = ordersCache.findIndex(x => String(x.id || x.localId || '') === String(orderId));
      if (idx !== -1) {
        ordersCache[idx].status = newStatus;
      }
    }

// map newStatus to toast type
const toastType = (newStatus === 'confirmed') ? 'confirmed'
                : (newStatus === 'delivered')  ? 'delivered'
                : (newStatus === 'denied')     ? 'denied'
                : 'info';
showToast(`Order ${orderId} set to ${newStatus}`, 2200, toastType);
    applyFiltersAndRender();

    // close modal if it's open for this order
    if (orderViewModal && orderViewModal.style.display === 'flex') {
      // if modal is showing the same order, hide it (safe)
      try {
        const shownId = orderViewTitle && orderViewTitle.textContent ? (orderViewTitle.textContent.match(/#\s*(\S+)/) || [])[1] : null;
        if (!shownId || String(shownId) === String(orderId)) hideOrderView();
      } catch (e) { hideOrderView(); }
    }
  } finally {
    // cleanup locks
    window._confirmingOrders.delete(orderId);
    window._updatingOrders.delete(orderId);
  }
}
// Replace old showToast with this version

    // ---------- Period filtering helpers ----------
    // returns timestamp in ms for an order (createdAt.seconds or timestamp string)
    function orderTimestampMs(o) {
      if (!o) return 0;
      if (o.createdAt && o.createdAt.seconds) return o.createdAt.seconds * 1000;
      if (o.timestamp) {
        const t = Date.parse(o.timestamp);
        if (!isNaN(t)) return t;
      }
      // fallback: use now (shouldn't happen)
      return Date.now();
    }



    // ---------- Main filtering & rendering ----------
    // filters ordersCache by period/status/search and then renders + updates totals
    function applyFiltersAndRender() {
  const q = (searchInput.value || '').trim().toLowerCase();
  const status = statusFilter ? statusFilter.value : 'all';
  const period = periodSelect ? periodSelect.value || 'today' : 'today';

  // first filter by period
  let filtered = (ordersCache || []).filter(o => isInPeriod(o, period));

  // status filter
  if (status !== 'all') filtered = filtered.filter(o => ((o.status || 'pending') === status));

  // search across visitorName, phone, id, district (within the period)
  if (q) {
    filtered = filtered.filter(o => {
      const s = `${o.visitorName||''} ${o.phone||''} ${o.id||''} ${o.district||''}`.toLowerCase();
      return s.includes(q);
    });
  }

  // update totals based on filtered set
  updateTotals(filtered);

  // render empty-state
  if (!filtered || filtered.length === 0) {
    ordersList.innerHTML = '<div style="padding:12px">No orders found for selected filters.</div>';
    return;
  }

  // helper: decide which action buttons to show
  function actionButtonsHtml(id, statusText) {
    let html = '';
    if (statusText === 'pending') {
      html += `<button class="btn-small" data-action="confirm" data-id="${id}">Confirm</button>`;
      html += `<button class="btn-small" data-action="delivered" data-id="${id}">Delivered</button>`;
      html += `<button class="btn-small" data-action="deny" data-id="${id}">Deny</button>`;
    } else if (statusText === 'confirmed') {
      html += `<button class="btn-small" data-action="delivered" data-id="${id}">Delivered</button>`;
      html += `<button class="btn-small" data-action="unconfirm" data-id="${id}">Unconfirm</button>`;
    } else if (statusText === 'delivered') {
      html += `<button class="btn-small" data-action="undeliver" data-id="${id}">Mark pending</button>`;
    } else if (statusText === 'denied') {
      html += `<button class="btn-small" data-action="restore" data-id="${id}">Mark pending</button>`;
    } else {
      html += `<button class="btn-small" data-action="confirm" data-id="${id}">Confirm</button>`;
    }
    // view & delete always available
    html += `<button class="btn-small" data-action="view" data-id="${id}">View</button>`;
    html += `<button class="btn-small" data-action="delete" data-id="${id}">Delete</button>`;
    return html;
  }

  // render markup
  ordersList.innerHTML = filtered.map(o => {
    const statusText = (o.status || o.paymentStatus || 'pending').toLowerCase();
    const created = o.createdAt && o.createdAt.seconds ? new Date(o.createdAt.seconds*1000).toLocaleString() : (o.timestamp ? new Date(o.timestamp).toLocaleString() : '');
    const itemsSummary = (o.items||[]).map(it => {
      let s = `${escapeHtml(it.name)}`;
      if (it.sizeName) s += ` (${escapeHtml(it.sizeName)})`;
      if (it.extras && it.extras.length) s += ` [${it.extras.map(e => escapeHtml(e.name)).join(', ')}]`;
      s += ` x ${it.quantity}`;
      return s;
    }).join(', ');

    return `
      <div class="order" data-id="${o.id || o.localId || ''}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${escapeHtml(o.visitorName || 'Guest')}</strong> • <small>${escapeHtml(o.phone || '')}</small><br>
            <small>${escapeHtml(o.district || '')} / ${escapeHtml(o.area || '')} ${o.otherPlace? ' - ' + escapeHtml(o.otherPlace) : ''}</small><br>
            <small>${escapeHtml(created)}</small>
          </div>
          <div style="text-align:right;">
            <div style="margin-bottom:8px;">
              <span class="status-pill ${statusText==='pending'?'status-pending':''} ${statusText==='confirmed'?'status-confirmed':''} ${statusText==='denied'?'status-denied':''} ${statusText==='delivered'?'status-delivered':''}">
                ${statusText.toUpperCase()}
              </span>
            </div>
            <div>
              <strong>$${(o.total || 0).toFixed(2)}</strong>
            </div>
          </div>
        </div>
        <div style="margin-top:8px;">
          <small>${escapeHtml(itemsSummary)}</small>
        </div>
        <div style="margin-top:8px; text-align:right;">
          ${actionButtonsHtml(o.id || o.localId || '', statusText)}
        </div>
      </div>
    `;
  }).join('');

  // ensure single delegated listener (attach only once)
  if (!ordersList.__delegateAttached) {
    ordersList.__delegateAttached = true;

    ordersList.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');

      // find order by id
      const ord = ordersCache.find(x => String(x.id || x.localId || '') === String(id));

      // view
      if (action === 'view') { if (ord) showOrderView(ord); return; }

      // delete
      if (action === 'delete') {
        if (!confirm(`Delete order ${id} permanently?`)) return;
        await deleteOrderCompletely(id);
        return;
      }

      // map aliases to canonical statuses
      const aliasToStatus = {
        confirm: 'confirmed',
        delivered: 'delivered',
        deny: 'denied',
        unconfirm: 'pending',
        undeliver: 'pending',
        restore: 'pending'
      };
      const desired = aliasToStatus[action];
      if (!desired) return; // unknown action

      // use centralized function to handle confirm & update
      await changeStatusWithConfirm(id, desired);
    });
  }
}


   
    // ---------- DB / auth / listener logic (unchanged behavior) ----------
    function waitForFirebaseDB(ms = 3000) {
      return new Promise((resolve) => {
        if (window.FirebaseDB) return resolve(true);
        const interval = 100;
        let waited = 0;
        const id = setInterval(() => {
          waited += interval;
          if (window.FirebaseDB) {
            clearInterval(id);
            return resolve(true);
          }
          if (waited >= ms) {
            clearInterval(id);
            return resolve(false);
          }
        }, interval);
      });
    }

    async function startOrdersListener() {
  // stop any previous unsub
  if (unsubOrders) { try { unsubOrders(); } catch(e){} unsubOrders = null; }

  // If admin explicitly wants realtime, keep old behavior (optional)
  // Default behavior: paginated reads (Spark friendly)
  // Wait for FirebaseDB
  const ready = await waitForFirebaseDB(4000);
  if (!ready || !window.FirebaseDB) {
    console.warn('Database helper not ready — attempting limited fetch');
    ordersList.innerHTML = '<div style="padding:12px;">Attempting to load orders...</div>';
    // limited fallback: load first page if available
    if (window.FirebaseDB && typeof window.FirebaseDB.listOrdersPage === 'function') {
      try { await fetchFirstOrdersPage(); return; } catch(e){ console.warn('fallback page fetch failed', e); }
    }
    ordersList.innerHTML = '<div style="padding:12px;">Realtime not available</div>';
    return;
  }

  // If caller wants realtime for recent orders, and helper exists, use it
  if (typeof window.FirebaseDB.onOrdersSnapshot === 'function' && window.useRealtime === true) {
    try {
      // subscribe to a limited snapshot (your DB helper limits by default)
      unsubOrders = window.FirebaseDB.onOrdersSnapshot((orders) => {
        // replace cache with recent snapshot
        ordersCache = orders || [];
        // reset pagination (we show recent only)
        window.nextCursor = null;
        window.allPagesLoaded = false;
        applyFiltersAndRender();
      });
      return;
    } catch (e) {
      console.warn('Realtime subscription failed, falling back to paginated fetch', e);
      // fall-through to pagination
    }
  }

  // default: paginated reads (safe for Spark free)
  await fetchFirstOrdersPage();
}


// ---------- PAGINATION HELPERS (add after startOrdersListener) ----------
window.nextCursor = null;        // doc id cursor (global-ish)
window.allPagesLoaded = false;
let isLoadingOrders = false;
let pageSize = 5;               // adjust 20-100 depending on needs

function ensureLoadMoreButton() {
  if (document.getElementById('loadMoreOrdersBtn')) return;
  const node = document.createElement('div');
  node.style.textAlign = 'center';
  node.style.padding = '12px';
  node.innerHTML = `<button id="loadMoreOrdersBtn" class="btn-small">Load more</button>`;
  ordersList.parentNode.insertBefore(node, ordersList.nextSibling);
  const btn = document.getElementById('loadMoreOrdersBtn');
  btn.addEventListener('click', () => fetchNextOrdersPage());
  // optional: infinite scroll trigger
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(ent => {
        if (ent.isIntersecting && !isLoadingOrders && !window.allPagesLoaded) fetchNextOrdersPage();
      });
    }, { root: null, rootMargin: '200px' });
    obs.observe(btn);
  }
}

async function fetchFirstOrdersPage({ limit = pageSize } = {}) {
  ordersCache = [];
  window.nextCursor = null;
  window.allPagesLoaded = false;
  ensureLoadMoreButton();
  return fetchNextOrdersPage({ limit });
}

async function fetchNextOrdersPage({ limit = pageSize } = {}) {
  if (isLoadingOrders || window.allPagesLoaded) return;
  isLoadingOrders = true;
  const btn = document.getElementById('loadMoreOrdersBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }

  try {
    if (!window.FirebaseDB || typeof window.FirebaseDB.listOrdersPage !== 'function') {
  // No paginated helper available — avoid expensive full-collection reads on Spark.
  ordersList.innerHTML = '<div style="padding:12px;">Orders not available</div>';
  return;
}

    const res = await window.FirebaseDB.listOrdersPage({ limit, startAfterId: window.nextCursor });
    if (!res || !res.success) { console.warn('listOrdersPage failed', res && res.error); return; }

    const page = res.orders || [];
    ordersCache = ordersCache.concat(page);
    // update cursor and allPagesLoaded flag
    window.nextCursor = res.nextCursor || null;
    if (!window.nextCursor || page.length < limit) window.allPagesLoaded = true;
    applyFiltersAndRender();
  } catch (err) {
    console.error('fetchNextOrdersPage error', err);
  } finally {
    isLoadingOrders = false;
    if (btn) {
      btn.disabled = window.allPagesLoaded;
      btn.textContent = window.allPagesLoaded ? 'All loaded' : 'Load more';
    }
  }
}

// optimistic update helper (update UI immediately, then send remote update)
async function updateOrderStatusOptimistic(orderId, newStatus) {
  const idx = ordersCache.findIndex(x => String(x.id || x.localId || '') === String(orderId));
  const prev = idx !== -1 ? ordersCache[idx].status : null;
  // if (idx !== -1) { ordersCache[idx].status = newStatus; applyFiltersAndRender(); }

  if (idx !== -1 && ordersCache[idx].status === newStatus) {
  return { success: true, skipped: true };
}

  // update localStorage (visitor)
  try {
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const li = localOrders.findIndex(lo => String(lo.localId || lo.remoteId || '') === String(orderId) || String(lo.id || '') === String(orderId));
    if (li !== -1) { localOrders[li].status = newStatus; localStorage.setItem('orders', JSON.stringify(localOrders)); }
  } catch(e){}

  if (!window.FirebaseDB || typeof window.FirebaseDB.updateOrderStatus !== 'function') {
    showToast('Saved locally (no server helper)');
    return { success: true, localOnly: true };
  }

  try {
    const res = await window.FirebaseDB.updateOrderStatus(orderId, newStatus);
    if (!res.success && idx !== -1) { ordersCache[idx].status = prev; applyFiltersAndRender(); }
    return res;
  } catch (err) {
    if (idx !== -1) { ordersCache[idx].status = prev; applyFiltersAndRender(); }
    return { success: false, error: err };
  }
}

// optional: enable a limited realtime (admin toggle)
async function enableRealtimeRecent(limit = 10) {
  if (!window.FirebaseDB || typeof window.FirebaseDB.onOrdersSnapshot !== 'function') {
    return alert('Realtime not available');
  }
  // set global flag used in startOrdersListener
  window.useRealtime = true;
  // unsub any paginated listeners if you had
  if (unsubOrders) { try { unsubOrders(); } catch(e){} unsubOrders = null; }
  unsubOrders = window.FirebaseDB.onOrdersSnapshot(list => {
    ordersCache = list || [];
    window.nextCursor = null;
    window.allPagesLoaded = false;
    applyFiltersAndRender();
  }, { limit });
  showToast('Realtime (recent) enabled');
}


   
    // small helper: if orders don't show due to realtime issues, allow refresh button to force fetch
    async function tryFetchOrdersOnce() {
// Prefer safe paginated fetch — avoid listAllOrders()
if (!window.FirebaseDB || typeof window.FirebaseDB.listOrdersPage !== 'function') {
  ordersList.innerHTML = '<div style="padding:12px;">Orders not available</div>';
  return;
}
ordersList.innerHTML = '<div style="padding:12px">Loading orders...</div>';
// Use paginated first page (safe)
try {
  await fetchFirstOrdersPage();
} catch (err) {
  console.error('tryFetchOrdersOnce error', err);
  ordersList.innerHTML = '<div style="padding:12px;">Realtime not available</div>';
}

    }

    

  
function getCurrentlyFilteredOrders() {
  const q = (searchInput.value || '').trim().toLowerCase();
  const status = statusFilter.value;
  const period = periodSelect.value || 'today';

  return ordersCache.filter(o => {
    if (!isInPeriod(o, period)) return false;
    if (status !== 'all' && (o.status || 'pending') !== status) return false;
    if (q) {
      const s = `${o.visitorName||''} ${o.phone||''} ${o.id||''} ${o.district||''}`.toLowerCase();
      if (!s.includes(q)) return false;
    }
    return true;
  });
}


    // wire up filters: period/status/search -> applyFiltersAndRender
    document.addEventListener('DOMContentLoaded', () => {
      // default period is 'today' (already set in HTML)
      periodSelect.value = 'today';
      searchInput.addEventListener('input', () => setTimeout(applyFiltersAndRender, 200));
      statusFilter.addEventListener('change', applyFiltersAndRender);
      periodSelect.addEventListener('change', applyFiltersAndRender);

      // initial attempt to render if orders already present
      if (ordersCache && ordersCache.length) applyFiltersAndRender();
    });



    and also here is for scrip.js for orders please:

      
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
  
  // DOM: admin controls in header (create if missing)
  function ensureAdminControls() {
    const nav = document.querySelector('nav .nav-links');
    if (!nav) return;
  
    // Admin Login button
    if (!document.getElementById('adminLoginBtn')) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#" id="adminLoginBtn">Admin Login</a>`;
      nav.appendChild(li);
      document.getElementById('adminLoginBtn').addEventListener('click', (e) => {
        e.preventDefault();
        openAdminLoginModal();
      });
    }
  
    // Admin link (visible only for admin)
    if (!document.getElementById('adminLink')) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#" id="adminLink" style="display:none;">Admin</a>`;
      nav.appendChild(li);
    }
  
    // Admin Profile / Logout placeholder (click opens admin page)
    if (!document.getElementById('adminProfileLink')) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#" id="adminProfileLink" style="display:none;">Admin</a>`;
      nav.appendChild(li);
      document.getElementById('adminProfileLink').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'admin.html';
      });
    }
  
    // Admin-only bell (hidden by default)
    if (!document.getElementById('orderBell')) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#" id="orderBell" style="display:none;"><i class="fa fa-bell"></i> <span id="orderBellCount" class="cart-count">0</span></a>`;
      nav.appendChild(li);
      document.getElementById('orderBell').addEventListener('click', (e) => {
        e.preventDefault();
        if (isAdminSignedIn) window.location.href = 'admin.html';
      });
    }
  }
  ensureAdminControls();
  

  
  // setup header handlers (call once)
  function setupHeaderUI() {
    const orderHistoryLink = document.getElementById('orderHistoryLink');
    if (orderHistoryLink) orderHistoryLink.addEventListener('click', (e) => { e.preventDefault(); openOrderHistory(); });
  
    const profileLink = document.getElementById('profileLink');
    if (profileLink) profileLink.addEventListener('click', (e) => { e.preventDefault(); openLoginModal(); });
    if (profileLink) profileLink.textContent = visitorName || 'Login';
  
    const adminLink = document.getElementById('adminLink');
    if (adminLink) adminLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (isAdminSignedIn) window.location.href = 'admin.html';
      else openAdminLoginModal();
    });
  
    const orderBell = document.getElementById('orderBell');
    if (orderBell) orderBell.addEventListener('click', (e) => {
      e.preventDefault();
      if (isAdminSignedIn) window.location.href = 'admin.html';
    });
  }
  
  // Attempt to rehydrate admin state from localStorage right away (fast UX)
  function tryRehydrateAdminFromLocal() {
    try {
      const signed = localStorage.getItem('adminSigned');
      const doc = localStorage.getItem('adminDoc');
      if (signed && doc) {
        const adm = JSON.parse(doc);
        // basic sanity: require an email field
        if (adm && adm.email) {
          setAdminSignedIn(adm);
        }
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
  


  
 
  
  function openCart(){ if (cartModal) cartModal.style.display = 'flex'; }
  function closeCartModal(){ if (cartModal) cartModal.style.display = 'none'; }
  
  function saveCartToLocalStorage() { localStorage.setItem('cart', JSON.stringify(cart)); }
  function loadCartFromLocalStorage() { const saved = localStorage.getItem('cart'); if (saved) cart = JSON.parse(saved); }
  
  // Checkout / order-history functions kept the same (only ensure refreshOrderBell called where appropriate)

  
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
                  <button id="copyUssdBtn" class="btn-small">Copy</button>
                  <a id="dialUssdBtn" class="btn-small" style="text-decoration:none; display:inline-block;">Dial</a>
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
  
      // "I've Paid — Notify" handler (mark local order paid + optional server notify)
      document.getElementById('paidNotifyBtn').addEventListener('click', async function() {
        try {
          const orders = JSON.parse(localStorage.getItem('orders') || '[]');
          const idx = orders.findIndex(o => (order.localId && o.localId === order.localId) || (order.remoteId && o.remoteId === order.remoteId));
          if (idx !== -1) {
            orders[idx].paymentStatus = 'paid';
            orders[idx].status = 'pending';
            orders[idx].visitorName = orders[idx].visitorName || (localStorage.getItem('visitorName') || order.visitorName || '');
            orders[idx].phone = orders[idx].phone || (localStorage.getItem('visitorPhone') || order.phone || '');
            localStorage.setItem('orders', JSON.stringify(orders));
          }
        } catch (err) { console.warn('update local order paid failed', err); }
  
        if (window.FirebaseDB && typeof window.FirebaseDB.notifyPayment === 'function') {
          try {
            await window.FirebaseDB.notifyPayment(order.remoteId || order.localId || null, { paid: true });
          } catch(e){ /* ignore */ }
        }
  
        const name = (order && (order.visitorName || localStorage.getItem('visitorName'))) || 'Customer';
        showToast(`Thanks, ${name}! We've marked your payment — we'll check and confirm.`);
        payModal.style.display = 'none';
        refreshOrderBell();
        refreshVisitorOrderHistoryUI();
      });
  
      // "I'll pay on delivery" (COD)
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
  
        if (window.FirebaseDB && typeof window.FirebaseDB.notifyPayment === 'function') {
          try {
            await window.FirebaseDB.notifyPayment(order.remoteId || order.localId || null, { paid: false, method: 'cod' });
          } catch(e){ /* ignore */ }
        }
  
        const name = (order && (order.visitorName || localStorage.getItem('visitorName'))) || 'Customer';
        showToast(`Thanks, ${name}! We'll collect payment on delivery.`);
        payModal.style.display = 'none';
        refreshOrderBell();
        refreshVisitorOrderHistoryUI();
      });
  
    } // end create modal
  
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