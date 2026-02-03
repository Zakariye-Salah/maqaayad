// order-track.js (replace your old file with this)
// Requires: leaflet (you already included it in head), database.js exposing window.FirebaseDB
// Features:
// - Clean Leaflet map with OSM tiles
// - Rider & customer icons (use img/motorcycle.png and img/home.png if present, else default markers)
// - Smooth marker movement animation
// - Heading arrow (divIcon with SVG) for rider
// - OSRM route request for real-road routing (free)
// - GPS heuristics (accuracy, impossible speed) to detect suspicious/faked locations
// - Device lock (deviceId stored in localStorage) for rider updates
// - Alert on long stationary stop; accuracy warnings
// - Uses watchPosition enableHighAccuracy:true

// ---------- Config ----------
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving'; // free public OSRM
const DEVICE_ID_KEY = 'rider_device_id';
const MOVEMENT_ALERT_MINUTES = 5; // stationary alert
const STATIONARY_DIST_METERS = 15; // considered stopped if moved < 15m in alert window
const SMOOTH_ANIM_MS = 800; // marker move animation duration
const FAKE_GPS_MAX_SPEED_MPS = 40; // ~144 km/h; if reported speed > this, suspicious
const FAKE_GPS_MAX_ACCURACY_M = 200; // if accuracy > this, suspicious (heuristic)

// ---------- Helpers ----------
function generateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'device_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
const deviceId = generateDeviceId();

