
// small helper: wait for window.FirebaseDB to be defined (used when module hasn't finished loading)
function waitForFirebaseDB(ms = 4000) {
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

const params = new URLSearchParams(window.location.search);
const orderParam = params.get('id') || params.get('local') || null;
const roleParam = params.get('role') || null; // 'driver' or 'customer'

// DOM refs
const statusEl = document.getElementById('status');
const btnShare = document.getElementById('btnShareLocation');
const btnDriver = document.getElementById('btnStartDelivery');

// hide/show buttons by role param if provided
if (roleParam === 'driver') {
  if (btnShare) btnShare.style.display = 'none';
} else if (roleParam === 'customer') {
  if (btnDriver) btnDriver.style.display = 'none';
}

// state
let currentOrder = null;
let orderDocId = null;
let orderUnsub = null;
let deliveryWatchId = null;

async function resolveOrder(anyId) {
if (!anyId) return null;

// 1) Try direct Firestore doc fetch via helper getOrder (treat anyId as a doc id)
try {
if (window.FirebaseDB && typeof window.FirebaseDB.getOrder === 'function') {
  try {
    const r = await window.FirebaseDB.getOrder(anyId);
    if (r && r.success && r.order) {
      orderDocId = r.order.id || anyId;
      console.info('resolveOrder: found by getOrder (doc id).', orderDocId);
      return r.order;
    }
  } catch (e) {
    console.warn('resolveOrder: getOrder threw/failed. Will try other methods.', e);
  }
}
} catch (e) { console.warn('resolveOrder: unexpected getOrder error', e); }

// 2) Try the "any id" resolver (findOrderByAnyId) if available (looks by localId/remoteId)
try {
if (window.FirebaseDB && typeof window.FirebaseDB.findOrderByAnyId === 'function') {
  try {
    const r2 = await window.FirebaseDB.findOrderByAnyId(anyId);
    if (r2 && r2.success) {
      orderDocId = r2.docId || (r2.order && r2.order.id) || null;
      console.info('resolveOrder: found by findOrderByAnyId =>', orderDocId);
      return r2.order;
    } else {
      console.info('resolveOrder: findOrderByAnyId returned not-found or failed', r2 && r2.error);
    }
  } catch (e) {
    console.warn('resolveOrder: findOrderByAnyId threw/failed. Will try local fallback.', e);
  }
}
} catch (e) { console.warn('resolveOrder: unexpected findOrderByAnyId error', e); }

// 3) Fallback to localStorage visitor orders (client-side only)
try {
const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
if (Array.isArray(localOrders) && localOrders.length) {
  const found = localOrders.find(o => {
    const ids = [o.localId, o.remoteId, o.id].map(x => (typeof x === 'undefined' ? '' : String(x)));
    return ids.some(x => x === String(anyId));
  });
  if (found) {
    // if the local copy has a remote id, use that as orderDocId for later updates
    orderDocId = found.remoteId || found.id || null;
    console.info('resolveOrder: found in localStorage (fallback). docId=', orderDocId);
    return found;
  }
}
} catch (e) {
console.warn('resolveOrder: localStorage fallback failed', e);
}

// nothing found
console.warn('resolveOrder: no order found for id=', anyId);
return null;
}

// subscribe to realtime order changes when we have a doc id
function subscribeOrderRealtime(docId) {
  if (!docId || !window.FirebaseDB || typeof window.FirebaseDB.onOrderSnapshot !== 'function') return;
  if (orderUnsub) try { orderUnsub(); } catch(e){}
  orderUnsub = window.FirebaseDB.onOrderSnapshot(docId, (order) => {
    console.log('onOrderSnapshot data for', docId, order);
    currentOrder = order;
    renderOrder(order);
  });
}


function renderOrder(o) {
  if (!o) {
    statusEl.innerHTML = `<div style="color:#b00">Order ${orderParam || ''} not found.</div>`;
    return;
  }
  currentOrder = o;
  statusEl.innerHTML = `
    <div><strong>Order:</strong> ${o.id || o.localId || orderParam}</div>
    <div><strong>Customer:</strong> ${o.visitorName || '—'} • ${o.phone || '—'}</div>
    <div><strong>District / Area:</strong> ${o.district || '—'} / ${o.area || '—'}</div>
    <div><strong>Total:</strong> $${(o.total||0).toFixed(2)} • <strong>Status:</strong> ${(o.status||'pending')}</div>
    <div style="margin-top:8px; font-size:13px; color:#666;">Tap a button to share your location (will ask for permission).</div>
  `;
  // show map if locations present
  if (o.clientLocation && o.clientLocation.lat && o.clientLocation.lng) {
    // show customer location
    showMapForBoth(o.clientLocation, o.deliveryLocation);
  } else if (o.deliveryLocation && o.deliveryLocation.lat && o.deliveryLocation.lng) {
    showMapForBoth(o.clientLocation, o.deliveryLocation);
  } else {
    document.getElementById('mapCard').style.display = 'none';
  }
}

function showMapForBoth(clientLoc, deliveryLoc) {
  document.getElementById('mapCard').style.display = 'block';
  const frame = document.getElementById('map');
  // If both present, use Google Maps directions view (rider -> customer)
  if (clientLoc && clientLoc.lat && clientLoc.lng) {
    if (deliveryLoc && deliveryLoc.lat && deliveryLoc.lng) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${deliveryLoc.lat},${deliveryLoc.lng}&destination=${clientLoc.lat},${clientLoc.lng}&travelmode=driving`;
      frame.innerHTML = `<iframe src="${url}" style="width:100%; height:100%; border:0"></iframe>`;
    } else {
      const url = `https://www.google.com/maps?q=${clientLoc.lat},${clientLoc.lng}&z=16&output=embed`;
      frame.innerHTML = `<iframe src="${url}" style="width:100%; height:100%; border:0"></iframe>`;
    }
  } else if (deliveryLoc && deliveryLoc.lat && deliveryLoc.lng) {
    const url = `https://www.google.com/maps?q=${deliveryLoc.lat},${deliveryLoc.lng}&z=16&output=embed`;
    frame.innerHTML = `<iframe src="${url}" style="width:100%; height:100%; border:0"></iframe>`;
  } else {
    frame.innerHTML = `<div style="padding:12px;">Location not available yet.</div>`;
  }
}

