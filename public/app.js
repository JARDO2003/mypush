// ── PULSE ANIMATION ──
(function() {
  const canvas = document.getElementById('pulseCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 580;
  const H = 56;
  canvas.width = W;
  canvas.height = H;

  let active = false;
  let offset = 0;

  function drawPulse() {
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    ctx.strokeStyle = active ? 'rgba(226,201,126,0.7)' : 'rgba(240,237,232,0.12)';
    ctx.lineWidth = 1.5;
    const step = 4;
    const mid = H / 2;
    let x = 0;
    ctx.moveTo(0, mid);
    while (x < W) {
      const phase = (x + offset) % 80;
      let y = mid;
      if (phase > 30 && phase < 36)      y = mid - 22;
      else if (phase >= 36 && phase < 40) y = mid + 10;
      else if (phase >= 40 && phase < 44) y = mid - 6;
      else if (phase >= 44 && phase < 48) y = mid + 2;
      ctx.lineTo(x, y);
      x += step;
    }
    ctx.stroke();
    offset = active ? (offset + 1.5) % 80 : offset;
    requestAnimationFrame(drawPulse);
  }

  drawPulse();
  window._setPulseActive = function(val) { active = val; };
})();

// ── CONFIG ──
const firebaseConfig = {
  apiKey:            "AIzaSyCPGgtXoDUycykLaTSee0S0yY0tkeJpqKI",
  authDomain:        "data-com-a94a8.firebaseapp.com",
  databaseURL:       "https://data-com-a94a8-default-rtdb.firebaseio.com",
  projectId:         "data-com-a94a8",
  storageBucket:     "data-com-a94a8.firebasestorage.app",
  messagingSenderId: "276904640935",
  appId:             "1:276904640935:web:9cd805aeba6c34c767f682",
  measurementId:     "G-FYQCWY5G4S"
};
const VAPID_KEY       = "BBmFUU8EgrWms0LnAcsleRMkYPXS7A0teI22WNVEpg2Xii6RwkQ6XuR1IfJAVUHUo8PabGi26OQ2iaYXMRs0IbU";
const API_BASE        = window.location.origin;
const CORRECT_PASSWORD = "express200@";
const DB_PATH         = "notifications";

const $ = id => document.getElementById(id);
let fcmToken  = null;
let pwVisible = false;
let db        = null;   // Firebase Realtime Database reference
let appInited = false;  // guard against double initializeApp

// ── UTILS ──
function showAlert(msg, type) {
  $('alert').textContent = msg;
  $('alert').className = type;
  setTimeout(() => { $('alert').className = ''; }, 5000);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDateTime(ts) {
  const d    = new Date(ts);
  const DAYS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const MONS = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
  const hh   = String(d.getHours()).padStart(2,'0');
  const mm   = String(d.getMinutes()).padStart(2,'0');
  const ss   = String(d.getSeconds()).padStart(2,'0');
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONS[d.getMonth()]} ${d.getFullYear()} — ${hh}:${mm}:${ss}`;
}

// ── FEED DOM ──
function renderEmptyFeed() {
  $('feed').innerHTML = `
    <div class="empty-feed">
      <div class="empty-icon">◎</div>
      <div class="empty-text">En attente de messages entrants…</div>
    </div>`;
}

function buildNotifEl(key, notif) {
  const el = document.createElement('div');
  el.className = 'notif-item';
  el.setAttribute('data-key', key);
  el.innerHTML = `
    <div class="notif-header">
      <div class="notif-title">${escHtml(notif.title || 'Sans titre')}</div>
      <button class="notif-delete" title="Supprimer">×</button>
    </div>
    <div class="notif-meta">${escHtml(formatDateTime(notif.ts || Date.now()))}</div>
    <div class="notif-body">${escHtml(notif.body || '')}</div>`;

  el.querySelector('.notif-delete').addEventListener('click', () => deleteNotif(key, el));
  return el;
}

// ── FIREBASE DB ──
function getDb() {
  // firebase.database() is from firebase-database-compat.js
  if (!db) db = firebase.database();
  return db;
}

function saveNotifToDb(notif) {
  // push() auto-generates a unique key and returns a ref
  return getDb().ref(DB_PATH).push(notif);
}

function deleteNotif(key, el) {
  // Remove from DB — listener will update the UI automatically
  getDb().ref(`${DB_PATH}/${key}`).remove();
  // Optimistic UI: animate out immediately
  el.style.opacity    = '0';
  el.style.transform  = 'translateX(30px)';
  el.style.transition = 'opacity 0.2s, transform 0.2s';
}

// ── REALTIME LISTENER ──
// Called once after Firebase is initialised. Replaces the whole feed
// every time the DB changes so any device/tab stays in sync.
function startRealtimeListener() {
  getDb().ref(DB_PATH).on('value', snapshot => {
    const feed = $('feed');
    feed.innerHTML = '';

    const data = snapshot.val();
    if (!data) { renderEmptyFeed(); return; }

    // Convert object to array sorted newest first
    const entries = Object.entries(data)
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));

    entries.forEach(({ key, ...notif }) => {
      feed.appendChild(buildNotifEl(key, notif));
    });
  });
}

// Called when a new FCM message arrives (foreground only).
// We just write to DB; the listener above handles display.
function addNotifToDb(title, body) {
  const notif = { title, body, ts: Date.now() };
  saveNotifToDb(notif).catch(err => console.error('DB write error', err));
}

// ── SERVICE WORKER ──
async function registerSW() {
  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

// ── FCM TOKEN ──
async function saveTokenToServer(token) {
  try {
    const res = await fetch(`${API_BASE}/api/save-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId: null }),
    });
    return await res.json();
  } catch(e) { console.warn('save-token error', e); }
}

