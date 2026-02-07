

// admin.html — restore admin session BEFORE anything else
(function restoreAdminSession() {
try {
const signed = localStorage.getItem('adminSigned');
const doc = localStorage.getItem('adminDoc');

if (signed === '1' && doc) {
  const admin = JSON.parse(doc);

  if (admin && admin.email) {
    // IMPORTANT: reuse the SAME function
    setAdminSignedIn(admin);
  } else {
    // corrupted data → force logout
    localStorage.removeItem('adminSigned');
    localStorage.removeItem('adminDoc');
  }
}
} catch (e) {
console.warn('Admin restore failed', e);
}
})();

// ADMIN PAGE SCRIPT (updated with period filters & totals)
let unsubOrders = null;
let ordersCache = [];
let currentAdmin = null;

// UI refs
const ordersList = document.getElementById('ordersList');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const refreshBtn = document.getElementById('refreshBtn');
const adminInfo = document.getElementById('adminInfo');
const openProfileBtn = document.getElementById('openProfileBtn');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

const periodSelect = document.getElementById('periodSelect');
const totAll = document.getElementById('totAll');
const totConfirmed = document.getElementById('totConfirmed');
const totDelivered = document.getElementById('totDelivered');
const totMoney = document.getElementById('totMoney');

const orderViewModal = document.getElementById('orderViewModal');
const orderViewBody = document.getElementById('orderViewBody');
const orderViewFooter = document.getElementById('orderViewFooter');
const orderViewTitle = document.getElementById('orderViewTitle');
const orderViewSub = document.getElementById('orderViewSub');
const closeOrderView = document.getElementById('closeOrderView');

closeOrderView.addEventListener('click', () => { hideOrderView(); });
orderViewModal.addEventListener('click', (e) => { if (e.target === orderViewModal) hideOrderView(); });

// ================= CONTACTS ADMIN (modal + realtime + search + unread + delete) =================
let contactsCache = [];
let unsubContacts = null;
let contactModalEl = null;
let contactDetailModalEl = null;

const contactsTabBtn = document.getElementById('contactsTab');
const contactsUnreadBadge = document.getElementById('contactsUnread');
const contactsRefreshBtn = document.getElementById('contactsRefreshBtn');

// Build / ensure the contact list modal
function ensureContactModal() {
if (contactModalEl) return contactModalEl;
const modal = document.createElement('div');
modal.id = 'contactModal';
modal.className = 'modal-backdrop';
modal.style.display = 'none';
modal.innerHTML = `
<div class="modal" role="dialog" aria-modal="true" style="max-width:820px;">
  <div class="modal-header">
    <div><h3>Contacts</h3><small id="contactModalSub"></small></div>
    <div><button id="closeContactModal" class="btn-small">Close</button></div>
  </div>
  <div class="modal-body" style="padding:16px;">
    <div style="display:flex; gap:12px; flex-direction:column;">
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
        <input id="contactModalSearch" placeholder="Search name / phone / email" class="search-input" style="flex:1;" />
        <button id="contactModalRefresh" class="btn-small">Refresh</button>
      </div>
      <div id="contactsListModal" style="max-height:60vh; overflow:auto;"></div>
    </div>
  </div>
  <div class="modal-footer">
    <small class="small-note">Messages newest first.</small>
  </div>
</div>
`;
document.body.appendChild(modal);

document.getElementById('closeContactModal').addEventListener('click', () => { modal.style.display = 'none'; });
document.getElementById('contactModalRefresh').addEventListener('click', async () => { await manualContactsRefresh(); });

document.getElementById('contactModalSearch').addEventListener('input', () => {
const q = document.getElementById('contactModalSearch').value.trim().toLowerCase();
const filtered = contactsCache.filter(c => {
  const s = `${c.name||''} ${c.phone||''} ${c.email||''} ${c.message||''}`.toLowerCase();
  return s.includes(q);
});
renderContactsList(filtered);
});

contactModalEl = modal;
return modal;
}

// Build / ensure the contact detail modal (full screen on mobile)
function ensureContactDetailModal() {
if (contactDetailModalEl) return contactDetailModalEl;
const m = document.createElement('div');
m.id = 'contactDetailModal';
m.className = 'modal-backdrop';
m.style.display = 'none';
m.innerHTML = `
<div class="modal" role="dialog" aria-modal="true" style="max-width:720px;">
  <div class="modal-header">
    <div><h3 id="contactDetailTitle">Message</h3><small id="contactDetailWhen"></small></div>
    <div><button id="closeContactDetail" class="btn-small">Close</button></div>
  </div>
  <div class="modal-body" id="contactDetailBody" style="padding:16px; max-height:70vh; overflow:auto;"></div>
  <div class="modal-footer" id="contactDetailFooter"></div>
</div>
`;
document.body.appendChild(m);
document.getElementById('closeContactDetail').addEventListener('click', () => { m.style.display = 'none'; });
contactDetailModalEl = m;
return m;
}

// render contacts list inside modal
function renderContactsList(list) {
const container = document.getElementById('contactsListModal');
if (!container) return;
if (!list || list.length === 0) { container.innerHTML = '<p>No messages</p>'; return; }

container.innerHTML = list.map(c => {
const when = c.createdAt && c.createdAt.seconds ? new Date(c.createdAt.seconds * 1000).toLocaleString() : '';
return `
  <div class="order ${c.read ? '' : 'status-pending'}" data-id="${c.id}" style="padding:10px; margin-bottom:8px;">
    <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
      <div style="flex:1;">
        <strong>${escapeHtml(c.name||'')}</strong>
        <div style="font-size:13px; color:#666; margin-top:4px;">${escapeHtml(c.phone||'')} • ${escapeHtml(c.email||'')}</div>
        <div style="margin-top:8px; color:#333;">${escapeHtml((c.message||'').slice(0,220))}${(c.message && c.message.length>220)?'...':''}</div>
      </div>
      <div style="min-width:120px; text-align:right;">
        <div style="font-size:12px; color:#666;">${escapeHtml(when)}</div>
        <div style="margin-top:8px; display:flex; gap:6px; justify-content:flex-end;">
          ${c.read ? '' : `<button class="btn-small markReadInline" data-id="${c.id}">Mark read</button>`}
          <button class="btn-small viewContactBtn" data-id="${c.id}">View</button>
          <button class="btn-small deleteContactBtn" data-id="${c.id}" title="Delete"><i class="fa fa-trash"></i></button>
        </div>
      </div>
    </div>
  </div>
`;
}).join('');

// wire actions
container.querySelectorAll('.viewContactBtn').forEach(b=>{
b.onclick = async () => {
  const id = b.dataset.id;
  const contact = contactsCache.find(x => x.id === id);
  if (!contact) return;
  openContactDetail(contact);
  // mark read
  if (contact.read !== true && window.FirebaseDB && typeof window.FirebaseDB.markContactRead === 'function') {
    await window.FirebaseDB.markContactRead(id);
    contact.read = true;
    updateUnreadBadgeCount();
    renderContactsList(contactsCache);
  }
};
});

container.querySelectorAll('.markReadInline').forEach(b=>{
b.onclick = async (ev) => {
  const id = b.dataset.id;
  if (window.FirebaseDB && typeof window.FirebaseDB.markContactRead === 'function') {
    await window.FirebaseDB.markContactRead(id);
    const c = contactsCache.find(x => x.id === id);
    if (c) c.read = true;
    updateUnreadBadgeCount();
    renderContactsList(contactsCache);
  }
};
});

container.querySelectorAll('.deleteContactBtn').forEach(b=>{
b.onclick = async (ev) => {
  ev.stopPropagation();
  const id = b.dataset.id;
  if (!confirm('Delete this contact message permanently?')) return;
  if (!window.FirebaseDB || typeof window.FirebaseDB.deleteContact !== 'function') { alert('Delete not available'); return; }
  const res = await window.FirebaseDB.deleteContact(id);
  if (res && res.success) {
    // remove from local cache and rerender
    contactsCache = contactsCache.filter(x => x.id !== id);
    updateUnreadBadgeCount();
    renderContactsList(contactsCache);
    showToast1('Contact deleted');
  } else {
    alert('Delete failed');
  }
};
});
}