// Fetch + subscribe
// Fetch + subscribe (robust)

// Fetch + subscribe (robust)
(async function init() {
  if (!orderParam) {
    statusEl.innerHTML = '<div style="color:#666">No order ID supplied in URL.</div>';
    return;
  }

  // WAIT for database.js to load and attach window.FirebaseDB (important on some browsers / load orders)
  const dbReady = await waitForFirebaseDB(4000);
  if (!dbReady) {
    console.warn('FirebaseDB helper not available after wait; will still try local fallback.');
  }

  // Try to resolve the order (server first, fallback local)
  let order = null;
  try {
    order = await resolveOrder(orderParam);
  } catch (err) {
    console.warn('init: resolveOrder threw:', err);
  }

  // If we got a result render it; otherwise show not found with console hint.
  if (order) {
    try {
      renderOrder(order);

      // If we resolved a Firestore doc id, subscribe to realtime updates
      if (orderDocId && window.FirebaseDB && typeof window.FirebaseDB.onOrderSnapshot === 'function') {
        try {
          subscribeOrderRealtime(orderDocId);
        } catch (e) {
          console.warn('init: subscribeOrderRealtime failed', e);
        }
      } else {
        // attempt to derive doc id if order contains remoteId later
        if (!orderDocId && order && (order.remoteId || order.id)) {
          orderDocId = order.remoteId || order.id;
          try { subscribeOrderRealtime(orderDocId); } catch (e) { /* ignore */ }
        }
      }
    } catch (e) {
      console.warn('init: error while rendering/subscribing:', e);
    }
    return;
  }

  // Nothing resolved — show helpful message + console hints
  statusEl.innerHTML = `<div style="color:#b00">Order ${orderParam} not found.</div>`;
  console.warn('Order could not be resolved. Check console for DB errors (permission-denied / missing helper).');

  // Helpful / automated debugging: if Firebase helper exists, try to call getOrder to capture error
  if (window.FirebaseDB && typeof window.FirebaseDB.getOrder === 'function') {
    try {
      const debug = await window.FirebaseDB.getOrder(orderParam);
      console.info('Debug getOrder returned:', debug);
    } catch (e) {
      console.warn('Debug getOrder threw:', e);
    }
  }
})();