// ── INIT FIREBASE & MESSAGING ──
async function enableNotifications() {
  const btn = $('btnEnable');
  btn.disabled    = true;
  btn.textContent = 'Initialisation…';

  try {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported) {
      showAlert('Votre navigateur ne supporte pas les notifications push.', 'error');
      btn.disabled = false; btn.textContent = 'Réessayer';
      return;
    }

    const swReg = await registerSW();

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showAlert('Permission refusée. Activez les notifications dans les réglages du navigateur.', 'error');
      btn.disabled = false; btn.textContent = 'Réessayer';
      return;
    }

    // Init Firebase app once
    if (!appInited) {
      firebase.initializeApp(firebaseConfig);
      appInited = true;
    }

    // Start DB sync immediately after app init
    startRealtimeListener();

    const messaging = firebase.messaging();
    btn.textContent = 'Connexion en cours…';

    const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) throw new Error('Token FCM vide');

    fcmToken = token;
    $('tokenText').textContent = token;

    await saveTokenToServer(token);
    showAlert('Notifications activées. Synchronisation en temps réel active.', 'success');

    btn.textContent = '✓ Système actif';
    btn.classList.add('success');
    if (window._setPulseActive) window._setPulseActive(true);

    // Foreground messages → write to DB
    messaging.onMessage(payload => {
      console.log('[FCM foreground]', payload);
      addNotifToDb(
        payload.notification?.title || 'Sans titre',
        payload.notification?.body  || ''
      );
    });

  } catch(err) {
    console.error(err);
    showAlert('Erreur : ' + err.message, 'error');
    btn.disabled = false; btn.textContent = 'Réessayer';
  }
}

// ── PASSWORD MODAL ──
function openModal() {
  $('pwOverlay').classList.add('open');
  $('pwInput').value = '';
  $('pwError').textContent = '';
  $('pwInput').type = 'password';
  pwVisible = false;
  $('pwToggle').textContent = 'voir';
  setTimeout(() => $('pwInput').focus(), 80);
}

function closeModal() { $('pwOverlay').classList.remove('open'); }

function submitPassword() {
  if ($('pwInput').value === CORRECT_PASSWORD) {
    closeModal();
    window.open('z.html', '_blank', 'noopener');
  } else {
    $('pwError').textContent = 'Mot de passe incorrect.';
    const inp = $('pwInput');
    inp.classList.remove('shake');
    void inp.offsetWidth;
    inp.classList.add('shake');
    inp.addEventListener('animationend', () => inp.classList.remove('shake'), { once: true });
    inp.select();
  }
}

// ── INIT ──
async function init() {
  // Show empty state until DB loads
  renderEmptyFeed();

  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) {
    $('btnEnable').disabled = true;
    showAlert('Votre navigateur ne supporte pas les notifications push.', 'error');
    return;
  }

  // If already authorised, init silently
  if (Notification.permission === 'granted') {
    await enableNotifications();
  }
}

// ── EVENTS ──
$('btnEnable').addEventListener('click', enableNotifications);

$('ctaAcceder').addEventListener('click', e => { e.preventDefault(); openModal(); });
$('pwClose').addEventListener('click', closeModal);
$('pwOverlay').addEventListener('click', e => { if (e.target === $('pwOverlay')) closeModal(); });
$('pwSubmit').addEventListener('click', submitPassword);
$('pwInput').addEventListener('keydown', e => {
  if (e.key === 'Enter')  submitPassword();
  if (e.key === 'Escape') closeModal();
});
$('pwToggle').addEventListener('click', function() {
  pwVisible = !pwVisible;
  $('pwInput').type        = pwVisible ? 'text' : 'password';
  this.textContent         = pwVisible ? 'cacher' : 'voir';
});

init();