// Open the detailed modal (full-screen friendly) for a contact
function openContactDetail(contact) {
const modal = ensureContactDetailModal();
const when = contact.createdAt && contact.createdAt.seconds ? new Date(contact.createdAt.seconds * 1000).toLocaleString() : '';
document.getElementById('contactDetailTitle').textContent = contact.name || 'Message';
document.getElementById('contactDetailWhen').textContent = when;
document.getElementById('contactDetailBody').innerHTML = `
<div style="font-size:13px; color:#666;">${escapeHtml(contact.email||'')} • ${escapeHtml(contact.phone||'')}</div>
<div style="margin-top:12px; font-size:14px; color:#222;">${escapeHtml(contact.message||'')}</div>
<hr/>
<div style="font-size:13px; color:#666;">Location hint: ${escapeHtml(contact.locationHint||'')}</div>
`;
const footer = document.getElementById('contactDetailFooter');
footer.innerHTML = `
<button id="contactReplyBtn" class="btn-small">Reply</button>
<button id="contactMarkReadBtn" class="btn-small">${contact.read ? 'Mark unread' : 'Mark read'}</button>
<button id="contactDeleteBtn" class="btn-small"><i class="fa fa-trash"></i> Delete</button>
`;

document.getElementById('contactReplyBtn').onclick = () => {
window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent('Re: your afro daafi and pizza message')}`;
};
document.getElementById('contactMarkReadBtn').onclick = async () => {
if (contact.read !== true) {
  await window.FirebaseDB.markContactRead(contact.id);
  contact.read = true;
} else {
  // toggle unread (optional) - we'll mark read:false
  try {
    await updateDoc(doc(db, 'contacts', contact.id), { read: false });
    contact.read = false;
  } catch (e) { console.warn('mark unread failed', e); }
}
updateUnreadBadgeCount();
renderContactsList(contactsCache);
openContactDetail(contact); // refresh footer text
};
document.getElementById('contactDeleteBtn').onclick = async () => {
if (!confirm('Delete this contact message permanently?')) return;
const res = await window.FirebaseDB.deleteContact(contact.id);
if (res && res.success) {
  contactsCache = contactsCache.filter(x => x.id !== contact.id);
  updateUnreadBadgeCount();
  renderContactsList(contactsCache);
  modal.style.display = 'none';
  showToast1('Contact deleted');
} else {
  alert('Delete failed');
}
};

modal.style.display = 'flex';
}

// update unread badge (uses client-side count so it works even if docs use handled instead of read)
async function updateUnreadBadgeCount() {
try {
if (window.FirebaseDB && typeof window.FirebaseDB.getUnreadContactsCount === 'function') {
  const res = await window.FirebaseDB.getUnreadContactsCount();
  if (res.success) {
    const c = res.count || 0;
    contactsUnreadBadge.textContent = c;
    contactsUnreadBadge.style.display = c ? 'inline-block' : 'none';
    return;
  }
}
} catch(e){ console.warn('unread count api fail', e); }

// fallback: count locally
const count = (contactsCache || []).filter(x => x.read !== true).length;
contactsUnreadBadge.textContent = count;
contactsUnreadBadge.style.display = count ? 'inline-block' : 'none';
}

// manual one-shot refresh
async function manualContactsRefresh() {
if (!window.FirebaseDB || typeof window.FirebaseDB.listContacts !== 'function') return;
const res = await window.FirebaseDB.listContacts();
if (res && res.success) {
contactsCache = res.contacts || [];
renderContactsList(contactsCache);
updateUnreadBadgeCount();
} else {
console.warn('manualContactsRefresh failed', res && res.error);
}
}

// start realtime listener (or fallback)
async function startContactsListener() {
ensureContactModal();
if (unsubContacts) { try { unsubContacts(); } catch(e) {} unsubContacts = null; }

const ok = await waitForFirebaseDB(4000);
if (!ok || !window.FirebaseDB) { await manualContactsRefresh(); return; }

if (typeof window.FirebaseDB.onContactsSnapshot === 'function') {
try {
  unsubContacts = window.FirebaseDB.onContactsSnapshot(list => {
    contactsCache = list || [];
    renderContactsList(contactsCache);
    updateUnreadBadgeCount();
  });
  updateUnreadBadgeCount();
} catch (e) {
  console.warn('startContactsListener fallback', e);
  await manualContactsRefresh();
}
} else {
await manualContactsRefresh();
}
}

// contactsTab opens modal & starts listener
contactsTabBtn.addEventListener('click', async () => {
if (!currentAdmin) { alert('Admin only'); return; }
const m = ensureContactModal();
m.style.display = 'flex';
const search = document.getElementById('contactModalSearch');
if (search) search.value = '';
await startContactsListener();
});








// /* ---------- small toast ---------- */
function toast (msg, t = 1700) {
let c = document.getElementById('adminToastContainer');
if (!c) {
c = document.createElement('div');
c.id = 'adminToastContainer';
c.style.position = 'fixed';
c.style.right = '18px';
c.style.bottom = '18px';
c.style.zIndex = 99999;
document.body.appendChild(c);
}
const el = document.createElement('div');
el.style.background = 'rgba(0,0,0,0.8)';
el.style.color = '#fff';
el.style.padding = '8px 12px';
el.style.marginTop = '8px';
el.style.borderRadius = '6px';
el.textContent = msg;
c.appendChild(el);
setTimeout(() => { el.style.transition='opacity 250ms'; el.style.opacity='0'; setTimeout(()=>el.remove(), 260); }, t);
}
















/////



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
showToast1('Action already in progress for this order', 1600, 'info');
return;
}
window._confirmingOrders.add(orderId);

try {
const idx = ordersCache.findIndex(x => String(x.id || x.localId || '') === String(orderId));
const ord = idx !== -1 ? ordersCache[idx] : null;
const currentStatus = (ord && (ord.status || ord.paymentStatus)) ? String((ord.status || ord.paymentStatus)).toLowerCase() : 'pending';

// if already same status, skip and inform
if (currentStatus === newStatus) {
  showToast1(`Order already ${newStatus}`, 1400, 'info');
  return;
}

// prevent repeated update if one already running for this order
if (window._updatingOrders.has(orderId)) {
  showToast1('Update already running for this order', 1400, 'info');
  return;
}

// single confirm prompt
const ok = confirm(`Change order ${orderId} to status "${newStatus}"?`);
if (!ok) return;

window._updatingOrders.add(orderId);

// optimistic update locally
if (idx !== -1) {
  ordersCache[idx] = { ...ordersCache[idx], status: newStatus };
  applyFiltersAndRender();
}

// server call (if helper exists)
let res = null;
if (window.FirebaseDB && typeof window.FirebaseDB.updateOrderStatus === 'function') {
  try {
    res = await window.FirebaseDB.updateOrderStatus(orderId, newStatus);
  } catch (e) {
    console.warn('updateOrderStatus failed', e);
    res = { success: false, error: e };
  }
} else {
  // fallback: persist in localStorage only
  try {
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const li = localOrders.findIndex(lo => String(lo.localId || lo.remoteId || lo.id || '') === String(orderId));
    if (li !== -1) {
      localOrders[li].status = newStatus;
      localStorage.setItem('orders', JSON.stringify(localOrders));
    }
    res = { success: true, localOnly: true };
  } catch (e) { res = { success:false, error:e }; }
}

if (!res || !res.success) {
  // revert if possible
  if (idx !== -1) {
    ordersCache[idx].status = ord ? ord.status : (ord && ord.paymentStatus) ? ord.paymentStatus : 'pending';
    applyFiltersAndRender();
  }
  if (res && res.error) console.error(res.error);
  alert('Failed to update status');
  return;
}

// merge server updatedOrder if returned
if (res.updatedOrder && idx !== -1) {
  ordersCache[idx] = { ...ordersCache[idx], ...res.updatedOrder };
}

// toast with type
const toastType = (newStatus === 'confirmed') ? 'confirmed'
                : (newStatus === 'delivered')  ? 'delivered'
                : (newStatus === 'denied')     ? 'denied'
                : 'info';
showToast1(`Order ${orderId} set to ${newStatus}`, 2200, toastType);

applyFiltersAndRender();

// close modal if it's open for this order
if (orderViewModal && orderViewModal.style.display === 'flex') {
  try {
    const shownId = orderViewTitle && orderViewTitle.textContent ? (orderViewTitle.textContent.match(/#\s*(\S+)/) || [])[1] : null;
    if (!shownId || String(shownId) === String(orderId)) hideOrderView();
  } catch (e) { hideOrderView(); }
}
} finally {
window._confirmingOrders.delete(orderId);
window._updatingOrders.delete(orderId);
}
}


function showToast1(message, t = 2200, type = 'info') {
let container = document.getElementById('adminToastContainer');
if (!container) {
container = document.createElement('div');
container.id = 'adminToastContainer';
container.style.position = 'fixed';
container.style.right = '18px';
container.style.bottom = '18px';
container.style.zIndex = 99999;
container.style.display = 'flex';
container.style.flexDirection = 'column';
container.style.alignItems = 'flex-end';
container.style.gap = '8px';
document.body.appendChild(container);
}

const el = document.createElement('div');
el.className = 'admin-toast';
el.style.padding = '9px 14px';
el.style.borderRadius = '8px';
el.style.minWidth = '160px';
el.style.boxShadow = '0 6px 18px rgba(12,15,20,0.08)';
el.style.color = '#fff';
el.style.fontWeight = 600;
el.style.letterSpacing = '0.2px';
el.style.opacity = '1';
el.style.transition = 'opacity 260ms, transform 240ms';
el.style.transform = 'translateY(0)';

// type styles
if (type === 'confirmed') {
el.style.background = 'linear-gradient(90deg,#0b74ff,#0b9bff)';
} else if (type === 'delivered') {
el.style.background = 'linear-gradient(90deg,#16a34a,#22c55e)';
} else if (type === 'denied') {
el.style.background = 'linear-gradient(90deg,#ef4444,#fb7185)';
} else {
// info / default
el.style.background = 'linear-gradient(90deg, rgba(15,23,36,0.9), rgba(15,23,36,0.8))';
}

el.textContent = message;
container.appendChild(el);

// auto-hide
setTimeout(() => {
el.style.opacity = '0';
el.style.transform = 'translateY(8px)';
setTimeout(() => el.remove(), 280);
}, t);
}

// ---------- Period filtering helpers ----------
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

function startOfToday() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.getTime();
}

function endOfToday() {
  const d = new Date();
  d.setHours(23,59,59,999);
  return d.getTime();
}

function startOfWeek() {
const d = new Date();
const day = d.getDay(); // 0=Sun
const diff = (day >= 6) ? 6 - day : -1 - day; // Saturday start
d.setDate(d.getDate() + diff);
d.setHours(0,0,0,0);
return d.getTime();
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0,0,0,0);
  return d.getTime();
}

function startOfYear() {
  const d = new Date();
  d.setMonth(0,1);
  d.setHours(0,0,0,0);
  d.setDate(1);
  return d.getTime();
}

function isInPeriod(o, period) {
  const t = orderTimestampMs(o);
  if (period === 'today') {
    return t >= startOfToday() && t <= endOfToday();
  } else if (period === 'week') {
    return t >= startOfWeek() && t <= Date.now();
  } else if (period === 'month') {
    return t >= startOfMonth() && t <= Date.now();
  } else if (period === 'year') {
    return t >= startOfYear() && t <= Date.now();
  } else { // all
    return true;
  }
}

// Replace your existing shareLink branch with this function call:
async function openShareModalForOrder(ord) {
// ord should be the order object (may have localId, remoteId, id)
const docId = ord && (ord.id || ord.remoteId) ? (ord.id || ord.remoteId) : (ord.localId || '');
const localId = ord && ord.localId ? ord.localId : '';
// build a tracking URL that includes docId (if known) and localId
// prefer docId in param "id" (firestore doc id) when available; fallback to localId
const trackBase = `${location.origin}/order-track.html`;
const params = new URLSearchParams();
if (docId) params.set('id', docId);
if (localId && (!docId || docId.indexOf('local_') === 0)) params.set('local', localId);
// Admin can choose role for the recipient (driver/customer)
// The modal UI below allows selecting contacts and role.

// Build modal DOM
let m = document.getElementById('shareOrderModal');
if (!m) {
m = document.createElement('div');
m.id = 'shareOrderModal';
m.className = 'cart-modal';
m.innerHTML = `
  <div class="cart-content" style="max-width:520px;">
    <div class="cart-header"><h3>Share tracking link</h3><span class="close-btn" id="closeShareModal">&times;</span></div>
    <div class="cart-body" style="padding:12px;">
      <div style="margin-bottom:8px;">
        <label>Role for recipient</label><br/>
        <select id="shareRole" style="width:100%; padding:8px; margin-top:6px;">
          <option value="driver">Driver (open with driver UI)</option>
          <option value="customer">Customer (customer UI)</option>
        </select>
      </div>

      <div style="margin-bottom:8px;">
        <label>Select contacts (or paste numbers, comma separated)</label>
        <div id="shareContactsList" style="max-height:160px; overflow:auto; border:1px dashed #e6eef9; padding:8px; border-radius:6px;"></div>
        <div style="margin-top:8px;">
          <input id="shareManualNumbers" placeholder="e.g. 617123456, 627123456" style="width:100%; padding:8px;" />
        </div>
      </div>

      <div style="text-align:right;">
        <button id="sendShareBtn" class="btn-primary">Send to selected</button>
        <button id="copyShareBtn" class="btn" style="margin-left:8px;">Copy message</button>
      </div>
    </div>
  </div>
`;
document.body.appendChild(m);

document.getElementById('closeShareModal').addEventListener('click', ()=> m.style.display='none');
m.addEventListener('click', (e)=> { if (e.target === m) m.style.display='none'; });
}

// populate contacts list from your contacts collection (if available) else allow manual entry
const contactsContainer = document.getElementById('shareContactsList');
contactsContainer.innerHTML = '<div style="color:#666">Loading contacts...</div>';
let contacts = [];
try {
if (window.FirebaseDB && typeof window.FirebaseDB.listContacts === 'function') {
  const res = await window.FirebaseDB.listContacts();
  if (res && res.success) contacts = res.contacts || [];
}
} catch(e) { console.warn('listContacts failed', e); }
// render simple checkboxes for numbers
if (contacts.length === 0) {
contactsContainer.innerHTML = '<div style="color:#666">No saved contacts (or failed to load). You can paste numbers below.</div>';
} else {
contactsContainer.innerHTML = contacts.map(c => {
  const phone = (c.phone || c.number || '').replace(/\s+/g,'');
  return `<label style="display:block; margin-bottom:6px;"><input type="checkbox" data-phone="${encodeURIComponent(phone)}"> ${c.name || phone} — ${phone}</label>`;
}).join('');
}

document.getElementById('sendShareBtn').onclick = function() {
const role = document.getElementById('shareRole').value || 'driver';
// gather selected phones
const checked = Array.from(contactsContainer.querySelectorAll('input[type=checkbox]:checked')).map(n => decodeURIComponent(n.dataset.phone));
// manual numbers
const manual = (document.getElementById('shareManualNumbers').value || '').split(',').map(s => s.trim()).filter(Boolean);
const phones = checked.concat(manual).filter(Boolean);

if (phones.length === 0) {
  showToast1 && showToast1('Select or paste at least one phone number');
  return;
}

const trackUrl = `${trackBase}?${params.toString()}&role=${encodeURIComponent(role)}`;
const msg = `Delivery: Order ${ord.remoteId || ord.id || ord.localId || ''}\nCustomer: ${ord.visitorName||''} • ${ord.phone||''}\nOpen tracking: ${trackUrl}`;

// open WhatsApp composer for each selected phone (note: this will open a tab per number)
phones.forEach(p => {
  const cleaned = p.replace(/[^\d]/g,''); // remove + or spaces; WhatsApp expects no plus
  const wa = `https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`;
  window.open(wa, '_blank');
});

showToas1t && showToast1('WhatsApp composer opened for selected numbers', 1600, 'info');
m.style.display = 'none';
};

document.getElementById('copyShareBtn').onclick = function() {
const role = document.getElementById('shareRole').value || 'driver';
const trackUrl = `${trackBase}?${params.toString()}&role=${encodeURIComponent(role)}`;
const msg = `Delivery: Order ${ord.remoteId || ord.id || ord.localId || ''}\nCustomer: ${ord.visitorName||''} • ${ord.phone||''}\nOpen tracking: ${trackUrl}`;
navigator.clipboard && navigator.clipboard.writeText(msg).then(()=> showToast1 && showToast1('Message copied') ).catch(()=> alert(msg));
};

m.style.display = 'flex';
}

// filters ordersCache by period/status/search and then renders + updates totals
// Replace your existing applyFiltersAndRender with this exact function
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

// helper: decide which action buttons to show (includes payment actions)
function actionButtonsHtml(id, statusText, paymentStatus) {
let html = '';
// Payment actions (allow quickly marking payment)
if (paymentStatus !== 'paid') {
  // allow admin to mark as paid or mark as COD
  html += `<button class="btn-small" data-action="markPaid" data-id="${id}">Mark Paid</button>`;
  html += `<button class="btn-small" data-action="markCOD" data-id="${id}">Mark COD</button>`;
} else {
  // paid already - show readonly badge (no extra action)
  html += `<button class="btn-small" data-action="paidBadge" data-id="${id}" disabled>Paid</button>`;
}


// Status-specific actions
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

// Location quick link (open map with client/delivery coordinates when available)
html += `<button class="btn-small" data-action="openMap" data-id="${id}">Map</button>`;

// add near Map button (for example after Map)
html += `<button class="btn-small" data-action="shareLink" data-id="${id}">Share</button>`;


return html;
}

// render markup
ordersList.innerHTML = filtered.map(o => {
const statusText = (o.status || o.paymentStatus || 'pending').toLowerCase();
const paymentStatus = (o.paymentStatus || 'pending').toLowerCase();
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
        <div style="margin-bottom:6px;">
          <span class="status-pill ${statusText==='pending'?'status-pending':''} ${statusText==='confirmed'?'status-confirmed':''} ${statusText==='denied'?'status-denied':''} ${statusText==='delivered'?'status-delivered':''}">
            ${statusText.toUpperCase()}
          </span>
        </div>
        <div style="margin-bottom:6px;">
          <small>Payment: <strong>${(paymentStatus || 'pending').toUpperCase()}</strong></small>
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
      ${actionButtonsHtml(o.id || o.localId || '', statusText, paymentStatus)}
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

  // open map modal
  if (action === 'openMap') {
    openMapModalForOrder(ord || { id });
    return;
  }

  // payment actions
  if (action === 'markPaid') {
    await markPaymentWithConfirm(id, 'paid');
    return;
  }
  if (action === 'markCOD') {
    await markPaymentWithConfirm(id, 'cod');
    return;
  }
  if (action === 'shareLink') {
// open the sharing modal (admin can pick contacts, role, copy message, etc.)
if (typeof openShareModalForOrder === 'function') openShareModalForOrder(ord || { id });
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


// update totals UI from a filtered orders array
function updateTotals(filtered) {
  const totalCount = filtered.length;
  const confirmedArr = filtered.filter(o => (o.status || '').toLowerCase() === 'confirmed');
  const deliveredArr = filtered.filter(o => (o.status || '').toLowerCase() === 'delivered');

  // revenue: sum of totals for confirmed + delivered
  const money = filtered.reduce((s,o) => {
    const st = (o.status || '').toLowerCase();
    if (st === 'confirmed' || st === 'delivered') return s + (parseFloat(o.total) || 0);
    return s;
  }, 0);

  totAll.textContent = totalCount;
  totConfirmed.textContent = confirmedArr.length;
  totDelivered.textContent = deliveredArr.length;
  totMoney.textContent = `$${money.toFixed(2)}`;
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
showToast1('Saved locally (no server helper)');
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


// MARK PAYMENT (optimistic + remote)
async function updateOrderPaymentOptimistic(orderId, newPaymentStatus) {
const idx = ordersCache.findIndex(x => String(x.id || x.localId || '') === String(orderId));
const prev = idx !== -1 ? ordersCache[idx].paymentStatus : null;

if (idx !== -1 && ordersCache[idx].paymentStatus === newPaymentStatus) {
return { success: true, skipped: true };
}

// optimistic local change
if (idx !== -1) {
ordersCache[idx].paymentStatus = newPaymentStatus;
applyFiltersAndRender();
}

// persist to localStorage visitor copy if present
try {
const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
const li = localOrders.findIndex(lo => String(lo.localId || lo.remoteId || lo.id || '') === String(orderId));
if (li !== -1) { localOrders[li].paymentStatus = newPaymentStatus; localStorage.setItem('orders', JSON.stringify(localOrders)); }
} catch(e){}

if (!window.FirebaseDB || typeof window.FirebaseDB.updateOrderPaymentStatus !== 'function') {
// fallback success (local-only)
return { success: true, localOnly: true };
}

try {
const res = await window.FirebaseDB.updateOrderPaymentStatus(orderId, newPaymentStatus);
if (!res.success && idx !== -1) { ordersCache[idx].paymentStatus = prev; applyFiltersAndRender(); }
return res;
} catch (err) {
if (idx !== -1) { ordersCache[idx].paymentStatus = prev; applyFiltersAndRender(); }
return { success: false, error: err };
}
}

// exposed function to confirm payment status (admin)
async function markPaymentWithConfirm(orderId, paymentStatus) {
if (!window._confirmingPayments) window._confirmingPayments = new Set();
if (!window._updatingPayments) window._updatingPayments = new Set();

if (window._confirmingPayments.has(orderId)) {
showToast1('Payment action already in progress for this order', 1400, 'info'); return;
}
window._confirmingPayments.add(orderId);

try {
const idx = ordersCache.findIndex(x => String(x.id || x.localId || '') === String(orderId));
const ord = idx !== -1 ? ordersCache[idx] : null;
const currentPayment = (ord && ord.paymentStatus) ? String(ord.paymentStatus).toLowerCase() : 'pending';
if (currentPayment === paymentStatus) {
  showToast1(`Payment already ${paymentStatus}`, 1400, 'info'); return;
}
if (window._updatingPayments.has(orderId)) {
  showToast1('Update already running for this order', 1400, 'info'); return;
}

const ok = confirm(`Set payment for order ${orderId} to "${paymentStatus}"?`);
if (!ok) return;

window._updatingPayments.add(orderId);
const res = await updateOrderPaymentOptimistic(orderId, paymentStatus);

if (!res || !res.success) {
  if (res && res.skipped) { showToast1('No change needed', 1200, 'info'); return; }
  alert('Failed to update payment status'); return;
}

const toastType = paymentStatus === 'paid' ? 'confirmed' : 'info';
showToast1(`Order ${orderId} payment: ${paymentStatus}`, 2000, toastType);

applyFiltersAndRender();
} finally {
window._confirmingPayments.delete(orderId);
window._updatingPayments.delete(orderId);
}
}

// --- Location helpers ---
// Admin view: open map modal showing client/delivery positions (uses Google Maps or OpenStreetMap link fallback)
function openMapModalForOrder(order) {
if (!order) {
alert('Order not available for map view');
return;
}

// Collect coords with fallbacks
const clientLoc = order.clientLocation || order.location || (order.locationHintCoords ? order.locationHintCoords : null);
const deliveryLoc = order.deliveryLocation || null; // expected { lat, lng } from driver

// Build a simple modal (re-usable)
let modal = document.getElementById('orderMapModal');
if (!modal) {
modal = document.createElement('div');
modal.id = 'orderMapModal';
modal.className = 'modal-backdrop';
modal.style.display = 'none';
modal.innerHTML = `
  <div class="modal" role="dialog" aria-modal="true" style="max-width:900px; width:95%;">
    <div class="modal-header">
      <div><h3>Order Location — #<span id="mapModalOrderId"></span></h3><small id="mapModalSubtitle"></small></div>
      <div><button id="closeMapModal" class="btn-small">Close</button></div>
    </div>
    <div class="modal-body" id="mapModalBody" style="padding:8px;">
      <div id="mapFrame" style="height:420px; width:100%; background:#f2f2f2; display:flex; align-items:center; justify-content:center;">Loading map…</div>
    </div>
  </div>
`;
document.body.appendChild(modal);
document.getElementById('closeMapModal').addEventListener('click', ()=> modal.style.display='none');
modal.addEventListener('click', (e)=> { if (e.target === modal) modal.style.display = 'none'; });
}

document.getElementById('mapModalOrderId').textContent = order.id || order.localId || '';
const subtitle = `Customer: ${order.visitorName || '—'} • ${order.phone || '—'} • Total: $${(order.total||0).toFixed(2)}`;
document.getElementById('mapModalSubtitle').textContent = subtitle;

// Build a map link/embed. Prefer Google Maps + markers via URL (works on mobile & desktop).
// If both points available, we'll show one map link centered between them.
let latA = clientLoc && clientLoc.lat ? clientLoc.lat : null;
let lngA = clientLoc && clientLoc.lng ? clientLoc.lng : null;
let latB = deliveryLoc && deliveryLoc.lat ? deliveryLoc.lat : null;
let lngB = deliveryLoc && deliveryLoc.lng ? deliveryLoc.lng : null;

const frame = document.getElementById('mapFrame');
if (!latA || !lngA) {
frame.innerHTML = `<div style="padding:20px; text-align:center; color:#666;">Client location not available yet.</div>
  <div style="text-align:center; margin-top:12px;"><button id="requestClientLocationBtn" class="btn-small">Request client location</button></div>`;
// attach request handler
setTimeout(()=> {
  const reqBtn = document.getElementById('requestClientLocationBtn');
  if (reqBtn) reqBtn.addEventListener('click', ()=> {
    // visitor will need to call a link or you can instruct them to share location using the app / page.
    alert('Ask the customer to open their order link and press "Share my location".');
  });
}, 20);
} else {
// Compose Google Maps URL with both markers if delivery coords exist
let mapUrl = '';
if (latB && lngB) {
  // center between two points (simple mean)
  const centerLat = (parseFloat(latA) + parseFloat(latB))/2;
  const centerLng = (parseFloat(lngA) + parseFloat(lngB))/2;
  // create a maps URL with two markers (Google Maps supports multiple q=lat,lng or markers for Static API - we'll use link with query show both)
  mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${latB},${lngB}&destination=${latA},${lngA}&travelmode=driving`;
} else {
  // single marker
  mapUrl = `https://www.google.com/maps?q=${latA},${lngA}`;
}
frame.innerHTML = `<iframe src="${mapUrl}" style="width:100%; height:100%; border:0;" loading="lazy"></iframe>`;
}

modal.style.display = 'flex';
}