function showToast(msg, ttl = 3000) {
  // minimal toast + console fallback
  console.info('[toast]', msg);
  let el = document.getElementById('__toastDiv');
  if (!el) {
    el = document.createElement('div');
    el.id = '__toastDiv';
    Object.assign(el.style, {
      position: 'fixed', right: '12px', bottom: '12px',
      background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '10px 12px',
      borderRadius: '8px', zIndex: 99999, fontSize: '13px'
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.style.display='none', ttl);
}

// haversine (meters)
function _distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = v => v * Math.PI / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// animate marker to new latlng smoothly (linear interpolation)
function animateMarkerTo(marker, targetLatLng, duration = SMOOTH_ANIM_MS) {
  if (!marker) return Promise.resolve();
  const start = marker.getLatLng();
  const startTime = performance.now();
  const end = L.latLng(targetLatLng[0], targetLatLng[1]);
  return new Promise(resolve => {
    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const lat = start.lat + (end.lat - start.lat) * t;
      const lng = start.lng + (end.lng - start.lng) * t;
      marker.setLatLng([lat, lng]);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

// create heading icon as divIcon containing rotated SVG arrow
function createHeadingIcon(color = '#007bff', size = 36, rotation = 0) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(${rotation}deg);">
      <path d="M12 2 L19 21 L12 17 L5 21 Z" fill="${color}" stroke="#ffffff" stroke-width="0.5"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
}

// create image icon (motorcycle/home) with fallback simple marker
function createImageIcon(url, size = [36, 36]) {
  return L.icon({
    iconUrl: url,
    iconSize: size,
    iconAnchor: [size[0]/2, size[1]/2],
    popupAnchor: [0, -size[1]/2]
  });
}

// draw real route using OSRM
async function getOsrmRoute(from, to) {
  // from and to are [lat, lng]
  try {
    const url = `${OSRM_ROUTE_URL}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('OSRM route failed', res.status);
      return null;
    }
    const data = await res.json();
    if (!data.routes || !data.routes.length) return null;
    return data.routes[0];
  } catch (err) {
    console.warn('getOsrmRoute error', err);
    return null;
  }
}

// ---------- DOM refs & setup ----------
const params = new URLSearchParams(window.location.search);
const orderParam = params.get('id') || params.get('local') || null;
const roleParam = params.get('role') || null; // 'driver' or 'customer'
const statusEl = document.getElementById('status');
const btnShare = document.getElementById('btnShareLocation');
const btnDriver = document.getElementById('btnStartDelivery');

if (roleParam === 'driver') {
  if (btnShare) btnShare.style.display = 'none';
} else if (roleParam === 'customer') {
  if (btnDriver) btnDriver.style.display = 'none';
}

// map globals
let map = null;
let markers = { client: null, rider: null };
let headingMarker = null;
let routeLayer = null;
let lastRiderUpdate = null;
let stationaryStart = null;
let lastRiderPos = null;

// load custom icons (please include these files in img/)
const riderImg = 'img/motorcycle.png';
const clientImg = 'img/home.png';

let riderIcon = null, clientIcon = null;
fetch(riderImg, { method: 'HEAD' }).then(r => { if (r.ok) riderIcon = createImageIcon(riderImg, [42, 42]); }).catch(()=>{});
fetch(clientImg, { method: 'HEAD' }).then(r => { if (r.ok) clientIcon = createImageIcon(clientImg, [36,36]); }).catch(()=>{});

// Wait for Firebase helper
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

// ------------- Map rendering function -------------
function ensureMap() {
  if (map) return;
  const frame = document.getElementById('map');
  frame.innerHTML = '<div id="leafletMap" style="width:100%; height:100%"></div><div id="mapExtras" style="padding:8px"></div>';
  map = L.map('leafletMap', { zoomControl: true }).setView([0,0], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

// Render order object onto page & map
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

  // decide what to show on map (client = customer)
  if ( (o.clientLocation && o.clientLocation.lat && o.clientLocation.lng) || (o.deliveryLocation && o.deliveryLocation.lat && o.deliveryLocation.lng) ) {
    document.getElementById('mapCard').style.display = 'block';
    ensureMap();
    updateMapFromOrder(o);
  } else {
    document.getElementById('mapCard').style.display = 'none';
  }
}

// update markers & route from current order object
async function updateMapFromOrder(o) {
  ensureMap();
  const clientLoc = o.clientLocation && typeof o.clientLocation.lat !== 'undefined' && typeof o.clientLocation.lng !== 'undefined'
    ? [parseFloat(o.clientLocation.lat), parseFloat(o.clientLocation.lng)]
    : null;
  const riderLoc = o.deliveryLocation && typeof o.deliveryLocation.lat !== 'undefined' && typeof o.deliveryLocation.lng !== 'undefined'
    ? [parseFloat(o.deliveryLocation.lat), parseFloat(o.deliveryLocation.lng)]
    : null;

  // place/update client marker
  if (clientLoc) {
    if (!markers.client) {
      markers.client = L.marker(clientLoc, { icon: clientIcon || undefined, title: 'Customer' }).addTo(map).bindPopup('Customer location');
    } else {
      await animateMarkerTo(markers.client, clientLoc, SMOOTH_ANIM_MS);
    }
    markers.client.setLatLng(clientLoc);
  }

  // rider marker + heading
  if (riderLoc) {
    // if no marker create heading icon + marker group
    if (!markers.rider) {
      // rider marker uses heading icon for rotation; fallback to image icon if provided
      if (riderIcon) {
        markers.rider = L.marker(riderLoc, { icon: riderIcon, title: 'Rider' }).addTo(map).bindPopup('Rider location');
      } else {
        // create heading marker initially pointing north
        headingMarker = L.marker(riderLoc, { icon: createHeadingIcon('#d35400', 36, 0) }).addTo(map).bindPopup('Rider (heading)');
        markers.rider = headingMarker;
      }
    } else {
      await animateMarkerTo(markers.rider, riderLoc, SMOOTH_ANIM_MS);
    }
    markers.rider.setLatLng(riderLoc);
  }

  // draw route if both present using OSRM
  if (clientLoc && riderLoc) {
    // remove old route
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    const route = await getOsrmRoute(riderLoc, clientLoc);
    if (route && route.geometry) {
      routeLayer = L.geoJSON(route.geometry, { style: { color: '#2c81f7', weight: 5, opacity: 0.9 } }).addTo(map);
      map.fitBounds(routeLayer.getBounds().pad(0.25));

      // show ETA & distance
      const distanceKm = (route.distance / 1000).toFixed(2);
      const durationMin = Math.max(1, Math.round(route.duration / 60));
      const extras = document.getElementById('mapExtras');
      extras.innerHTML = `
        <div class="map-info">🏍️ <strong>Motorcycle route</strong> • Distance ${distanceKm} km • ETA ${durationMin} min</div>
        <div class="map-controls">
          <a class="btn btn-primary" href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(riderLoc[0]+','+riderLoc[1])}&destination=${encodeURIComponent(clientLoc[0]+','+clientLoc[1])}&travelmode=driving" target="_blank" rel="noopener">Open directions (Google)</a>
          <a class="btn" style="margin-left:8px" href="https://www.google.com/maps?q=${encodeURIComponent(clientLoc[0]+','+clientLoc[1])}&z=16" target="_blank" rel="noopener">Open customer in Maps</a>
          <a class="btn" style="margin-left:8px" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(clientLoc[0]+','+clientLoc[1])}" target="_blank" rel="noopener">Street View</a>
        </div>
      `;
    } else {
      // fallback to straight line if route fails
      if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
      routeLayer = L.polyline([riderLoc, clientLoc], { color: '#2c81f7', weight: 4 }).addTo(map);
      map.fitBounds(routeLayer.getBounds().pad(0.25));
    }
  } else if (clientLoc) {
    // only client
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    map.setView(clientLoc, 15);
    document.getElementById('mapExtras').innerHTML = `<div class="map-info">Customer location</div>`;
  } else if (riderLoc) {
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    map.setView(riderLoc, 15);
    document.getElementById('mapExtras').innerHTML = `<div class="map-info">Rider location</div>`;
  }
}

// ---------- resolveOrder + subscribe (same as before, kept robust) ----------
async function resolveOrder(anyId) {
  if (!anyId) return null;
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

  try {
    const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    if (Array.isArray(localOrders) && localOrders.length) {
      const found = localOrders.find(o => {
        const ids = [o.localId, o.remoteId, o.id].map(x => (typeof x === 'undefined' ? '' : String(x)));
        return ids.some(x => x === String(anyId));
      });
      if (found) {
        orderDocId = found.remoteId || found.id || null;
        console.info('resolveOrder: found in localStorage (fallback). docId=', orderDocId);
        return found;
      }
    }
  } catch (e) { console.warn('resolveOrder: localStorage fallback failed', e); }

  console.warn('resolveOrder: no order found for id=', anyId);
  return null;
}

function subscribeOrderRealtime(docId) {
  if (!docId || !window.FirebaseDB || typeof window.FirebaseDB.onOrderSnapshot !== 'function') return;
  if (orderUnsub) try { orderUnsub(); } catch(e){}
  orderUnsub = window.FirebaseDB.onOrderSnapshot(docId, (order) => {
    console.log('onOrderSnapshot data for', docId, order);
    currentOrder = order;
    renderOrder(order);
  });
}

// ---------- init ----------
let currentOrder = null;
let orderDocId = null;
let orderUnsub = null;
(async function init() {
  if (!orderParam) {
    statusEl.innerHTML = '<div style="color:#666">No order ID supplied in URL.</div>';
    return;
  }

  const dbReady = await waitForFirebaseDB(4000);
  if (!dbReady) {
    console.warn('FirebaseDB helper not available after wait; will still try local fallback.');
  }

  let order = null;
  try { order = await resolveOrder(orderParam); } catch (err) { console.warn('init: resolveOrder threw:', err); }

  if (order) {
    try {
      renderOrder(order);
      if (orderDocId && window.FirebaseDB && typeof window.FirebaseDB.onOrderSnapshot === 'function') {
        try { subscribeOrderRealtime(orderDocId); } catch (e) { console.warn('init: subscribeOrderRealtime failed', e); }
      } else {
        if (!orderDocId && order && (order.remoteId || order.id)) {
          orderDocId = order.remoteId || order.id;
          try { subscribeOrderRealtime(orderDocId); } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { console.warn('init: error while rendering/subscribing:', e); }
    return;
  }

  statusEl.innerHTML = `<div style="color:#b00">Order ${orderParam} not found.</div>`;
  console.warn('Order could not be resolved. Check console for DB errors (permission-denied / missing helper).');
  if (window.FirebaseDB && typeof window.FirebaseDB.getOrder === 'function') {
    try {
      const debug = await window.FirebaseDB.getOrder(orderParam);
      console.info('Debug getOrder returned:', debug);
    } catch (e) { console.warn('Debug getOrder threw:', e); }
  }
})();

// ---------- Customer share (one-shot) ----------
btnShare && btnShare.addEventListener('click', async () => {
  if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
  let updateTarget = orderDocId || (currentOrder && (currentOrder.id || currentOrder.remoteId)) || orderParam;
  if (!updateTarget) {
    const r = await resolveOrder(orderParam);
    updateTarget = orderDocId || (r && (r.id || r.remoteId)) || orderParam;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    try {
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const idx = localOrders.findIndex(lo => String(lo.localId || lo.remoteId || lo.id || '') === String(orderParam));
      if (idx !== -1) {
        localOrders[idx].clientLocation = { lat, lng, ts: Date.now() };
        localStorage.setItem('orders', JSON.stringify(localOrders));
      }
    } catch (e) { console.warn('local save failed', e); }

    if (window.FirebaseDB && typeof window.FirebaseDB.updateOrderLocation === 'function') {
      try {
        console.log('Sending updateOrderLocation -> target:', updateTarget, { lat, lng });
        const upd = await window.FirebaseDB.updateOrderLocation(updateTarget || orderParam, { lat, lng, deviceId });
        console.log('updateOrderLocation response:', upd);
        if (upd && upd.success) {
          if (upd.docId) orderDocId = upd.docId;
          showMapFromLive(lat, lng);
          showToast('Location shared');
        } else {
          console.warn('updateOrderLocation failed result:', upd);
          showToast('Could not send location to server (still shared locally).');
        }
      } catch (err) {
        console.warn('updateOrderLocation threw:', err);
        showToast('Failed to send location to server — see console.');
      }
    } else {
      showMapFromLive(lat, lng);
      showToast('Location saved locally (no server).');
    }
  }, (err) => {
    alert('Unable to get location — please allow location permission.');
  }, { enableHighAccuracy:true, timeout:15000 });
});

function showMapFromLive(lat, lng) {
  // quick local map update for immediate view
  const c = { clientLocation: { lat, lng } };
  renderOrder(Object.assign({}, currentOrder || {}, c));
}

// ---------- Rider continuous sharing (watch) ----------
btnDriver && btnDriver.addEventListener('click', async () => {
  if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
  if (!confirm('Start sharing your location for this delivery?')) return;
  const target = orderDocId || (currentOrder && (currentOrder.id || currentOrder.remoteId)) || orderParam;

  if (!window.FirebaseDB || typeof window.FirebaseDB.updateDeliveryLocation !== 'function') {
    showToast('Server delivery helper not available. Coordinates will be stored locally only.');
  }

  if (deliveryWatchId !== null) {
    showToast('Already sharing location');
    return;
  }

  // start watch
  deliveryWatchId = navigator.geolocation.watchPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = pos.coords.accuracy || 9999;
    const spd = pos.coords.speed || 0;
    const heading = pos.coords.heading || 0;
    const ts = Date.now();

    // simple fake GPS/suspicious heuristics:
    let suspicious = false;
    if (acc > FAKE_GPS_MAX_ACCURACY_M) suspicious = true;
    if (spd && spd > FAKE_GPS_MAX_SPEED_MPS) suspicious = true;

    // compute jump distance from lastRiderPos in meters
    if (lastRiderPos) {
      const d = _distanceMeters(lastRiderPos.lat, lastRiderPos.lng, lat, lng);
      const dt = Math.max(1, (ts - lastRiderPos.ts) / 1000); // seconds
      const impliedSpeed = (d / dt); // m/s
      // if impliedSpeed is impossibly high ( > 40 m/s ~ 144 km/h) mark suspicious
      if (impliedSpeed > FAKE_GPS_MAX_SPEED_MPS) suspicious = true;
      // stationary detection
      if (d < STATIONARY_DIST_METERS) {
        if (!stationaryStart) stationaryStart = ts;
      } else {
        stationaryStart = null;
      }
    } else {
      stationaryStart = null;
    }

    // persist lastRiderPos for next iteration
    lastRiderPos = { lat, lng, ts };

    // show local UI warning if suspicious
    if (suspicious) {
      showToast('Rider GPS signal looks unreliable (accuracy or speed). Ask rider to enable high accuracy GPS.', 6000);
    }

    // update local map immediately (smooth animate)
    const clientLoc = currentOrder && currentOrder.clientLocation ? currentOrder.clientLocation : null;
    renderOrder({
      ...currentOrder,
      deliveryLocation: { lat, lng, accuracy: acc, speed: spd, heading, ts }
    });

    // Advance: send update to server with deviceId (so we can lock to device)
    if (window.FirebaseDB && typeof window.FirebaseDB.updateDeliveryLocation === 'function') {
      try {
        const upd = await window.FirebaseDB.updateDeliveryLocation(target || orderParam, { lat, lng, deviceId });
        console.log('updateDeliveryLocation response:', upd);
        if (upd && upd.success && upd.docId) orderDocId = upd.docId;
      } catch (e) {
        console.warn('updateDeliveryLocation failed:', e);
      }
    } else {
      // local fallback
      localStorage.setItem('delivery_' + (orderParam||'unknown'), JSON.stringify({ lat, lng, ts }));
    }

    // alert if stationary for too long
    if (stationaryStart && (Date.now() - stationaryStart) > (MOVEMENT_ALERT_MINUTES * 60 * 1000)) {
      showToast(`Rider hasn't moved in ${MOVEMENT_ALERT_MINUTES} minutes — check with rider`, 8000);
      // reset start so we don't spam
      stationaryStart = Date.now();
    }

  }, (err) => {
    console.warn('watchPosition error', err);
    alert('Unable to watch position. Please allow location and ensure GPS is ON and permission granted.');
  }, { enableHighAccuracy:true, maximumAge:2000, timeout:10000 });

  showToast('Delivery location sharing started. Keep this page open.');
});