// ---- Customer share handler ----
btnShare && btnShare.addEventListener('click', async () => {
  if (!navigator.geolocation) { alert('Geolocation not supported'); return; }

  // prefer the Firestore doc id if we have it
  let updateTarget = orderDocId || (currentOrder && (currentOrder.id || currentOrder.remoteId)) || orderParam;

  if (!updateTarget) {
    // attempt to resolve before sending
    const r = await resolveOrder(orderParam);
    updateTarget = orderDocId || (r && (r.id || r.remoteId)) || orderParam;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;

    // local update for visitor copy
    try {
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const idx = localOrders.findIndex(lo => String(lo.localId || lo.remoteId || lo.id || '') === String(orderParam));
      if (idx !== -1) {
        localOrders[idx].clientLocation = { lat, lng, ts: Date.now() };
        localStorage.setItem('orders', JSON.stringify(localOrders));
      }
    } catch (e) { console.warn('local save failed', e); }

    // server update (resolves doc id inside if required)
    if (window.FirebaseDB && typeof window.FirebaseDB.updateOrderLocation === 'function') {
      try {
        console.log('Sending updateOrderLocation -> target:', updateTarget, { lat, lng });
        const upd = await window.FirebaseDB.updateOrderLocation(updateTarget || orderParam, { lat, lng });
        console.log('updateOrderLocation response:', upd);
        if (upd && upd.success) {
          // If the helper returned a docId, store it for later subscriptions/updates
          if (upd.docId) orderDocId = upd.docId;
          // refresh UI from the newly shared location (client + maybe delivery)
          showMapForBoth({lat,lng}, currentOrder && currentOrder.deliveryLocation ? currentOrder.deliveryLocation : null);
          showToast && showToast('Location shared');
        } else {
          console.warn('updateOrderLocation failed result:', upd);
          showToast && showToast('Could not send location to server (still shared locally).');
        }
      } catch (err) {
        console.warn('updateOrderLocation threw:', err);
        showToast && showToast('Failed to send location to server — see console.');
      }
    } else {
      // no server helper: shared only locally
      showMapForBoth({lat,lng}, currentOrder && currentOrder.deliveryLocation ? currentOrder.deliveryLocation : null);
      showToast && showToast('Location saved locally (no server).');
    }
  }, (err) => {
    alert('Unable to get location — please allow location permission.');
  }, { enableHighAccuracy:true, timeout:15000 });
});


// ---- Driver start delivery (continuous watch) ----
btnDriver && btnDriver.addEventListener('click', async () => {
  if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
  if (!confirm('Start sharing your location for this delivery?')) return;
  // resolve target doc id
  const target = orderDocId || (currentOrder && (currentOrder.id || currentOrder.remoteId)) || orderParam;

  if (!window.FirebaseDB || typeof window.FirebaseDB.updateDeliveryLocation !== 'function') {
    showToast && showToast('Server delivery helper not available. Coordinates will be stored locally only.');
  }

  if (deliveryWatchId !== null) {
    showToast && showToast('Already sharing location');
    return;
  }
  deliveryWatchId = navigator.geolocation.watchPosition(async (pos) => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    const target = orderDocId || (currentOrder && (currentOrder.id || currentOrder.remoteId)) || orderParam;
    try {
      if (window.FirebaseDB && typeof window.FirebaseDB.updateDeliveryLocation === 'function') {
        console.log('Sending updateDeliveryLocation -> target:', target, { lat, lng });
        const upd = await window.FirebaseDB.updateDeliveryLocation(target || orderParam, { lat, lng });
        console.log('updateDeliveryLocation response:', upd);
        if (upd && upd.success && upd.docId) orderDocId = upd.docId;
      } else {
        localStorage.setItem('delivery_' + (orderParam||'unknown'), JSON.stringify({ lat, lng, ts:Date.now() }));
      }
    } catch(e) {
      console.warn('updateDeliveryLocation failed:', e);
    }
    const clientLoc = currentOrder && currentOrder.clientLocation ? currentOrder.clientLocation : null;
    showMapForBoth(clientLoc, {lat,lng});
  }, (err) => {
    console.warn('watchPosition error', err);
    alert('Unable to watch position. Please allow location and ensure GPS is ON.');
  }, { enableHighAccuracy:true, maximumAge:2000, timeout:10000 });
  
  showToast && showToast('Delivery location sharing started. Keep this page open.');
});