// VISITOR: request browser to get current location and send to server and store locally
async function requestAndSendVisitorLocation(orderId) {
if (!navigator.geolocation) {
alert('Geolocation not supported by this browser.');
return null;
}

return new Promise((resolve) => {
navigator.geolocation.getCurrentPosition(async (pos) => {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;

  // Update localStorage order
  try {
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const idx = localOrders.findIndex(lo => String(lo.localId || lo.remoteId || lo.id || '') === String(orderId));
    if (idx !== -1) {
      localOrders[idx].clientLocation = { lat, lng, ts: Date.now() };
      localStorage.setItem('orders', JSON.stringify(localOrders));
    }
  } catch (e) { console.warn('saving visitor loc failed', e); }

  // Send to server if supported
  if (window.FirebaseDB && typeof window.FirebaseDB.updateOrderLocation === 'function') {
    try {
      await window.FirebaseDB.updateOrderLocation(orderId, { lat, lng });
    } catch (e) { console.warn('updateOrderLocation failed', e); }
  }

  // Refresh UI and bells
  showToast1('Location shared for delivery', 1600, 'info');
  refreshOrderBell();
  refreshVisitorOrderHistoryUI();

  resolve({ lat, lng });
}, (err) => {
  console.warn('geolocation error', err);
  alert('Unable to get your location. Please allow location permission and try again.');
  resolve(null);
}, { enableHighAccuracy: true, timeout: 15000 });
});
}

// DELIVERY RIDER: start updating delivery location continuously (call on rider app)
function startDeliveryWatcher(orderId) {
if (!navigator.geolocation) {
alert('Geolocation not supported');
return null;
}
if (!window.FirebaseDB || typeof window.FirebaseDB.updateDeliveryLocation !== 'function') {
alert('Delivery update helper not available on server');
return null;
}

const watchId = navigator.geolocation.watchPosition(async (pos) => {
const lat = pos.coords.latitude;
const lng = pos.coords.longitude;
try {
  await window.FirebaseDB.updateDeliveryLocation(orderId, { lat, lng });
} catch (e) { console.warn('updateDeliveryLocation failed', e); }
}, (err) => {
console.warn('delivery watch error', err);
}, { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 });

return watchId;
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
showToast1('Realtime (recent) enabled');
}
function disableRealtime() {
window.useRealtime = false;
if (unsubOrders) { try { unsubOrders(); } catch(e){} unsubOrders = null; }
showToast1('Realtime disabled — using paginated reads');
// reload first page
fetchFirstOrdersPage();
}

// cheap bell refresh (uses loaded pages). For accurate full count use the expensive function below.
async function refreshOrderBellCheap() {
try {
const bellCount = document.getElementById('orderBellCount');
if (!bellCount) return;
const localPending = (ordersCache || []).filter(o => ((o.status || o.paymentStatus || 'pending') === 'pending')).length;
bellCount.textContent = localPending;
} catch(e){ console.warn(e); }
}

// expensive: accurate count for today (warns admin)
async function refreshOrderBellAccurateForToday() {
if (!confirm('This will read many documents and may cost reads. Continue?')) return;
try {
if (typeof window.FirebaseDB.listOrdersSince === 'function') {
  const res = await window.FirebaseDB.listOrdersSince({ fromTimestamp: Math.floor(startOfToday()/1000) });
  if (res && res.success) {
    const pending = (res.orders || []).filter(o => ((o.status || o.paymentStatus || 'pending') === 'pending')).length;
    const bell = document.getElementById('orderBellCount');
    if (bell) bell.textContent = pending;
    showToast1('Accurate count loaded');
    return;
  }
}
// fallback: page through pages (may be slow/expensive)
let cursor = null, pending = 0;
while (true) {
  const r = await window.FirebaseDB.listOrdersPage({ limit: 500, startAfterId: cursor });
  if (!r || !r.success) break;
  const page = r.orders || [];
  page.forEach(o => { if (isInPeriod(o, 'today') && ((o.status || 'pending') === 'pending')) pending++; });
  if (!r.nextCursor || page.length === 0) break;
  cursor = r.nextCursor;
}
const bell = document.getElementById('orderBellCount');
if (bell) bell.textContent = pending;
showToast1('Accurate count loaded (costly)');
} catch (e) {
console.error(e);
alert('Accurate count failed');
}
}

// If not signed in, show inline login form
function showAdminLoginPrompt() {
  ordersList.innerHTML = `
    <div style="padding:20px;">
      <h3>Sign in as Admin</h3>
      <form id="adminSignInForm">
        <div style="margin-bottom:8px;"><input id="adminEmail" placeholder="Email" required></div>
        <div style="margin-bottom:8px;"><input id="adminPass" type="password" placeholder="Password" required></div>
        <div><button type="submit" class="btn-small">Sign in</button></div>
        <p style="font-size:12px; color:#666; margin-top:8px;">Make sure the Firebase Auth user exists and is added in the 'admins' (or 'admin') collection in Firestore.</p>
      </form>
    </div>
  `;
  const form = document.getElementById('adminSignInForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const pass = document.getElementById('adminPass').value.trim();
    if (!window.FirebaseDB || !window.FirebaseDB.adminSignIn) { alert('Auth not available'); return; }
    const res = await window.FirebaseDB.adminSignIn(email, pass);
    if (!res.success) {
      alert('Sign in failed: ' + (res.error && res.error.message ? res.error.message : res.error));
      return;
    }
    // success
    currentAdmin = res.adminDoc || { email };
    onAdminSignedIn(currentAdmin);
  });
}

// When admin is signed in: show info & start listening to orders
function onAdminSignedIn(adminDoc) {
  currentAdmin = adminDoc;
  adminInfo.innerHTML = `<strong>${adminDoc.name || adminDoc.email}</strong><br><small>${adminDoc.email}</small>`;
  // start listening (but ensure DB ready)
  startOrdersListener();
}


async function deleteOrderCompletely(orderId) {
if (!window.FirebaseDB || !window.FirebaseDB.deleteOrder) {
alert('Delete not available');
return;
}

const res = await window.FirebaseDB.deleteOrder(orderId);
if (res.success) {
ordersCache = ordersCache.filter(o => o.id !== orderId);
removeOrderFromLocalStorage(orderId);
applyFiltersAndRender();
showToast1('Order deleted');
} else {
alert('Failed to delete order');
}
}

// profile editing & logout
openProfileBtn.addEventListener('click', async () => {
  if (!currentAdmin || !currentAdmin.id) return alert('No admin info');
  const name = prompt('Admin name', currentAdmin.name || '');
  const phone = prompt('Phone', currentAdmin.phone || '');
  if (name === null) return;
  const res = await window.FirebaseDB.updateAdminProfile(currentAdmin.id, { name, phone });
  if (res.success) {
    alert('Profile updated');
    currentAdmin = { ...currentAdmin, name, phone };
    adminInfo.innerHTML = `<strong>${currentAdmin.name || currentAdmin.email}</strong><br><small>${currentAdmin.email}</small>`;
    try {
      const cached = JSON.parse(localStorage.getItem('adminDoc') || '{}');
      cached.name = name; cached.phone = phone;
      localStorage.setItem('adminDoc', JSON.stringify(cached));
    } catch(e){/*ignore*/}
  } else alert('Failed to update profile');
});

adminLogoutBtn.addEventListener('click', async () => {
  const res = await window.FirebaseDB.adminSignOut();
  if (res.success) {
    if (unsubOrders) { try { unsubOrders(); } catch(e){} unsubOrders = null; }
    currentAdmin = null;
    adminInfo.innerHTML = 'Not signed in';
    try { localStorage.removeItem('adminDoc'); localStorage.removeItem('adminSigned'); } catch(e){}
    showAdminLoginPrompt();
  } else {
    alert('Logout failed');
  }
});

// On admin page: first try local cache so UI appears fast, then attach real listener
(function adminPageAuthGuard() {
  try {
    const localDoc = JSON.parse(localStorage.getItem('adminDoc') || 'null');
    if (localDoc && localDoc.email) {
      currentAdmin = localDoc;
      onAdminSignedIn(currentAdmin);
    }
  } catch (e) {
    console.warn('adminPage: local admin rehydrate failed', e);
  }

  (async function waitAndAttachAuth() {
    const dbReady = await (new Promise((r) => {
      const check = () => {
        if (window.FirebaseDB && typeof window.FirebaseDB.onAuthStateChange === 'function') return r(true);
        setTimeout(() => {
          if (window.FirebaseDB && typeof window.FirebaseDB.onAuthStateChange === 'function') return r(true);
          return r(false);
        }, 2000);
      };
      check();
    }));

    if (!dbReady) {
      setTimeout(() => {
        if (!window.FirebaseDB) showAdminLoginPrompt();
      }, 700);
      return;
    }

    window.FirebaseDB.onAuthStateChange((user) => {
      if (!user || !user.adminDoc) {
        try { localStorage.removeItem('adminDoc'); localStorage.removeItem('adminSigned'); } catch(e){}
        window.location.href = 'index.html';
        return;
      }
      currentAdmin = user.adminDoc;
      try { localStorage.setItem('adminDoc', JSON.stringify(currentAdmin)); localStorage.setItem('adminSigned', '1'); } catch(e){}
      onAdminSignedIn(currentAdmin);
    });
  })();
})();

async function tryFetchOrdersOnce() {
if (!window.FirebaseDB || typeof window.FirebaseDB.listOrdersPage !== 'function') {
ordersList.innerHTML = '<div style="padding:12px;">Orders not available</div>';
return;
}

ordersList.innerHTML = '<div style="padding:12px">Loading orders...</div>';

try {
await fetchFirstOrdersPage();
} catch (err) {
console.error('tryFetchOrdersOnce error', err);
ordersList.innerHTML = '<div style="padding:12px;">Realtime not available</div>';
}
} // ✅ THIS WAS MISSING

// Allow admin to click refresh if real-time not available
refreshBtn.addEventListener('click', async () => {
// refresh first page (cheap)
await fetchFirstOrdersPage();
});


const exportBtn = document.getElementById('exportBtn');
const exportMenu = document.getElementById('exportMenu');

exportBtn.addEventListener('click', () => {
exportMenu.classList.toggle('hidden');
});

exportMenu.querySelectorAll('button').forEach(btn => {
btn.addEventListener('click', () => {
const type = btn.dataset.export;
const data = getCurrentlyFilteredOrders();
if (type === 'csv') exportCSV(data);
if (type === 'pdf') exportPDF(data);
exportMenu.classList.add('hidden');
});
});
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

function exportCSV(orders) {
if (!orders.length) return alert('No orders to export');

const rows = [
['Order ID','Name','Phone','District','Status','Total','Date']
];

orders.forEach(o => {
rows.push([
  o.id,
  o.visitorName || '',
  o.phone || '',
  o.district || '',
  o.status || 'pending',
  o.total || 0,
  new Date(orderTimestampMs(o)).toLocaleString()
]);
});

const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
const blob = new Blob([csv], { type: 'text/csv' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'orders_export.csv';
a.click();
}

function exportPDF(orders) {
if (!orders.length) return alert('No orders to export');

const win = window.open('', '_blank');
win.document.write(`
<h2>Orders Report</h2>
<table border="1" cellspacing="0" cellpadding="6" width="100%">
  <tr>
    <th>ID</th><th>Name</th><th>Status</th><th>Total</th><th>Date</th>
  </tr>
  ${orders.map(o => `
    <tr>
      <td>${o.id}</td>
      <td>${o.visitorName||''}</td>
      <td>${o.status||'pending'}</td>
      <td>$${(o.total||0).toFixed(2)}</td>
      <td>${new Date(orderTimestampMs(o)).toLocaleString()}</td>
    </tr>
  `).join('')}
</table>
`);
win.document.close();
win.print();
}

// small debounce (reused)
function debounce(fn, wait=200){
  let t = null;
  return function(...args){ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
  }
  
  // periodToRange: returns start and end ms for period value
  function periodToRange(period){
  const now = Date.now();
  const start = (p => {
  const d = new Date();
  d.setHours(0,0,0,0);
  if(p === 'today') return d.getTime();
  if(p === 'week') {
  // week starting Sunday (or change to Monday if you prefer)
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.getTime();
  }
  if(p === 'month'){
  d.setDate(1); return d.getTime();
  }
  if(p === 'year'){
  d.setMonth(0); d.setDate(1); return d.getTime();
  }
  return 0; // all
  })(period);
  const end = (period === 'all') ? Date.now() : Date.now();
  return { startTs: start, endTs: end };
  }
  window.showModal = function (title, html) {
    closeModal();
  
    const overlay = document.createElement('div');
    overlay.id = 'globalModal';
    overlay.style = `
      position:fixed;inset:0;background:rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;z-index:9999;
    `;
  
    overlay.innerHTML = `
      <div style="background:#fff;max-width:520px;width:96%;border-radius:10px;overflow:hidden">
        <div style="padding:12px 16px;font-weight:800;border-bottom:1px solid #eee">
          ${title}
          <button id="modalCloseBtn" style="float:right;border:none;background:none;font-size:18px">&times;</button>
        </div>
        <div class="modal-body" style="padding:16px;max-height:70vh;overflow:auto">
          ${html}
        </div>
      </div>
    `;
  
    document.body.appendChild(overlay);
    overlay.querySelector('#modalCloseBtn').onclick = closeModal;
  };
  
  window.closeModal = function () {
    const m = document.getElementById('globalModal');
    if (m) m.remove();
  };
  
  window.openPrintWindow = function (r, title = 'Receipt') {
    const createdAt = r.createdAt?.seconds
      ? new Date(r.createdAt.seconds * 1000)
      : new Date();
  
    const itemsHtml = (r.items || []).map(i => `
      <tr>
        <td>${i.qty} × ${i.name}${i.sizeName ? ' ('+i.sizeName+')' : ''}</td>
        <td style="text-align:right">$${(i.qty * i.price).toFixed(2)}</td>
      </tr>
    `).join('');
  
    const html = `
  <!doctype html>
  <html>
  <head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
  body{font-family:Arial;width:300px;margin:0;padding:10px}
  h3{text-align:center;margin:4px 0}
  table{width:100%;font-size:13px;border-collapse:collapse}
  td{padding:4px 0}
  hr{border:none;border-top:1px dashed #ccc;margin:6px 0}
  .total{font-weight:800}
  @media print{body{width:300px}}
  </style>
  </head>
  <body>
  <h3>Receipt</h3>
  <div>ID: ${r.id}</div>
  <div>${createdAt.toLocaleString()}</div>
  <hr>
  <table>${itemsHtml}</table>
  <hr>
  <div>Subtotal: $${(r.subtotal||0).toFixed(2)}</div>
  <div>Tax: $${(r.tax||0).toFixed(2)}</div>
  <div class="total">TOTAL: $${(r.total||0).toFixed(2)}</div>
  <script>window.print()</script>
  </body>
  </html>
  `;
  
    const w = window.open('', '_blank', 'width=380,height=600');
    w.document.write(html);
    w.document.close();
  };
  
  
  // init on DOM ready
  
  
function initAdminOrdersContacts() {
  // DOM refs (safely)
  const tabOrders = document.getElementById('tabOrders');
  const tabRecipients = document.getElementById('tabRecipients');
  const ordersList = document.getElementById('ordersList');
  const periodSelect = document.getElementById('periodSelect');
  const statusFilter = document.getElementById('statusFilter');
  const searchInput = document.getElementById('searchInput');
  const exportBtnEl = document.getElementById('exportBtn');
  const exportMenuEl = document.getElementById('exportMenu');
  const contactsTabBtn = document.getElementById('contactsTab');
  const contactsUnread = document.getElementById('contactsUnread');


    // add near other DOM refs at top of initAdminOrdersContacts()
    const topNewBtn = document.getElementById('newRecipientTopBtn');
    const topSearchInput = document.getElementById('recipientTopSearch');
  
    // hide top controls initially (they appear only on Recipients tab)
    if (topNewBtn) topNewBtn.style.display = 'none';
    if (topSearchInput) topSearchInput.style.display = 'none';
  
  // ensure ordersList exists
  if (!ordersList) {
    console.warn('initAdminOrdersContacts: ordersList not found in DOM — aborting init.');
    return;
  }

  // create recipients container which will share same spot
  let recipientsList = document.getElementById('recipientsList');
  if (!recipientsList) {
    recipientsList = document.createElement('div');
    recipientsList.id = 'recipientsList';
    recipientsList.className = 'card';
    recipientsList.style.display = 'none';
    recipientsList.style.marginTop = '12px';
    ordersList.parentNode.insertBefore(recipientsList, ordersList.nextSibling);
  }

  // state
  window.ordersCache = window.ordersCache || []; // maintained elsewhere
  let recipientsCache = [];
  let recipientsPageState = { lastDoc: null, finished: false };
  const PAGE_SIZE = 12;

  // helper to render recipients
  function renderRecipientsFromCache() {
    recipientsList.innerHTML = '';
  
    if (!recipientsCache.length) {
      recipientsList.innerHTML = '<div class="muted">No receipts</div>';
      return;
    }
  
    recipientsCache.forEach(r => {
      const date = r.createdAt?.seconds
        ? new Date(r.createdAt.seconds * 1000)
        : new Date();
  
      const total = (Number(r.subtotal||0) + Number(r.tax||0)).toFixed(2);
  
      const row = document.createElement('div');
      row.className = 'rec-row';
      row.innerHTML = `
        <div class="rec-col"><b>${escapeHtml(r.id)}</b></div>
        <div class="rec-col rec-hide-mobile">${date.toLocaleString()}</div>
        <div class="rec-col">$${total}</div>
        <div class="rec-actions">
          <button class="btn-small btn-view" data-a="view" data-id="${r.id}">View</button>
          <button class="btn-small rec-hide-mobile" data-a="edit" data-id="${r.id}">Edit</button>
          <button class="btn-small rec-hide-mobile" data-a="del" data-id="${r.id}">Delete</button>
          <button class="btn-small rec-hide-mobile" data-a="print" data-id="${r.id}">Print</button>
        </div>
      `;
      recipientsList.appendChild(row);
    });
  
    recipientsList.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      const id = b.dataset.id;
      if (b.dataset.a === 'view') viewReceipt(id);
      if (b.dataset.a === 'edit') editReceipt(id);
      if (b.dataset.a === 'del') deleteReceipt(id);
      if (b.dataset.a === 'print') printReceipt(id);
    };
  }
  

  // load first page
  async function loadRecipientsFirstPage() {
    recipientsCache = [];
    recipientsPageState = { lastDoc: null, finished: false };
    recipientsList.innerHTML = `<div class="muted">Loading recipients…</div>`;
    return loadRecipientsNextPage();
  }

  async function loadRecipientsNextPage() {
    if (recipientsPageState.finished) return;
    recipientsList.innerHTML = `<div class="muted">Loading recipients…</div>`;
    try {
      // fetch page from DB helper
      const period = periodSelect ? (periodSelect.value || 'today') : 'today';
      const res = await (window.FirebaseDB && typeof window.FirebaseDB.listRecipientsPage === 'function'
        ? window.FirebaseDB.listRecipientsPage({ limit: PAGE_SIZE, startAfterId: recipientsPageState.lastDoc ? recipientsPageState.lastDoc.id : null, period })
        : null);

      if (!res || !res.success) {
        // fallback: attempt direct query but bounded (safe)
        console.warn('listRecipientsPage unavailable or failed, fallback to direct query');
        const { startTs, endTs } = _periodToRangeMs(period);
        const startVal = (typeof Timestamp !== 'undefined' && Timestamp.fromMillis) ? Timestamp.fromMillis(startTs) : startTs;
        const endVal = (typeof Timestamp !== 'undefined' && Timestamp.fromMillis) ? Timestamp.fromMillis(endTs) : endTs;
        const q = query(collection(db, 'recipients'), where('createdAt','>=',startVal), where('createdAt','<=',endVal), orderBy('createdAt','desc'), limit(PAGE_SIZE));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d=>({ id:d.id, ...d.data(), _snap:d }));
        recipientsCache = recipientsCache.concat(docs);
        recipientsPageState.lastDoc = snap.docs[snap.docs.length-1] || recipientsPageState.lastDoc;
        if(!snap.docs.length || snap.docs.length < PAGE_SIZE) recipientsPageState.finished = true;
        renderRecipientsFromCache();
        return;
      }

      const docs = res.recipients || [];
      recipientsCache = recipientsCache.concat(docs);
      recipientsPageState.lastDoc = res.nextCursor ? { id: res.nextCursor } : recipientsPageState.lastDoc;
      recipientsPageState.finished = !!res.finished;
      renderRecipientsFromCache();

    } catch (err) {
      console.error('loadRecipientsNextPage', err);
      recipientsList.innerHTML = `<div class="muted">Failed to load.</div>`;
    }
  }
// -------------------- Print prefs helpers & modal --------------------
function getPrintPrefs(){
  try { return JSON.parse(localStorage.getItem('printPrefs') || '{}') || {}; } 
  catch(e){ return {}; }
}
function setPrintPrefs(p){ try { localStorage.setItem('printPrefs', JSON.stringify(p||{})); } catch(e){} }
function printPrefsReset(){ localStorage.removeItem('printPrefs'); alert('Print preferences reset'); }
window.printPrefsReset = printPrefsReset;

// Show print options modal (resolves to options object or null if cancelled)
// requires showModal() and closeModal() already on the page
function showPrintOptionsModal(defaults){
  defaults = defaults || {};
  const saved = getPrintPrefs();
  const prefs = {
    logo: typeof saved.logo !== 'undefined' ? saved.logo : !!defaults.logo,
    qr: typeof saved.qr !== 'undefined' ? saved.qr : !!defaults.qr,
    kitchen: typeof saved.kitchen !== 'undefined' ? saved.kitchen : !!defaults.kitchen,
    lang: saved.lang || defaults.lang || 'en',
    dontAskAgain: !!saved.dontAskAgain
  };

  return new Promise((resolve) => {
    const html = `
      <style>
        .po-row{display:flex;align-items:center;gap:10px;margin:8px 0}
        .po-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
        .po-small{font-size:12px;color:#666;margin-top:6px}
      </style>
      <div>
        <h3>Print options</h3>
        <div class="po-row"><label><input id="po_logo" type="checkbox"> Show logo</label></div>
        <div class="po-row"><label><input id="po_qr" type="checkbox"> Include QR</label></div>
        <div class="po-row"><label><input id="po_kitchen" type="checkbox"> Kitchen copy (hide prices)</label></div>
        <div class="po-row"><label>Language <select id="po_lang"><option value="en">English</option><option value="so">Somali</option></select></label></div>
        <div class="po-row"><label><input id="po_dont" type="checkbox"> Save and don't ask again</label></div>
        <div class="po-small">If you don't interact within 5s this panel will close and printing will be cancelled.</div>
        <div class="po-actions"><button id="po_cancel" class="btn">Cancel</button><button id="po_print" class="btn-primary">Print now</button></div>
      </div>
    `;
    showModal('Print options', html);
    const modal = document.getElementById('globalModal');
    if (!modal) { resolve(null); return; }
    const body = modal.querySelector('.modal-body');

    // set defaults
    const elLogo = body.querySelector('#po_logo');
    const elQr = body.querySelector('#po_qr');
    const elKitchen = body.querySelector('#po_kitchen');
    const elLang = body.querySelector('#po_lang');
    const elDont = body.querySelector('#po_dont');
    elLogo.checked = !!prefs.logo;
    elQr.checked = !!prefs.qr;
    elKitchen.checked = !!prefs.kitchen;
    elLang.value = prefs.lang || 'en';
    elDont.checked = !!prefs.dontAskAgain;

    let timer = setTimeout(()=>{ try{ closeModal(); }catch(e){}; resolve(null); }, 5000);

    function cancelAll(){ clearTimeout(timer); try{ closeModal(); }catch(e){}; resolve(null); }
    function doPrint(){
      clearTimeout(timer);
      const newPrefs = {
        logo: !!elLogo.checked,
        qr: !!elQr.checked,
        kitchen: !!elKitchen.checked,
        lang: elLang.value || 'en',
        dontAskAgain: !!elDont.checked
      };
      if (newPrefs.dontAskAgain) setPrintPrefs(newPrefs);
      try{ closeModal(); }catch(e){}
      resolve(newPrefs);
    }

    body.querySelector('#po_cancel').onclick = cancelAll;
    body.querySelector('#po_print').onclick = doPrint;

    // if user focuses/changes anything, give them more time
    body.querySelectorAll('input,select,button').forEach(el=>{
      el.addEventListener('focus', ()=> clearTimeout(timer), { once:true });
      el.addEventListener('change', ()=> clearTimeout(timer), { once:true });
    });
  });
}

// -------------------- Build small receipt HTML --------------------
function buildReceiptHtml(r, opts){
  opts = opts || {};
  // keep decimals as-is in calculations; display fixed to 2 decimals
  const subtotal = Number(r.subtotal || 0);
  const tax = Number(r.tax || 0);
  const total = Number(r.total !== undefined ? r.total : (subtotal + tax)); // do not round
  const totalStr = (typeof total === 'number') ? total.toFixed(2) : String(total);

  const d = r.createdAt && r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000) : new Date();
  const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const dateLine = `${time} ${d.toLocaleDateString()}`;

  const lang = (opts.lang === 'so') ? {
    subtotal: 'Wadarta Hore', tax: 'Canshuur', total: 'Wadar', thanks1: 'Mahadsanid — Soo Noqosho Wanaagsan', thanks2: 'Thanks for your business — Please come again', served: 'Served by'
  } : {
    subtotal: 'Subtotal', tax: 'Tax', total: 'TOTAL', thanks1: 'Mahadsanid — Soo Noqosho Wanaagsan', thanks2: 'Thanks for your business — Please come again', served: 'Served by'
  };

  // items rows - hide prices if kitchen copy
  const itemsHtml = (r.items || []).map(it=>{
    const sub = (Number(it.qty||0) * Number(it.price||0));
    if (opts.kitchen) {
      return `<tr><td style="width:30px">${escapeHtml(String(it.qty))}</td><td>${escapeHtml(it.name)}</td></tr>`;
    } else {
      return `<tr><td style="width:30px">${escapeHtml(String(it.qty))}</td><td>${escapeHtml(it.name)}</td><td class="right">$${sub.toFixed(2)}</td></tr>`;
    }
  }).join('');

  const logoHtml = opts.logo && window.PRINT_LOGO_URL ? `<div style="text-align:center;margin-bottom:6px"><img src="${window.PRINT_LOGO_URL}" style="max-width:160px"></div>` : '';
  const qrHtml = opts.qr ? `<div style="text-align:center;margin-top:8px"><img src="https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent('Receipt:'+ r.id + ' Total:' + totalStr)}" style="width:90px;height:90px"></div>` : '';

  // merchant code embed total (use two decimals string, not integer rounding)
  const merchantLine = (window.MERCHANT_CODE_TEMPLATE && typeof window.MERCHANT_CODE_TEMPLATE === 'string')
    ? window.MERCHANT_CODE_TEMPLATE.replace('{total}', totalStr)
    : `*789*111111*${totalStr}#`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(r.id)}</title>
  <style>
    body{font-family:monospace;width:280px;margin:0;padding:8px;font-size:12px}
    .center{text-align:center}
    table{width:100%;border-collapse:collapse}
    td{padding:2px 0;vertical-align:top}
    .right{text-align:right}
    hr{border:none;border-top:1px dashed #ccc;margin:6px 0}
    .muted{color:#666;font-size:11px;text-align:center}
  </style></head><body>
    ${logoHtml}
    <div class="center"><b>${escapeHtml(window.RESTAURANT_NAME || 'TIP TOP')}</b></div>
    <div class="center muted">${escapeHtml(merchantLine)}</div>
    <hr>
    <div><b>Receipt:</b> ${escapeHtml(r.id)}</div>
    <div><b>Table:</b> ${escapeHtml(r.tableNumber || '-')}</div>
    <div><b>${escapeHtml(opts.lang === 'so' ? 'La adeegay:' : 'Served by:')}</b> ${escapeHtml(r.adminName || (window.currentAdmin && (window.currentAdmin.name||window.currentAdmin.email)) || 'Admin')}</div>
    <div class="muted">${escapeHtml(dateLine)}</div>
    <hr>
    <table>${itemsHtml}</table>
    ${opts.kitchen ? '' : `<hr><table><tr><td>${escapeHtml(lang.subtotal)}</td><td class="right">$${subtotal.toFixed(2)}</td></tr><tr><td>${escapeHtml(lang.tax)}</td><td class="right">$${tax.toFixed(2)}</td></tr><tr><td><b>${escapeHtml(lang.total)}</b></td><td class="right"><b>$${totalStr}</b></td></tr></table>`}
    <hr>
    ${qrHtml}
    <div class="center muted">${escapeHtml(lang.thanks1)}<br>${escapeHtml(lang.thanks2)}</div>
    <div style="height:12px"></div>
  <script>window.print();window.onafterprint=()=>window.close();</script>
  </body></html>`;
  return html;
}

// -------------------- Global view / edit / delete / print functions --------------------

// VIEW - shows receipt details with working Print / Edit / Delete buttons
function viewReceipt(id){
  const r = (window.recipientsCache || []).find(x => String(x.id) === String(id));
  if (!r) {
    // try fetch from helper if cache miss
    if (window.FirebaseDB && typeof window.FirebaseDB.getRecipient === 'function') {
      window.FirebaseDB.getRecipient(id).then(rr=>{
        if (rr && rr.success && rr.recipient) {
          window.recipientsCache = window.recipientsCache || [];
          // update cache
          const idx = window.recipientsCache.findIndex(x=>String(x.id)===String(id));
          if (idx>=0) window.recipientsCache[idx] = rr.recipient; else window.recipientsCache.unshift(rr.recipient);
          viewReceipt(id); // recall
        } else alert('Receipt not found');
      }).catch(()=>alert('Failed to load receipt'));
    } else {
      alert('Receipt not found');
    }
    return;
  }

  const d = r.createdAt && r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000) : new Date();
  const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const dateLine = `${time} ${d.toLocaleDateString()}`;

  const rows = (r.items || []).map(it=>{
    const sub = (Number(it.qty||0) * Number(it.price||0));
    return `<tr><td>${escapeHtml(String(it.qty))}</td><td>${escapeHtml(it.name)}</td><td class="right">$${sub.toFixed(2)}</td><td class="right">$${sub.toFixed(2)}</td></tr>`;
  }).join('');

  const html = `
    <style>
      .right{text-align:right}
      .rec-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
      .rec-header{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .rec-details{font-size:13px;margin-top:6px}
      .rec-table{width:100%;font-size:14px;border-collapse:collapse}
      .rec-table td{padding:4px 0}
    </style>
    <div class="rec-header">
      <div>
        <div><b>Receipt</b></div>
        <div class="rec-details">ID: ${escapeHtml(r.id)}</div>
      </div>
      <div style="text-align:right">
        <div>${escapeHtml(window.RESTAURANT_NAME || 'TIP TOP')}</div>
        <div style="font-size:12px">${escapeHtml(dateLine)}</div>
      </div>
    </div>

    <div style="margin-top:8px">
      <div><b>Table:</b> ${escapeHtml(r.tableNumber || '-')}</div>
      <div><b>Served by:</b> ${escapeHtml(r.adminName || (window.currentAdmin && (window.currentAdmin.name||window.currentAdmin.email)) || 'Admin')}</div>
    </div>

    <hr>

    <table class="rec-table">
      <thead><tr><th>Qty</th><th>Description</th><th class="right">Price</th><th class="right">Sub</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <hr>

    <div style="text-align:right">
      <div><b>Subtotal:</b> $${Number(r.subtotal||0).toFixed(2)}</div>
      <div><b>Tax:</b> $${Number(r.tax||0).toFixed(2)}</div>
      <div><b>Total:</b> $${(Number(r.total !== undefined ? r.total : (Number(r.subtotal||0)+Number(r.tax||0)))).toFixed(2)}</b></div>
    </div>

    <div class="rec-actions">
      <button class="btn" onclick="(function(){window.printReceipt && window.printReceipt('${escapeHtml(r.id)}')})()">Print</button>
      <button class="btn" onclick="(function(){window.editReceipt && window.editReceipt('${escapeHtml(r.id)}')})()">Edit</button>
      <button class="btn btn-danger" onclick="(function(){window.deleteReceipt && window.deleteReceipt('${escapeHtml(r.id)}')})()">Delete</button>
    </div>
  `;
  showModal('Receipt', html);
}
window.viewReceipt = viewReceipt;

// EDIT - improved editor: change qty, remove items, add items, change name/phone/table, save
async function editReceipt(id){
  let r = (window.recipientsCache || []).find(x => String(x.id) === String(id));
  if (!r && window.FirebaseDB && typeof window.FirebaseDB.getRecipient === 'function') {
    const rr = await window.FirebaseDB.getRecipient(id).catch(()=>null);
    if (rr && rr.success) r = rr.recipient;
  }
  if (!r) return alert('Receipt not found');

  // build menu options from known globals (non-blocking)
  const foods = window.foodData || window.menuItems || [];
  const menuOptions = (Array.isArray(foods) ? foods : []).map(it=>{
    if (Array.isArray(it.sizes) && it.sizes.length) {
      return it.sizes.map(sz => `<option value='${escapeHtml(JSON.stringify({id: it.id||it.name, name: it.name, sizeName: sz.name||'', price: Number(sz.price||0)}))}'>${escapeHtml(it.name)} ${escapeHtml(sz.name||'')} — $${Number(sz.price||0).toFixed(2)}</option>`).join('');
    } else {
      return `<option value='${escapeHtml(JSON.stringify({id: it.id||it.name, name: it.name, sizeName:'', price: Number(it.price||0)}))}'>${escapeHtml(it.name)} • $${Number(it.price||0).toFixed(2)}</option>`;
    }
  }).join('');

  const html = `
    <style>.edit-row{display:flex;gap:8px;align-items:center;margin-bottom:8px}.edit-items .edit-item{display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #eee}</style>
    <div>
      <div class="edit-row"><label style="flex:1">Name <input id="eName" value="${escapeHtml(r.name||'')}" style="width:100%"></label><label>Phone <input id="ePhone" value="${escapeHtml(r.phone||'')}" style="width:160px"></label></div>
      <div class="edit-row"><label>Table:
        <select id="eTable" style="padding:6px;border:1px solid #ddd;border-radius:6px"><option value="">-</option></select>
      </label>
      <label style="flex:1">
        <input id="eMenuSearch" placeholder="Search food..." style="width:100%;padding:6px;border:1px solid #ddd;border-radius:6px">
      </label></div>

      <div class="edit-row" style="margin-top:6px">${/* add select */''}
        <select id="eAddSelect" style="flex:1;padding:6px;border:1px solid #ddd;border-radius:6px"><option value="">Select item...</option>${menuOptions}</select>
        <input id="eAddQty" type="number" min="1" value="1" style="width:72px;padding:6px">
        <button id="eAddBtn" class="btn-small">Add</button>
      </div>

      <div id="edit_items" class="edit-items" style="max-height:260px;overflow:auto;margin-top:8px"></div>

      <div style="margin-top:10px;text-align:right">
        <button id="eSave" class="btn-primary">Save</button>
        <button id="eCancel" class="btn">Cancel</button>
      </div>
    </div>
  `;
  showModal('Edit Receipt', html);
  const modal = document.getElementById('globalModal');
  const box = modal.querySelector('#edit_items');
  const eTable = modal.querySelector('#eTable');
  const eMenuSearch = modal.querySelector('#eMenuSearch');
  const eAddSelect = modal.querySelector('#eAddSelect');

  // populate table select from tablesData or derived
  function populateTables(){
    eTable.innerHTML = '<option value="">-</option>';
    const tables = Array.isArray(window.tablesData) ? window.tablesData : (Array.isArray(window.availableTables) ? window.availableTables : []);
    if (tables && tables.length) {
      tables.forEach(t => {
        const label = typeof t === 'object' && t.name ? t.name : String(t);
        const val = typeof t === 'object' && (t.id || t.name) ? (t.id || t.name) : String(t);
        const o = document.createElement('option'); o.value = val; o.textContent = label; eTable.appendChild(o);
      });
    } else {
      // derive from recipientsCache
      const seen = new Set();
      (window.recipientsCache || []).forEach(rr => { if (rr.tableNumber) seen.add(String(rr.tableNumber)); });
      seen.forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; eTable.appendChild(o); });
    }
    eTable.value = r.tableNumber || '';
  }
  populateTables();

  // local copy of items
  const items = (r.items || []).map(it => ({...it}));

  function renderEditItems(){
    if (!items.length) { box.innerHTML = '<div class="muted">No items</div>'; return; }
    box.innerHTML = items.map((it, idx)=>`
      <div class="edit-item" data-idx="${idx}">
        <div style="width:36px">${escapeHtml(String(it.qty))}</div>
        <div style="flex:1">${escapeHtml(it.name)} ${it.sizeName ? '— '+escapeHtml(it.sizeName) : ''}</div>
        <div style="width:80px;text-align:right">$${Number(it.price||0).toFixed(2)}</div>
        <div style="width:80px"><input class="edit-qty" data-idx="${idx}" type="number" min="1" value="${escapeHtml(String(it.qty))}" style="width:60px"></div>
        <div><button class="btn-small edit-remove" data-idx="${idx}">Remove</button></div>
      </div>
    `).join('');
    // wire inputs
    box.querySelectorAll('.edit-qty').forEach(inp=>{
      inp.addEventListener('change', ()=> {
        const i = Number(inp.dataset.idx); items[i].qty = Math.max(1, Number(inp.value)||1); renderEditItems();
      });
    });
    box.querySelectorAll('.edit-remove').forEach(btn=>{
      btn.addEventListener('click', ()=> {
        const i = Number(btn.dataset.idx); items.splice(i,1); renderEditItems();
      });
    });
  }
  renderEditItems();

  // add item handler
  modal.querySelector('#eAddBtn').onclick = ()=>{
    const sel = eAddSelect.value;
    const qty = Math.max(1, Number(modal.querySelector('#eAddQty').value || 1));
    if (!sel) return alert('Select an item');
    let parsed = null;
    try { parsed = JSON.parse(sel); } catch(e){ parsed = { id: sel, name: sel, price: 0, sizeName: '' }; }
    items.push({ id: parsed.id || parsed.name, name: parsed.name || parsed.id, sizeName: parsed.sizeName||'', price: Number(parsed.price||0), qty });
    renderEditItems();
  };

  // search wiring for select
  eMenuSearch.addEventListener('input', ()=>{
    const q = eMenuSearch.value.toLowerCase();
    [...eAddSelect.options].forEach((opt,i)=>{
      if (i===0) return;
      opt.style.display = opt.text.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  modal.querySelector('#eCancel').onclick = ()=> closeModal();

  modal.querySelector('#eSave').onclick = async ()=>{
    // update fields
    r.name = modal.querySelector('#eName').value.trim();
    r.phone = modal.querySelector('#ePhone').value.trim();
    r.tableNumber = modal.querySelector('#eTable').value || '';
    r.items = items.map(it=>({ id: it.id, name: it.name, sizeName: it.sizeName||'', price: Number(it.price||0), qty: Number(it.qty||0) }));
    r.subtotal = r.items.reduce((s,it)=> s + (Number(it.qty||0) * Number(it.price||0)), 0);
    const taxPercent = Number(r.taxPercent || 0);
    r.tax = +(r.subtotal * (taxPercent/100));
    r.total = +(r.subtotal + r.tax);

    // persist
    try {
      if (window.FirebaseDB && typeof window.FirebaseDB.updateRecipient === 'function') {
        await window.FirebaseDB.updateRecipient(r.id, r);
      } else if (typeof updateDoc === 'function' && typeof doc === 'function' && typeof db !== 'undefined') {
        await updateDoc(doc(db,'recipients', r.id), r);
      }
    } catch(e){
      console.error('save edit failed', e);
      alert('Failed to save');
      return;
    }

    // update cache and UI
    window.recipientsCache = window.recipientsCache || [];
    const idx = window.recipientsCache.findIndex(x => String(x.id) === String(r.id));
    if (idx >= 0) window.recipientsCache[idx] = r; else window.recipientsCache.unshift(r);
    renderRecipientsFromCache && renderRecipientsFromCache();
    closeModal();
  };
}
window.editReceipt = editReceipt;

// DELETE - soft delete wrapper
async function deleteReceipt(id){
  if (!confirm('Delete receipt?')) return;
  try {
    if (window.FirebaseDB && typeof window.FirebaseDB.softDeleteRecipient === 'function') {
      await window.FirebaseDB.softDeleteRecipient(id);
    } else if (typeof updateDoc === 'function' && typeof doc === 'function' && typeof db !== 'undefined') {
      await updateDoc(doc(db,'recipients', id), { deleted: true, deletedAt: (typeof Timestamp !== 'undefined' ? Timestamp.now() : new Date()) });
    }
    window.recipientsCache = (window.recipientsCache||[]).filter(r => String(r.id) !== String(id));
    renderRecipientsFromCache && renderRecipientsFromCache();
  } catch(e){ console.error(e); alert('Failed to delete'); }
}
window.deleteReceipt = deleteReceipt;

// PRINT - respects saved prefs (dontAskAgain) and shows options otherwise
async function printReceipt(id){
  // find receipt
  let r = (window.recipientsCache || []).find(x => String(x.id) === String(id));
  if (!r && window.FirebaseDB && typeof window.FirebaseDB.getRecipient === 'function') {
    const rr = await window.FirebaseDB.getRecipient(id).catch(()=>null);
    if (rr && rr.success) r = rr.recipient;
  }
  if (!r) return alert('Receipt not found');

  const savedPrefs = getPrintPrefs();
  let opts = null;
  if (savedPrefs && savedPrefs.dontAskAgain) {
    opts = savedPrefs;
  } else {
    opts = await showPrintOptionsModal(savedPrefs || {});
    if (!opts) return; // cancelled or timed out
  }

  const html = buildReceiptHtml(r, opts);
  const w = window.open('', '', 'width=300,height=600');
  if (!w) { alert('Popup blocked. Allow popups to print receipt'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
window.printReceipt = printReceipt;

  

  // tab switching (safe)
  function switchTab(tab) {
    if (tab === 'orders') {
      tabOrders && tabOrders.classList && tabOrders.classList.add('active');
      tabRecipients && tabRecipients.classList && tabRecipients.classList.remove('active');
      ordersList.style.display = '';
      recipientsList.style.display = 'none';

      // hide recipients top controls when on orders
      if (topNewBtn) topNewBtn.style.display = 'none';
      if (topSearchInput) topSearchInput.style.display = 'none';
    } else {
      tabRecipients && tabRecipients.classList && tabRecipients.classList.add('active');
      tabOrders && tabOrders.classList && tabOrders.classList.remove('active');
      ordersList.style.display = 'none';
      recipientsList.style.display = '';

      // show top controls for recipients
      if (topNewBtn) topNewBtn.style.display = 'inline-flex';
      if (topSearchInput) topSearchInput.style.display = 'inline-block';

      if (!recipientsCache.length) loadRecipientsFirstPage();
    }
  }


  tabOrders && tabOrders.addEventListener && tabOrders.addEventListener('click', () => switchTab('orders'));
  tabRecipients && tabRecipients.addEventListener && tabRecipients.addEventListener('click', () => switchTab('recipients'));

  // export menu toggle wiring (defensive)
  if (exportBtnEl && exportMenuEl) {
    exportBtnEl.addEventListener('click', () => exportMenuEl.classList.toggle('hidden'));
    exportMenuEl.addEventListener('click', (e) => {
      const which = e.target?.dataset?.export;
      if (!which) return;
      if (tabOrders && tabOrders.classList.contains('active')) {
        const filteredOrders = getFilteredOrdersForExport();
        if (which === 'csv') exportToCSV(filteredOrders, 'orders.csv'); else exportPrintable(filteredOrders, 'Orders export');
      } else {
        const filteredRecipients = recipientsCache.slice();
        if (which === 'csv') exportToCSV(filteredRecipients, 'recipients.csv', ['date','id','name','phone','total']); else exportPrintable(filteredRecipients, 'Recipients export');
      }
      exportMenuEl.classList.add('hidden');
    });
  }

  // expose helpers
  window.loadRecipientsNextPage = loadRecipientsNextPage;
  window.switchTab = switchTab;

  // start with orders tab
  switchTab('orders');
} // end initAdminOrdersContacts
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
(function attachRecipientsNewUI_v3() {
  /* ============================
     Helpers
     ============================ */
  function debounce(fn, wait = 180) {
    let t = null;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }
  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function setButtonLoading(btn, isLoading, label) {
    if (!btn) return;
    if (isLoading) {
      if (btn.dataset._origHtml === undefined) btn.dataset._origHtml = btn.innerHTML;
      if (btn.dataset._origDisabled === undefined) btn.dataset._origDisabled = String(btn.disabled || false);
      btn.disabled = true;
      btn.classList.add('btn-loading');
      const spinner = `<span class="spinner" aria-hidden="true" style="display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid rgba(0,0,0,0.15);border-top-color:rgba(0,0,0,0.6);margin-right:8px;vertical-align:middle"></span>`;
      btn.innerHTML = `${spinner}${label || 'Processing...'}`;
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.classList.remove('btn-loading');
      btn.removeAttribute('aria-busy');
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
  function genReceiptId() {
    const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
    let word = 'ADM';
    try {
      if (window.currentAdmin && window.currentAdmin.name) {
        word = String(window.currentAdmin.name).split(/\s+/)[0].replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8) || 'ADM';
      }
    } catch (e) {}
    return `${digits}-${word}`;
  }

  /* ============================
     Menu entries (in-memory)
     ============================ */
  let _menuEntries = null;
  let currentMenuFilter = 'all';
  function normalizeSourceToEntries(source) {
    const entries = [];
    if (!Array.isArray(source)) return entries;
    source.forEach(it => {
      const cats = [];
      if (it.category) {
        if (Array.isArray(it.category)) cats.push(...it.category.map(c => String(c).toLowerCase()));
        else cats.push(String(it.category).toLowerCase());
      }
      if (Array.isArray(it.sizes) && it.sizes.length) {
        it.sizes.forEach(sz => entries.push({
          id: `${it.id || it.name}-${(sz.name||'').replace(/\s+/g,'')}`,
          name: it.name,
          sizeName: sz.name || '',
          price: Number(sz.price || 0),
          raw: it,
          categoryTags: cats.slice()
        }));
      } else {
        entries.push({
          id: String(it.id || it.name),
          name: it.name || String(it.id || ''),
          sizeName: it.sizeName || '',
          price: Number(it.price || 0),
          raw: it,
          categoryTags: cats.slice()
        });
      }
    });
    return entries;
  }
  async function buildMenuEntries() {
    let source = [];
    const candidates = [window.foodData, window.menuItems, window.menuFoodsData, window.menuList, window.allFoods, window.itemsList, window.menuFoods];
    for (const c of candidates) { if (Array.isArray(c) && c.length) { source = c; break; } }
    _menuEntries = normalizeSourceToEntries(source || []);
    return _menuEntries;
  }
  function getFilteredEntriesForModal(textFilter = '') {
    if (!_menuEntries) return [];
    let list = _menuEntries.slice();
    if (currentMenuFilter && currentMenuFilter !== 'all') {
      const cat = currentMenuFilter.toLowerCase();
      list = list.filter(e => (e.categoryTags || []).includes(cat));
    }
    if (textFilter) {
      const q = String(textFilter).trim().toLowerCase();
      list = list.filter(e => (`${e.name} ${e.sizeName} ${e.price}`).toLowerCase().includes(q));
    }
    return list;
  }

  /* ============================
     Recipients cache helpers & persistence
     - keep localStorage as backup to survive refreshes
     ============================ */
  const LS_KEY = 'recipientsCache_v2_tiptop';

  function normalizeRecipient(rec) {
    // make sure fields exist and types are consistent
    const r = Object.assign({}, rec);
    r.id = String(r.id || r._id || r.receiptId || '').trim();
    r.name = (r.name || r.customerName || r.nameText || '') + '';
    r.phone = (r.phone || '') + '';
    r.items = Array.isArray(r.items) ? r.items.map(it => ({
      id: it.id || it.itemId || it.name,
      name: it.name || it.description || '',
      sizeName: it.sizeName || it.size || '',
      price: Number(it.price || 0),
      qty: Number(it.qty || it.quantity || 0)
    })) : [];
    r.subtotal = Number(r.subtotal || r.subTotal || (r.items || []).reduce((s,i)=> s + (Number(i.price||0) * Number(i.qty||0)), 0));
    r.tax = Number(r.tax || r.taxAmount || 0);
    r.total = (typeof r.total === 'number') ? r.total : (r.subtotal + r.tax);
    r.totalQty = Number(r.totalQty || r.total_quantity || (r.items || []).reduce((s,i)=> s + Number(i.qty||0), 0));
    r.tableNumber = r.tableNumber || r.table || '';
    r.adminName = r.adminName || r.servedBy || r.admin || '';
    // normalize createdAt into Firestore-like { seconds: <int> } for consistent handling
    if (!r.createdAt) r.createdAt = { seconds: Math.floor(Date.now()/1000) };
    else if (r.createdAt && typeof r.createdAt === 'string') {
      const parsed = Date.parse(r.createdAt);
      r.createdAt = isNaN(parsed) ? { seconds: Math.floor(Date.now()/1000) } : { seconds: Math.floor(parsed/1000) };
    } else if (r.createdAt && r.createdAt.seconds) {
      // ok
    } else if (r.createdAt instanceof Date) {
      r.createdAt = { seconds: Math.floor(r.createdAt.getTime()/1000) };
    } else if (typeof r.createdAt === 'number') {
      r.createdAt = { seconds: Math.floor(r.createdAt/1000) };
    } else {
      r.createdAt = { seconds: Math.floor(Date.now()/1000) };
    }
    return r;
  }

  function saveCacheToLocal() {
    try {
      if (!window.recipientsCache) window.recipientsCache = [];
      localStorage.setItem(LS_KEY, JSON.stringify(window.recipientsCache));
    } catch (e) { console.warn('saveCacheToLocal failed', e); }
  }
  function loadCacheFromLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeRecipient);
    } catch (e) { console.warn('loadCacheFromLocal failed', e); return []; }
  }

  function removeRecipientFromCache(id) {
    if (!window.recipientsCache) return;
    window.recipientsCache = window.recipientsCache.filter(r => String(r.id) !== String(id));
    saveCacheToLocal();
  }
  function upsertRecipientToCache(rec) {
    if (!window.recipientsCache) window.recipientsCache = [];
    window.recipientsCache = window.recipientsCache.filter(r => String(r.id) !== String(rec.id));
    window.recipientsCache.unshift(normalizeRecipient(rec));
    saveCacheToLocal();
  }

  /* ============================
     DB loader: try common helper names then fallback to localStorage
     (keeps the UI stable across refreshes)
     ============================ */
  async function loadRecipientsFromDBOrLocal() {
    // Candidate function names on your window.FirebaseDB (common variants)
    const candidateFns = [
      'listRecipients', 'listAllRecipients', 'getRecipients', 'fetchRecipients', 'listRecipientsForAdmin', 'list', 'listAll', 'listRecipientsCollection'
    ];
    let items = [];
    try {
      if (window.FirebaseDB && typeof window.FirebaseDB === 'object') {
        for (const fn of candidateFns) {
          if (typeof window.FirebaseDB[fn] === 'function') {
            try {
              const res = await window.FirebaseDB[fn]();
              // common return shapes: { success:true, recipients: [...] } or { success:true, items: [...] } or an array
              if (!res) continue;
              if (Array.isArray(res)) { items = res; break; }
              if (res.success && Array.isArray(res.recipients)) { items = res.recipients; break; }
              if (res.success && Array.isArray(res.items)) { items = res.items; break; }
              if (res.recipients && Array.isArray(res.recipients)) { items = res.recipients; break; }
              if (res.items && Array.isArray(res.items)) { items = res.items; break; }
            } catch (inner) {
              // ignore and try next
              // console.warn('attempt db list failed', fn, inner);
            }
          }
        }
      }
    } catch (err) {
      console.warn('loadRecipientsFromDBOrLocal db attempt failed', err);
    }

    if (!items || !items.length) {
      // fallback to localStorage
      items = loadCacheFromLocal();
    } else {
      // normalize items and persist a local copy as backup
      items = items.map(normalizeRecipient);
      window.recipientsCache = items.slice();
      saveCacheToLocal();
    }
    // if window.recipientsCache not set yet, set it
    if (!window.recipientsCache || !window.recipientsCache.length) window.recipientsCache = items.map(normalizeRecipient);
    return window.recipientsCache;
  }

  /* ============================
     Printing (small thermal) — includes Served by and Table + headers
     ============================ */
  function printForSmallPrinter(r, opts = {}) {
    try {
      const createdAt = r.createdAt && r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000) : new Date();
      const formattedDate = createdAt.toLocaleString();
      const header = `<tr><th style="text-align:left;padding:4px 0;">Qty</th><th style="text-align:left;padding:4px 0;">Description</th><th style="text-align:right;padding:4px 0;">Price</th><th style="text-align:right;padding:4px 0;">Sub</th></tr>`;
      const itemsHtml = (r.items || []).map(it => {
        const sub = (Number(it.qty || 0) * Number(it.price || 0)).toFixed(2);
        if (opts.hidePrices) return `<tr><td style="padding:4px 0;">${escapeHtml(String(it.qty))}</td><td style="padding:4px 0;">${escapeHtml(it.name)}</td><td style="text-align:right;padding:4px 0;">--</td><td style="text-align:right;padding:4px 0;">--</td></tr>`;
        return `<tr><td style="padding:4px 0;">${escapeHtml(String(it.qty))}</td><td style="padding:4px 0;">${escapeHtml(it.name)}</td><td style="text-align:right;padding:4px 0;">$${Number(it.price||0).toFixed(2)}</td><td style="text-align:right;padding:4px 0;">$${sub}</td></tr>`;
      }).join('');
      const subtotal = Number(r.subtotal || 0);
      const tax = Number(r.tax || 0);
      const total = (typeof r.total === 'number') ? r.total : (subtotal + tax);
      const logoHtml = (opts.logo && (window.PRINT_LOGO_PATH || 'img/logo.png')) ? `<div style="text-align:center;margin-bottom:6px"><img src="${window.PRINT_LOGO_PATH || 'img/logo.png'}" alt="logo" style="max-width:120px;opacity:.95"></div>` : '';
      const servedBy = escapeHtml(r.adminName || (window.currentAdmin && (window.currentAdmin.name || window.currentAdmin.email)) || 'Admin');
      const tableNumber = escapeHtml(r.tableNumber || '-');
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(r.id)}</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        body{font-family:monospace;font-size:12px;line-height:1.08;width:280px;margin:0;padding:8px;color:#111}
        .center{text-align:center}
        table{width:100%;border-collapse:collapse}
        td,th{padding:4px 0}
        .tot{display:flex;justify-content:space-between;font-weight:700;margin-top:6px}
        .muted{color:#666;font-size:11px}
        .small{font-size:11px}
        @media print{body{width:280px}}
      </style>
      </head><body>
      ${logoHtml}
      <div class="center"><strong>${escapeHtml(window.RESTAURANT_NAME || 'TIP TOP')}</strong></div>
      <div class="center muted small">${escapeHtml(formattedDate)}</div>
      <div style="margin-top:6px">Receipt: ${escapeHtml(r.id)}</div>
      <div>Table: ${tableNumber}</div>
      <div>Served by: ${servedBy}</div>
      <hr>
      <table>
        <thead>${header}</thead>
        <tbody>${itemsHtml || '<tr><td colspan="4">No items</td></tr>'}</tbody>
      </table>
      <hr>
      <div class="tot"><div>Subtotal</div><div>${opts.hidePrices ? '--' : '$' + subtotal.toFixed(2)}</div></div>
      <div class="tot"><div>Tax</div><div>${opts.hidePrices ? '--' : '$' + tax.toFixed(2)}</div></div>
      <div class="tot"><div>TOTAL</div><div>${opts.hidePrices ? '--' : '$' + Number(total).toFixed(2)}</div></div>
      <hr>
      <div class="center muted small">Mahadsanid — Soo Noqosho Wanaagsan<br>Thanks for your business</div>
      <div class="center small" style="margin-top:6px">Visit us: www.tiptop.com</div>
      <script>window.onload=function(){window.print();setTimeout(()=>window.close(),600);};</script>
      </body></html>`;
      const w = window.open('', '_blank', 'toolbar=0,scrollbars=0,width=320,height=600');
      if (!w) return alert('Popup blocked. Allow popups to print receipt');
      w.document.open(); w.document.write(html); w.document.close();
    } catch (err) {
      console.error('printForSmallPrinter error', err);
      alert('Failed to print');
    }
  }

  /* ============================
     Period / filter helpers
     ============================ */
  function getPeriodRange(period) {
    const now = new Date();
    let from = null, to = null;
    if (period === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      const day = now.getDay();
      const daysBack = (day >= 6) ? (day - 6) : (day + 1);
      const start = new Date(now); start.setDate(now.getDate() - daysBack); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
      from = start; to = end;
    } else if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
      to = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
    } else if (period === 'year') {
      from = new Date(now.getFullYear(), 0, 1, 0,0,0,0);
      to = new Date(now.getFullYear(), 11, 31, 23,59,59,999);
    } else {
      from = new Date(0);
      to = new Date(8640000000000000);
    }
    return { from, to };
  }
  function periodPrettyLabel(period) {
    return ({ today: 'Today', week: 'This week', month: 'This month', year: 'This year', all: 'All' }[period] || period);
  }
  function filterRecipientsByPeriodAndQuery(period, q, fromDate, toDate) {
    const range = getPeriodRange(period);
    const arr = window.recipientsCache || [];
    const fromMs = fromDate ? new Date(fromDate).setHours(0,0,0,0) : range.from.getTime();
    const toMs = toDate ? new Date(toDate).setHours(23,59,59,999) : range.to.getTime();
    const qq = (q||'').trim().toLowerCase();
    return arr.filter(r => {
      const createdMs = (r.createdAt && r.createdAt.seconds) ? r.createdAt.seconds * 1000 : (r.createdAt ? new Date(r.createdAt).getTime() : 0);
      if (!createdMs) return false;
      if (createdMs < fromMs || createdMs > toMs) return false;
      if (!qq) return true;
      const hay = `${r.name || ''} ${r.phone || ''} ${r.id || ''} ${r.tableNumber || ''}`.toLowerCase();
      return hay.includes(qq);
    });
  }
  function updatePeriodTotalsUI(period, q='', fromDate=null, toDate=null) {
    const list = filterRecipientsByPeriodAndQuery(period, q, fromDate, toDate);
    const subtotalSum = list.reduce((s, r) => s + (Number(r.subtotal || 0)), 0);
    const totLabel = document.getElementById('totLabel');
    const totSubtotalAmount = document.getElementById('totSubtotalAmount');
    const totSubtotalCount = document.getElementById('totSubtotalCount');
    if (totLabel) totLabel.textContent = periodPrettyLabel(period);
    if (totSubtotalAmount) totSubtotalAmount.textContent = `$${subtotalSum.toFixed(2)}`;
    if (totSubtotalCount) totSubtotalCount.textContent = String(list.length);
  }

  /* ============================
     Export helpers
     ============================ */
  function downloadBlob(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  function buildCSVFromRecipients(list) {
    const headers = ['ReceiptID','Date','Name','Phone','Table','Qty','Subtotal','Tax','Total'];
    const rows = [headers.join(',')];
    list.forEach(r => {
      const date = r.createdAt && r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleString() : (r.createdAt ? new Date(r.createdAt).toLocaleString() : '');
      rows.push([
        `"${String(r.id).replace(/"/g,'""')}"`,
        `"${String(date).replace(/"/g,'""')}"`,
        `"${String(r.name||'').replace(/"/g,'""')}"`,
        `"${String(r.phone||'').replace(/"/g,'""')}"`,
        `"${String(r.tableNumber||'').replace(/"/g,'""')}"`,
        String(r.totalQty || 0),
        Number(r.subtotal||0).toFixed(2),
        Number(r.tax||0).toFixed(2),
        Number(r.total||0).toFixed(2)
      ].join(','));
    });
    return rows.join('\n');
  }
  function exportCSVForPeriod(period) {
    const q = (document.getElementById('recipientTopSearch')||{}).value || '';
    const from = (document.getElementById('recFromDate')||{}).value || null;
    const to = (document.getElementById('recToDate')||{}).value || null;
    const list = filterRecipientsByPeriodAndQuery(period, q, from, to);
    const csv = buildCSVFromRecipients(list);
    downloadBlob(`recipients-${period || 'all'}.csv`, csv, 'text/csv');
  }
  function exportExcelForPeriod(period) {
    const q = (document.getElementById('recipientTopSearch')||{}).value || '';
    const from = (document.getElementById('recFromDate')||{}).value || null;
    const to = (document.getElementById('recToDate')||{}).value || null;
    const csv = buildCSVFromRecipients(filterRecipientsByPeriodAndQuery(period, q, from, to));
    downloadBlob(`recipients-${period || 'all'}.xls`, csv, 'application/vnd.ms-excel');
  }
  function exportPDFForPeriod(period) {
    const q = (document.getElementById('recipientTopSearch')||{}).value || '';
    const from = (document.getElementById('recFromDate')||{}).value || null;
    const to = (document.getElementById('recToDate')||{}).value || null;
    const list = filterRecipientsByPeriodAndQuery(period, q, from, to);
    let rows = '';
    list.forEach(r => {
      const date = r.createdAt && r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleString() : (r.createdAt ? new Date(r.createdAt).toLocaleString() : '');
      rows += `<tr>
        <td>${escapeHtml(String(r.id))}</td>
        <td>${escapeHtml(String(date))}</td>
        <td>${escapeHtml(String(r.name||''))}</td>
        <td>${escapeHtml(String(r.tableNumber||''))}</td>
        <td style="text-align:right">${Number(r.subtotal||0).toFixed(2)}</td>
        <td style="text-align:right">${Number(r.tax||0).toFixed(2)}</td>
        <td style="text-align:right">${Number(r.total||0).toFixed(2)}</td>
      </tr>`;
    });
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Recipients report - ${escapeHtml(period)}</title>
    <style>body{font-family:Arial;margin:20px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{padding:6px;border:1px solid #ddd}th{background:#f5f5f5}.right{text-align:right}h1{font-size:18px}.muted{color:#666}</style>
    </head><body>
      <h1>Recipients report — ${escapeHtml(periodPrettyLabel(period))}</h1>
      <div class="muted">Generated: ${new Date().toLocaleString()}</div>
      <table><thead><tr><th>Receipt</th><th>Date</th><th>Name</th><th>Table</th><th>Subtotal</th><th>Tax</th><th>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No records</td></tr>'}</tbody></table>
      <div style="margin-top:12px">Generated by TipTop</div>
      <script>window.onload=function(){window.print();};</script>
    </body></html>`;
    const w = window.open('', '_blank'); if (!w) return alert('Popup blocked. Allow popups to export PDF'); w.document.open(); w.document.write(html); w.document.close();
  }

  /* ============================
     UI: Recipients list + New recipient modal
     Show/hide controls only on Recipients tab
     ============================ */
  async function initWhenReady() {
    const tabRecipientsBtn = document.getElementById('tabRecipients');
    const tabOrdersBtn = document.getElementById('tabOrders');
    const topNewBtn = document.getElementById('newRecipientTopBtn');
    const topSearch = document.getElementById('recipientTopSearch');
    const periodSelect = document.getElementById('periodSelect');
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');
    const exportWrapper = document.getElementById('exportWrapper');

    // hide controls by default
    if (topNewBtn) topNewBtn.style.display = 'none';
    if (topSearch) topSearch.style.display = 'none';
    if (periodSelect) periodSelect.style.display = 'none';
    if (exportWrapper) exportWrapper.style.display = 'none';
    if (document.getElementById('totalsSummary')) document.getElementById('totalsSummary').style.display = 'none';

    async function setupRecipientsUI() {
      const recipientsListRoot = document.getElementById('recipientsList');
      if (!recipientsListRoot) return false;
      if (recipientsListRoot.__recipientsUIInited) return true;
      recipientsListRoot.__recipientsUIInited = true;

      // ensure we have initial cache (load from DB or localStorage)
      await loadRecipientsFromDBOrLocal();

      function ensureToolbar() {
        if (document.getElementById('recipientsToolbar')) return document.getElementById('recipientsToolbar');
        const toolbar = document.createElement('div');
        toolbar.id = 'recipientsToolbar';
        toolbar.style.display = 'flex';
        toolbar.style.gap = '8px';
        toolbar.style.alignItems = 'center';
        toolbar.style.marginBottom = '8px';
        toolbar.innerHTML = `
          <input id="recSearchInput" placeholder="Search by name / table / id..." style="padding:8px; flex:1; min-width:160px; border:1px solid #ddd; border-radius:6px;">
          <input id="recFromDate" type="date" style="padding:6px; border:1px solid #ddd; border-radius:6px;">
          <input id="recToDate" type="date" style="padding:6px; border:1px solid #ddd; border-radius:6px;">
          <button id="recNewBtn" class="btn-small">+ New Recipient</button>
        `;
        recipientsListRoot.insertBefore(toolbar, recipientsListRoot.firstChild);
        return toolbar;
      }

      const toolbar = ensureToolbar();
      const recSearchInput = document.getElementById('recSearchInput');
      const recFromDate = document.getElementById('recFromDate');
      const recToDate = document.getElementById('recToDate');
      const recNewBtn = document.getElementById('recNewBtn');

      async function applyRecipientsFiltersAndRender() {
        const period = (document.getElementById('periodSelect') || {}).value || 'today';
        const fromDateVal = recFromDate && recFromDate.value ? recFromDate.value : null;
        const toDateVal = recToDate && recToDate.value ? recToDate.value : null;
        const q = (recSearchInput && recSearchInput.value || '').trim();

        // update header totals (subtotal-only)
        updatePeriodTotalsUI(period, q, fromDateVal, toDateVal);

        const filtered = filterRecipientsByPeriodAndQuery(period, q, fromDateVal, toDateVal);

        recipientsListRoot.querySelectorAll('.recipients-rows, .recipients-empty').forEach(n => n.remove());
        if (!filtered.length) {
          const no = document.createElement('div'); no.className = 'recipients-empty'; no.style.padding = '12px'; no.innerHTML = 'No recipients found for selected filters.'; recipientsListRoot.appendChild(no); return;
        }

        const rows = document.createElement('div'); rows.className = 'recipients-rows'; rows.style.display = 'flex'; rows.style.flexDirection = 'column'; rows.style.gap = '8px';

        filtered.forEach(r => {
          const created = r.createdAt && r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleString() : (r.createdAt ? String(r.createdAt) : '');
          const totalQty = (r.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0);
          const subtotal = Number(r.subtotal || 0);
          const tax = Number(r.tax || 0);
          const totalWithTax = (subtotal + tax).toFixed(2);

          const row = document.createElement('div');
          row.className = 'recipient-row';
          row.style.display = 'flex'; row.style.justifyContent = 'space-between'; row.style.alignItems = 'center'; row.style.padding = '10px'; row.style.borderBottom = '1px solid #eee';

          row.innerHTML = `
            <div style="min-width:0; flex:1">
              <div style="font-weight:800">${escapeHtml(r.name || '—')}</div>
              <div class="muted small">ID: ${escapeHtml(r.id || '')} • Table: ${escapeHtml(r.tableNumber || '—')} • ${escapeHtml(created)}</div>
            </div>
            <div style="width:240px; text-align:right; display:flex; gap:8px; align-items:center; justify-content:flex-end;">
              <div style="text-align:right; min-width:60px;">
                <div style="font-weight:900">${totalQty}</div>
                <div class="muted small">qty</div>
              </div>
              <div style="text-align:right; min-width:120px;">
                <div style="font-weight:900">$${totalWithTax}</div>
                <div class="muted small">subtotal(+tax)</div>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="btn-small rec-action" data-action="view" data-id="${escapeHtml(r.id)}">View</button>
                <button class="btn-small rec-action" data-action="edit" data-id="${escapeHtml(r.id)}">Edit</button>
                <button class="btn-small rec-action" data-action="delete" data-id="${escapeHtml(r.id)}">Delete</button>
                <button class="btn-small rec-action" data-action="print" data-id="${escapeHtml(r.id)}">Print</button>
              </div>
            </div>
          `;
          rows.appendChild(row);
        });

        recipientsListRoot.appendChild(rows);

        // actions delegation
        rows.addEventListener('click', (ev) => {
          const btn = ev.target.closest('button.rec-action'); if (!btn) return;
          const id = btn.dataset.id; const act = btn.dataset.action;
          if (act === 'view') return viewRecipientDetailed(id);
          if (act === 'edit') return editRecipientDetailed(id);
          if (act === 'delete') {
            if (!confirm('Delete receipt? This will permanently remove it. Continue?')) return;
            setButtonLoading(btn, true, 'Deleting...');
            removeRecipientFromCache(id);
            (async () => {
              try { if (window.FirebaseDB && typeof window.FirebaseDB.deleteRecipient === 'function') await window.FirebaseDB.deleteRecipient(id).catch(()=>null); } catch(e) { console.warn(e); }
              finally { setTimeout(()=> { try { setButtonLoading(btn, false); } catch(e){} }, 300); window.applyRecipientsFiltersAndRender && window.applyRecipientsFiltersAndRender(); }
            })();
            return;
          }
          if (act === 'print') {
            const rec = (window.recipientsCache||[]).find(x => String(x.id) === String(id));
            if (rec) return printForSmallPrinter(rec, { logo:true, hidePrices:false });
            if (window.FirebaseDB && typeof window.FirebaseDB.getRecipient === 'function') {
              window.FirebaseDB.getRecipient(id).then(rr => { if (rr && rr.success) printForSmallPrinter(rr.recipient, { logo:true, hidePrices:false }); }).catch(()=>null);
            } else alert('Receipt not available for printing');
          }
        });
      }

      // wire toolbar inputs
      if (recSearchInput) recSearchInput.addEventListener('input', debounce(() => {
        if (topSearch) topSearch.value = recSearchInput.value;
        applyRecipientsFiltersAndRender();
      }, 180));
      if (recFromDate) recFromDate.addEventListener('change', debounce(applyRecipientsFiltersAndRender, 80));
      if (recToDate) recToDate.addEventListener('change', debounce(applyRecipientsFiltersAndRender, 80));
      if (topSearch && recSearchInput) topSearch.addEventListener('input', debounce(() => { recSearchInput.value = topSearch.value || ''; applyRecipientsFiltersAndRender(); }, 180));

      /* ---------------------------
         New Recipient modal (SINGLE COLUMN, item picker)
         --------------------------- */
      async function openNewRecipientModal(prefill = {}) {
        let m = document.getElementById('newRecipientModal');
        if (!m) {
          m = document.createElement('div'); m.id = 'newRecipientModal'; m.className = 'cart-modal';
          Object.assign(m.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: 9999 });
          m.innerHTML = `
            <div class="cart-content" style="max-width:760px; width:96%; max-height:92vh; overflow:auto; box-sizing:border-box; padding:12px; background:#fff; border-radius:6px;">
              <div class="cart-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <h3 style="margin:0">New Recipient / Receipt</h3>
                <button id="closeNewRecipientModal" class="close-btn" style="font-size:20px;line-height:1;border:none;background:transparent;cursor:pointer">&times;</button>
              </div>
              <div id="nrMain" style="display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  <input id="nrName" placeholder="Customer name" value="" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;">
                  <input id="nrPhone" placeholder="Phone (optional)" style="width:160px;padding:8px;border:1px solid #ddd;border-radius:6px;">
                  <select id="nrTableSelect" style="width:140px;padding:8px;border:1px solid #ddd;border-radius:6px;">
                    <option value="">Table (optional)</option>
                  </select>
                  <button id="nrAddTableBtn" class="btn-small" title="Add table">+ Add Table</button>
                </div>
                <div style="display:flex;gap:8px">
                  <input id="nrAdmin" placeholder="Admin name" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;">
                  <input id="nrReceiptId" placeholder="Receipt ID (optional — you can type)" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;">
                </div>
                <hr style="margin:8px 0">
                <div style="display:flex;gap:8px;align-items:center">
                  <select id="nrCategorySelect" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:220px;">
                    <option value="all">All categories</option>
                    <option value="pizza">Pizza</option><option value="burger">Burgers</option><option value="sandwich">Sandwiches</option><option value="somali">Cuntada Dalka</option><option value="rice">Bariis / Rice</option><option value="fruits">Fruits</option><option value="juice">Juice</option><option value="breakfast">Breakfast</option><option value="extras">Extras / Sides</option>
                  </select>
                  <button id="nrToggleItemsBtn" class="btn-small">Select items</button>
                  <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
                    <label style="display:flex;align-items:center;gap:6px">Qty <input id="nrQty" type="number" min="1" value="1" style="width:72px;padding:6px;border:1px solid #ddd;border-radius:6px"></label>
                    <label style="display:flex;align-items:center;gap:6px">Tax % <input id="nrTaxPercent" type="number" value="5" min="0" step="0.1" style="width:80px;padding:6px;border:1px solid #ddd;border-radius:6px;"></label>
                    <button id="nrAddItemBtn" class="btn-small">Add Selected</button>
                  </div>
                </div>
                <div id="nrItemsPicker" style="display:none;border:1px solid #eee;border-radius:6px;max-height:260px;overflow:auto;padding:6px;background:#fff"></div>
                <div id="nrItemsTable" style="border:1px solid #f1f1f1;border-radius:6px;overflow:auto;max-height:260px;padding:8px"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
                  <div>
                    <small class="muted">Totals</small>
                    <div style="font-weight:800" id="nrTotals">Qty: 0 • Subtotal: $0.00 • Tax: $0.00 • Total: $0.00</div>
                  </div>
                  <div style="display:flex;gap:8px">
                    <button id="nrSaveBtn" class="btn-primary">Save Recipient</button>
                    <button id="nrCancelBtn" class="btn">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(m);
          m.querySelector('#closeNewRecipientModal').addEventListener('click', () => m.style.display = 'none');
          m.querySelector('#nrCancelBtn').addEventListener('click', () => m.style.display = 'none');
        }

        if (!_menuEntries) await buildMenuEntries();

        const mEl = document.getElementById('newRecipientModal');
        const pickerEl = mEl.querySelector('#nrItemsPicker');
        const catSel = mEl.querySelector('#nrCategorySelect');
        const toggleBtn = mEl.querySelector('#nrToggleItemsBtn');
        const addBtn = mEl.querySelector('#nrAddItemBtn');
        const qtyEl = mEl.querySelector('#nrQty');
        const tableSelect = mEl.querySelector('#nrTableSelect');

        function populateTableOptions() {
          tableSelect.innerHTML = '<option value="">Table (optional)</option>';
          window.tablesData = Array.isArray(window.tablesData) ? window.tablesData : (Array.isArray(window.availableTables) ? window.availableTables : (Array.isArray(JSON.parse(localStorage.getItem('tablesData')||'[]')) ? JSON.parse(localStorage.getItem('tablesData')||'[]') : []));
          if (Array.isArray(window.tablesData) && window.tablesData.length) {
            window.tablesData.forEach(t => {
              const label = (typeof t === 'object' && t.name) ? t.name : String(t);
              const val = (typeof t === 'object' && (t.id || t.name)) ? (t.id || t.name) : String(t);
              const o = document.createElement('option'); o.value = val; o.textContent = label; tableSelect.appendChild(o);
            });
          } else {
            const seen = new Set(); (window.recipientsCache || []).forEach(r => { if (r.tableNumber) seen.add(String(r.tableNumber)); });
            seen.forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; tableSelect.appendChild(o); });
          }
        }
        populateTableOptions();

        const addTableBtn = mEl.querySelector('#nrAddTableBtn');
        addTableBtn.onclick = async (e) => {
          e.preventDefault();
          const num = prompt('Enter table number/label (eg. Table #123 or 12):');
          if (!num) return;
          const label = String(num).trim(); if (!label) return;
          setButtonLoading(addTableBtn, true, 'Adding...');
          try {
            if (window.FirebaseDB && typeof window.FirebaseDB.saveTable === 'function') {
              const saved = await window.FirebaseDB.saveTable(label).catch(()=>null);
              if (saved && saved.success) { window.tablesData = Array.isArray(window.tablesData) ? window.tablesData : []; window.tablesData.unshift(saved.table.label); populateTableOptions(); mEl.querySelector('#nrTableSelect').value = saved.table.label; setButtonLoading(addTableBtn, false); return; }
            }
            window.tablesData = Array.isArray(window.tablesData) ? window.tablesData : [];
            if (!window.tablesData.includes(label)) { window.tablesData.push(label); try { localStorage.setItem('tablesData', JSON.stringify(window.tablesData)); } catch(e){} }
            populateTableOptions(); mEl.querySelector('#nrTableSelect').value = label;
          } catch (err) { console.warn(err); } finally { setButtonLoading(addTableBtn, false); }
        };

        function renderPickerItems() {
          pickerEl.innerHTML = '';
          const entries = getFilteredEntriesForModal('');
          if (!entries.length) { pickerEl.innerHTML = '<div style="padding:8px;color:#666">No items</div>'; return; }
          entries.forEach((e, idx) => {
            const d = document.createElement('div');
            d.className = 'nr-item';
            d.style.padding = '8px'; d.style.borderBottom = '1px solid #f1f1f1'; d.style.cursor = 'pointer'; d.style.display = 'flex'; d.style.justifyContent = 'space-between';
            d.dataset.idx = idx; d._entry = e;
            d.innerHTML = `<div style="min-width:0;overflow:hidden;text-overflow:ellipsis">${escapeHtml(e.name)}${e.sizeName ? ' — ' + escapeHtml(e.sizeName) : ''}</div><div style="margin-left:8px;white-space:nowrap">$${Number(e.price||0).toFixed(2)}</div>`;
            d.addEventListener('click', () => { pickerEl.querySelectorAll('.nr-item.selected').forEach(x => x.classList.remove('selected')); d.classList.add('selected'); });
            d.addEventListener('dblclick', () => addSelectedItem(e, Number(qtyEl.value || 1)));
            pickerEl.appendChild(d);
          });
        }
        renderPickerItems();

        catSel.value = currentMenuFilter || 'all';
        catSel.addEventListener('change', () => { currentMenuFilter = catSel.value || 'all'; if (!_menuEntries) buildMenuEntries().then(renderPickerItems); else renderPickerItems(); });

        toggleBtn.onclick = () => { pickerEl.style.display = (pickerEl.style.display === 'none' || pickerEl.style.display === '') ? 'block' : 'none'; if (pickerEl.style.display === 'block') pickerEl.scrollTop = 0; };

        let items = [];
        function renderItemsTable() {
          const box = mEl.querySelector('#nrItemsTable'); if (!box) return;
          if (!items.length) { box.innerHTML = '<div style="padding:12px; color:#666;">No items added yet.</div>'; }
          else {
            box.innerHTML = `
              <table style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:1px solid #eee;"><th style="text-align:left;padding:8px;">Qty</th><th style="text-align:left;padding:8px;">Description</th><th style="text-align:right;padding:8px;">Price</th><th style="text-align:right;padding:8px;">Sub</th><th style="padding:8px;"></th></tr>
                </thead>
                <tbody>
                  ${items.map((it, idx) => `
                    <tr>
                      <td style="padding:8px;">${it.qty}</td>
                      <td style="padding:8px;">${escapeHtml(it.name)} ${it.sizeName ? ' — ' + escapeHtml(it.sizeName) : ''}</td>
                      <td style="padding:8px; text-align:right;">$${Number(it.price||0).toFixed(2)}</td>
                      <td style="padding:8px; text-align:right;">$${(Number(it.price||0)*Number(it.qty||1)).toFixed(2)}</td>
                      <td style="padding:8px; text-align:right;"><button class="btn-small nr-remove" data-idx="${idx}">Remove</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
          }
          const taxPercent = parseFloat(mEl.querySelector('#nrTaxPercent').value || 0) || 0;
          const subtotal = items.reduce((s,i) => s + (Number(i.qty||0) * Number(i.price||0)), 0);
          const qtyTotal = items.reduce((s,i)=> s + Number(i.qty||0), 0);
          const totalTax = +(subtotal * (taxPercent / 100));
          const total = subtotal + totalTax;
          mEl.querySelector('#nrTotals').textContent = `Qty: ${qtyTotal} • Subtotal: $${subtotal.toFixed(2)} • Tax: $${totalTax.toFixed(2)} • Total: $${total.toFixed(2)}`;
          box.querySelectorAll('.nr-remove').forEach(b => b.addEventListener('click', () => { const idx = Number(b.dataset.idx); items.splice(idx,1); renderItemsTable(); }));
        }

        function addSelectedItem(entry, qtyVal) {
          const qty = Number(qtyVal || 1) || 1;
          items.push({ id: entry.id || entry.name, name: entry.name, sizeName: entry.sizeName || '', price: Number(entry.price||0), qty });
          renderItemsTable();
        }

        addBtn.onclick = () => {
          const sel = pickerEl.querySelector('.nr-item.selected');
          let entry = null;
          if (sel && sel._entry) entry = sel._entry;
          if (!entry) {
            const first = pickerEl.querySelector('.nr-item');
            if (first && first._entry) entry = first._entry;
          }
          if (!entry) return window.showToast ? showToast('Select an item first', 1400, 'info') : alert('Select an item first');
          addSelectedItem(entry, Number(qtyEl.value || 1));
        };

        mEl.querySelector('#nrSaveBtn').onclick = async () => {
          const saveBtn = mEl.querySelector('#nrSaveBtn');
          try {
            setButtonLoading(saveBtn, true, 'Saving receipt...');
            const name = (mEl.querySelector('#nrName').value || '').trim() || '';
            const phone = (mEl.querySelector('#nrPhone').value || '').trim() || '';
            const tableNumber = (mEl.querySelector('#nrTableSelect') ? (mEl.querySelector('#nrTableSelect').value || '').trim() : '');
            const adminName = (mEl.querySelector('#nrAdmin').value || (window.currentAdmin && (window.currentAdmin.name || window.currentAdmin.email)) || (localStorage.getItem('adminDoc') ? (JSON.parse(localStorage.getItem('adminDoc')||'{}').name||'') : '') || '').trim();
            const taxPercent = parseFloat(mEl.querySelector('#nrTaxPercent').value || 0) || 0;
            const receiptId = (mEl.querySelector('#nrReceiptId').value || '').trim();
            const finalId = receiptId || genReceiptId();
            if (!items.length) { alert('Add at least one item'); setButtonLoading(saveBtn, false); return; }
            const subtotal = items.reduce((s,i) => s + (Number(i.price||0) * Number(i.qty||0)), 0);
            const totalTax = +(subtotal * (taxPercent / 100));
            const total = +(subtotal + totalTax);
            const payload = {
              id: finalId, name, phone, tableNumber: tableNumber || '', items: items.map(i => ({ id:i.id, name:i.name, sizeName:i.sizeName, price: Number(i.price||0), qty: Number(i.qty||0) })),
              subtotal: subtotal, tax: totalTax, taxPercent: taxPercent, total: total, totalQty: items.reduce((s,i)=> s + Number(i.qty||0), 0),
              adminName: adminName || '', createdAt: null, status: 'pending'
            };

            // If DB helper exists, try saving to DB; on success upsert cache and localStorage.
            if (!window.FirebaseDB || typeof window.FirebaseDB.createRecipient !== 'function') {
              // fallback to local cache only (persist to localStorage)
              const serverId = payload.id;
              const newRec = { id: serverId, ...payload, createdAt: { seconds: Math.floor(Date.now()/1000) } };
              upsertRecipientToCache(newRec);
              window.showToast && showToast('Recipient saved (local)', 1400, 'success');
            } else {
              try {
                const res = await window.FirebaseDB.createRecipient(payload);
                if (!res || !res.success) {
                  console.error('createRecipient failed', res);
                  setButtonLoading(saveBtn, false);
                  return alert('Failed to save recipient');
                }
                const serverId = res.id || payload.id;
                const newRec = { id: serverId, ...payload, createdAt: { seconds: Math.floor(Date.now()/1000) } };
                upsertRecipientToCache(newRec);
                // persist local copy is done inside upsertRecipientToCache
                window.showToast && showToast('Recipient saved', 1600, 'confirmed');
              } catch (dbErr) {
                // error saving to DB — still keep local copy and notify user
                console.warn('createRecipient db error — saved locally', dbErr);
                const serverId = payload.id;
                const newRec = { id: serverId, ...payload, createdAt: { seconds: Math.floor(Date.now()/1000) } };
                upsertRecipientToCache(newRec);
                window.showToast && showToast('Recipient saved (local, DB failed)', 2400, 'warning');
              }
            }

            items = []; renderItemsTable();
            mEl.querySelector('#nrName').value = ''; mEl.querySelector('#nrPhone').value = ''; mEl.querySelector('#nrReceiptId').value = ''; mEl.querySelector('#nrTableSelect').value = ''; mEl.querySelector('#nrQty').value = '1';
            mEl.style.display = 'none';
            window.applyRecipientsFiltersAndRender && window.applyRecipientsFiltersAndRender();
          } catch (err) {
            console.error('save recipient failed', err); alert('Failed to save recipient');
          } finally { setButtonLoading(saveBtn, false); }
        };

        (function prefillAdmin(){
          let adminName = '';
          if (window.currentAdmin) {
            if (window.currentAdmin.adminDoc && (window.currentAdmin.adminDoc.name || window.currentAdmin.adminDoc.email)) adminName = window.currentAdmin.adminDoc.name || window.currentAdmin.adminDoc.email || '';
            else if (window.currentAdmin.name || window.currentAdmin.email) adminName = window.currentAdmin.name || window.currentAdmin.email || '';
          }
          if (!adminName) {
            try { const saved = JSON.parse(localStorage.getItem('adminDoc') || '{}'); if (saved && (saved.name || saved.email)) adminName = saved.name || saved.email || ''; } catch(e){}
          }
          const el = mEl.querySelector('#nrAdmin'); if (el) el.value = adminName;
        })();

        mEl.style.display = 'flex';
        if (!_menuEntries) buildMenuEntries().then(renderPickerItems); else renderPickerItems();
      } // end openNewRecipientModal

      if (recNewBtn) recNewBtn.addEventListener('click', (e) => { e.preventDefault(); openNewRecipientModal(); });
      if (topNewBtn) topNewBtn.addEventListener('click', (e) => { e.preventDefault(); openNewRecipientModal(); });

      (function tryInitMenuEntries() { if (!_menuEntries) buildMenuEntries(); })();
      applyRecipientsFiltersAndRender();

      window.applyRecipientsFiltersAndRender = applyRecipientsFiltersAndRender;
      window.renderRecipientsFromCache = applyRecipientsFiltersAndRender;

      return true;
    } // end setupRecipientsUI

    // Initialize if recipientsList exists now
    if (document.getElementById('recipientsList')) await setupRecipientsUI();

    // Tab show/hide handlers
    if (tabRecipientsBtn) {
      tabRecipientsBtn.addEventListener('click', () => {
        if (topNewBtn) topNewBtn.style.display = 'inline-flex';
        if (topSearch) topSearch.style.display = 'inline-block';
        if (periodSelect) periodSelect.style.display = '';
        if (exportWrapper) exportWrapper.style.display = '';
        if (document.getElementById('totalsSummary')) document.getElementById('totalsSummary').style.display = '';
        setTimeout(async () => {
          if (!document.getElementById('recipientsList')) await setupRecipientsUI();
          else { const recInput = document.getElementById('recSearchInput'); if (recInput && topSearch) { recInput.value = topSearch.value || ''; window.applyRecipientsFiltersAndRender && window.applyRecipientsFiltersAndRender(); } }
        }, 80);
      });
    }
    if (tabOrdersBtn) {
      tabOrdersBtn.addEventListener('click', () => {
        if (topNewBtn) topNewBtn.style.display = 'none';
        if (topSearch) topSearch.style.display = 'none';
        if (periodSelect) periodSelect.style.display = 'none';
        if (exportWrapper) exportWrapper.style.display = 'none';
        if (document.getElementById('totalsSummary')) document.getElementById('totalsSummary').style.display = 'none';
      });
    }

    // ensure recipients UI created if container appears later
    let tries = 0; const interval = setInterval(() => { if (document.getElementById('recipientsList')) { setupRecipientsUI(); clearInterval(interval); } else if (++tries > 12) clearInterval(interval); }, 140);

    /* ========= export menu wiring (safe to call immediately) ========= */
    window.__recipientsExports = { csv: exportCSVForPeriod, xls: exportExcelForPeriod, pdf: exportPDFForPeriod };

    // toggle export menu
    document.addEventListener('click', (e) => {
      if (!exportBtn || !exportMenu) return;
      if (e.target.closest && e.target.closest('#exportBtn')) {
        exportMenu.style.display = (exportMenu.style.display === 'block') ? 'none' : 'block';
        return;
      }
      if (!e.target.closest('#exportMenu') && !e.target.closest('#exportBtn')) exportMenu.style.display = 'none';
    });

    // export actions
    document.addEventListener('click', (e) => {
      const el = e.target.closest && e.target.closest('.export-action');
      if (!el) return;
      const type = el.dataset.type;
      const period = (document.getElementById('periodSelect') || {}).value || 'today';
      if (type === 'csv') window.__recipientsExports.csv(period);
      if (type === 'xls') window.__recipientsExports.xls(period);
      if (type === 'pdf') window.__recipientsExports.pdf(period);
      if (exportMenu) exportMenu.style.display = 'none';
    });

    // re-render & update totals when periodSelect changes
    if (periodSelect) periodSelect.addEventListener('change', () => {
      const p = periodSelect.value || 'today';
      const topQ = (document.getElementById('recipientTopSearch')||{}).value || '';
      const from = (document.getElementById('recFromDate')||{}).value || null;
      const to = (document.getElementById('recToDate')||{}).value || null;
      updatePeriodTotalsUI(p, topQ, from, to);
      setTimeout(()=> { try { window.applyRecipientsFiltersAndRender && window.applyRecipientsFiltersAndRender(); } catch(e){} }, 60);
    });

  } // end initWhenReady

  // View / print / edit wrappers
  window.viewRecipientDetailed = async function viewRecipientDetailed(id) {
    try {
      let r = (window.recipientsCache || []).find(x => String(x.id) === String(id));
      if (!r && window.FirebaseDB && typeof window.FirebaseDB.getRecipient === 'function') {
        const rr = await window.FirebaseDB.getRecipient(id).catch(() => null);
        if (rr && rr.success) r = rr.recipient;
      }
      if (!r) return alert('Receipt not found');
      const createdAt = r.createdAt && r.createdAt.seconds ? new Date(r.createdAt.seconds * 1000) : (r.createdAt ? new Date(r.createdAt) : new Date());
      const hh = String(createdAt.getHours()).padStart(2, '0'); const mm = String(createdAt.getMinutes()).padStart(2, '0');
      const dt = `${hh}:${mm} ${createdAt.toLocaleDateString()}`;
      const rows = (r.items || []).map(i => `<tr><td>${escapeHtml(String(i.qty || 0))}</td><td>${escapeHtml(i.name || '')}</td><td class="right">$${(Number(i.price || 0)).toFixed(2)}</td><td class="right">$${(Number(i.qty || 0) * Number(i.price || 0)).toFixed(2)}</td></tr>`).join('');
      const subtotal = Number(r.subtotal || 0); const tax = Number(r.tax || 0); const total = (typeof r.total === 'number') ? r.total : (subtotal + tax);
      const html = `<style>.right{text-align:right}.rec-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}</style>
        <div><b>Receipt ID:</b> ${escapeHtml(r.id)}</div>
        <div><b>Date:</b> ${escapeHtml(dt)}</div>
        <div><b>Table:</b> ${escapeHtml(r.tableNumber || '-')}</div>
        <div><b>Served by:</b> ${escapeHtml(r.adminName || (window.currentAdmin && (window.currentAdmin.name || window.currentAdmin.email)) || 'Admin')}</div>
        <hr>
        <table style="width:100%"><thead><tr><th>Qty</th><th>Description</th><th class="right">Price</th><th class="right">Sub</th></tr></thead><tbody>${rows}</tbody></table>
        <hr>
        <div style="text-align:right"><div><b>Subtotal:</b> $${subtotal.toFixed(2)}</div><div><b>Tax:</b> $${tax.toFixed(2)}</div><div><b>Total:</b> $${Number(total).toFixed(2)}</b></div></div>
        <div class="rec-actions"><button class="btn" onclick="window.printReceipt && window.printReceipt('${escapeHtml(r.id)}')">Print</button><button class="btn" onclick="window.editRecipientDetailed && window.editRecipientDetailed('${escapeHtml(r.id)}')">Edit</button><button class="btn btn-danger" onclick="if(confirm('Delete receipt? This will permanently remove it. Continue?')){ if(window.FirebaseDB && typeof window.FirebaseDB.deleteRecipient==='function'){ window.FirebaseDB.deleteRecipient('${escapeHtml(r.id)}').catch(()=>null);} window.recipientsCache = (window.recipientsCache||[]).filter(x=>x.id!== '${escapeHtml(r.id)}'); try{ localStorage.setItem('${LS_KEY}', JSON.stringify(window.recipientsCache)); }catch(e){} window.applyRecipientsFiltersAndRender && window.applyRecipientsFiltersAndRender(); }">Delete</button></div>`;
      (window.showModal || function(title, content){ let w = window.open('','_blank','width=620,height=640'); if(!w) return alert('Popup blocked'); w.document.write('<html><head><title>'+ (title||'') +'</title></head><body>'+content+'</body></html>'); })( 'Receipt', html );
    } catch (err) { console.error('viewRecipientDetailed error', err); alert('Failed to show receipt'); }
  };

  window.printReceipt = function printReceipt(id) {
    const r = (window.recipientsCache || []).find(x => String(x.id) === String(id));
    if (r) return printForSmallPrinter(r, { logo: true, hidePrices: false });
    if (window.FirebaseDB && typeof window.FirebaseDB.getRecipient === 'function') {
      window.FirebaseDB.getRecipient(id).then(rr => { if (rr && rr.success) printForSmallPrinter(rr.recipient, { logo: true, hidePrices: false }); }).catch(()=>null);
    } else { alert('Receipt not available for printing'); }
  };

  window.editRecipientDetailed = async function editRecipientDetailed(id) {
    try {
      let r = (window.recipientsCache || []).find(x => String(x.id) === String(id));
      if (!r && window.FirebaseDB && typeof window.FirebaseDB.getRecipient === 'function') {
        const rr = await window.FirebaseDB.getRecipient(id).catch(() => null);
        if (rr && rr.success) r = rr.recipient;
      }
      if (!r) return alert('Receipt not found');

      const mId = 'editRecipientModal';
      let m = document.getElementById(mId);
      if (!m) {
        m = document.createElement('div'); m.id = mId;
        Object.assign(m.style, { position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' });
        m.innerHTML = `
          <div style="max-width:760px;width:96%;background:#fff;padding:12px;border-radius:6px;max-height:92vh;overflow:auto">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <h3 style="margin:0">Edit Receipt</h3>
              <button id="closeEditModal" style="border:none;background:transparent;font-size:20px;cursor:pointer">&times;</button>
            </div>
            <div style="margin-top:8px">
              <input id="erName" placeholder="Customer name" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:6px">
              <input id="erPhone" placeholder="Phone" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin-bottom:6px">
              <div style="display:flex;gap:8px;align-items:center">
                <select id="erCategory" style="padding:8px;border:1px solid #ddd;border-radius:6px;width:220px">
                  <option value="all">All</option><option value="pizza">Pizza</option><option value="burger">Burgers</option><option value="sandwich">Sandwiches</option><option value="somali">Cuntada Dalka</option><option value="rice">Bariis / Rice</option><option value="fruits">Fruits</option><option value="juice">Juice</option><option value="breakfast">Breakfast</option><option value="extras">Extras / Sides</option>
                </select>
                <button id="erToggleItemsBtn" class="btn-small">Select items</button>
                <input id="erQty" type="number" min="1" value="1" style="width:72px;padding:6px;border:1px solid #ddd;border-radius:6px">
                <button id="erAddItemBtn" class="btn-small">Add Selected</button>
              </div>
              <div id="erItemsPicker" style="display:none;border:1px solid #eee;border-radius:6px;max-height:200px;overflow:auto;padding:6px;margin-top:6px"></div>
              <div id="erItems" style="margin-top:10px"></div>
              <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
                <button id="erSaveBtn" class="btn-primary">Save</button>
                <button id="erCancelBtn" class="btn">Cancel</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(m);
        m.querySelector('#closeEditModal').addEventListener('click', () => m.style.display = 'none');
        m.querySelector('#erCancelBtn').addEventListener('click', () => m.style.display = 'none');
      }

      if (!_menuEntries) await buildMenuEntries();
      const modal = document.getElementById(mId);
      modal.querySelector('#erName').value = r.name || '';
      modal.querySelector('#erPhone').value = r.phone || '';
      const picker = modal.querySelector('#erItemsPicker');
      const erItemsContainer = modal.querySelector('#erItems');

      function renderErItems() {
        const html = (r.items || []).map((it, idx) => `
          <div data-idx="${idx}" style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
            <input data-idx="${idx}" class="edit-qty" type="number" value="${it.qty}" min="1" style="width:80px;padding:6px">
            <input data-idx="${idx}" class="edit-name" value="${escapeHtml(it.name)}" style="flex:1;padding:6px">
            <input data-idx="${idx}" class="edit-price" type="number" step="0.01" value="${Number(it.price || 0)}" style="width:110px;padding:6px">
            <button class="btn btn-small edit-remove" data-idx="${idx}">Remove</button>
          </div>`).join('');
        erItemsContainer.innerHTML = html || '<div style="color:#666">No items</div>';
        modal.querySelectorAll('.edit-remove').forEach(b => b.addEventListener('click', (ev) => {
          const idx = Number(ev.currentTarget.dataset.idx); r.items.splice(idx, 1); window.recipientsCache = window.recipientsCache.map(rr => rr.id === r.id ? { ...rr, items: r.items } : rr); try{ localStorage.setItem(LS_KEY, JSON.stringify(window.recipientsCache)); }catch(e){} renderErItems();
        }));
      }
      renderErItems();

      function renderErPicker() {
        picker.innerHTML = '';
        const entries = getFilteredEntriesForModal('');
        if (!entries.length) { picker.innerHTML = '<div style="padding:8px;color:#666">No items</div>'; return; }
        entries.forEach(e => {
          const d = document.createElement('div'); d.style.padding = '8px'; d.style.borderBottom = '1px solid #f1f1f1'; d.style.cursor = 'pointer'; d._entry = e;
          d.innerHTML = `<div style="display:flex;justify-content:space-between"><div style="min-width:0;overflow:hidden;text-overflow:ellipsis">${escapeHtml(e.name)}${e.sizeName ? ' — ' + escapeHtml(e.sizeName) : ''}</div><div>$${Number(e.price).toFixed(2)}</div></div>`;
          d.addEventListener('click', () => { picker.querySelectorAll('.selected').forEach(x => x.classList.remove('selected')); d.classList.add('selected'); });
          d.addEventListener('dblclick', () => { const toAdd = d._entry; r.items.push({ id: toAdd.id, name: toAdd.name, sizeName: toAdd.sizeName, price: Number(toAdd.price||0), qty: Number(modal.querySelector('#erQty').value||1) }); window.recipientsCache = window.recipientsCache.map(rr => rr.id === r.id ? { ...rr, items: r.items } : rr); try{ localStorage.setItem(LS_KEY, JSON.stringify(window.recipientsCache)); }catch(e){} renderErItems(); });
          picker.appendChild(d);
        });
      }
      renderErPicker();

      modal.querySelector('#erToggleItemsBtn').onclick = () => { picker.style.display = (picker.style.display === 'none' || picker.style.display === '') ? 'block' : 'none'; };
      modal.querySelector('#erAddItemBtn').onclick = () => {
        const sel = picker.querySelector('.selected'); if (!sel || !sel._entry) return alert('Select an item first'); const e = sel._entry;
        r.items.push({ id: e.id, name: e.name, sizeName: e.sizeName || '', price: Number(e.price||0), qty: Number(modal.querySelector('#erQty').value||1) });
        window.recipientsCache = window.recipientsCache.map(rr => rr.id === r.id ? { ...rr, items: r.items } : rr); try{ localStorage.setItem(LS_KEY, JSON.stringify(window.recipientsCache)); }catch(e){} renderErItems();
      };

      modal.querySelector('#erSaveBtn').onclick = async () => {
        const saveBtn = modal.querySelector('#erSaveBtn');
        try {
          setButtonLoading(saveBtn, true, 'Saving...');
          const name = (modal.querySelector('#erName').value || '').trim();
          const phone = (modal.querySelector('#erPhone').value || '').trim();
          const newItems = [];
          modal.querySelectorAll('#erItems [data-idx]').forEach(div => {
            const qty = Number(div.querySelector('.edit-qty').value || 0);
            const nameI = div.querySelector('.edit-name').value || '';
            const price = Number(div.querySelector('.edit-price').value || 0);
            if (qty > 0) newItems.push({ qty, name: nameI, price });
          });
          const subtotal = newItems.reduce((s,i) => s + (Number(i.qty||0) * Number(i.price||0)), 0);
          const tax = Number(r.tax || 0);
          const total = subtotal + tax;
          const updates = { name, phone, items: newItems, subtotal, total, updatedAt: (typeof serverTimestamp === 'function' ? serverTimestamp() : new Date()) };
          if (window.FirebaseDB && typeof window.FirebaseDB.updateRecipient === 'function') {
            const res = await window.FirebaseDB.updateRecipient(r.id, updates).catch(()=>null);
            if (!res || !res.success) throw new Error('update failed');
          }
          window.recipientsCache = window.recipientsCache.map(rr => rr.id === r.id ? normalizeRecipient(Object.assign({}, rr, updates)) : rr);
          try{ localStorage.setItem(LS_KEY, JSON.stringify(window.recipientsCache)); }catch(e){}
          window.applyRecipientsFiltersAndRender && window.applyRecipientsFiltersAndRender();
          modal.style.display = 'none';
          window.showToast && window.showToast('Receipt updated', 1400, 'success');
        } catch (err) { console.error('save edit failed', err); alert('Failed to save changes'); } finally { setButtonLoading(saveBtn, false); }
      };

      modal.style.display = 'flex';
    } catch (err) { console.error('editRecipientDetailed error', err); alert('Failed to open editor'); }
  };

  // bootstrap
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWhenReady); else initWhenReady();

  // expose exports object
  window.__recipientsExports = { csv: exportCSVForPeriod, xls: exportExcelForPeriod, pdf: exportPDFForPeriod };

})();

// export menu global wiring (keeps it stable)
document.addEventListener('click', (e) => {
  const exportBtn = document.getElementById('exportBtn');
  const exportMenu = document.getElementById('exportMenu');
  if (exportBtn && exportMenu && e.target.closest && e.target.closest('#exportBtn')) {
    exportMenu.style.display = (exportMenu.style.display === 'block') ? 'none' : 'block';
    return;
  }
  if (exportMenu && !e.target.closest('#exportMenu') && !e.target.closest('#exportBtn')) exportMenu.style.display = 'none';
});
document.querySelectorAll('.export-action').forEach(b => b.addEventListener('click', (ev) => {
  const type = ev.currentTarget.dataset.type;
  const period = (document.getElementById('periodSelect') || {}).value || 'today';
  if (type === 'csv') window.__recipientsExports.csv(period);
  if (type === 'xls') window.__recipientsExports.xls(period);
  if (type === 'pdf') window.__recipientsExports.pdf(period);
}));





// call the initializer safely on DOM ready (keeps original page flow)
document.addEventListener('DOMContentLoaded', () => {
  try { initAdminOrdersContacts(); } catch(e) { console.warn('initAdminOrdersContacts failed', e); }
});



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

