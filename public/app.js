// ── PULSE ANIMATION ──
(function() {
  const canvas = document.getElementById('pulseCanvas');
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
      if (phase > 30 && phase < 36) y = mid - 22;
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

// ── FIREBASE CONFIG ──
const firebaseConfig = {
  apiKey: "AIzaSyCPGgtXoDUycykLaTSee0S0yY0tkeJpqKI",
  authDomain: "data-com-a94a8.firebaseapp.com",
  databaseURL: "https://data-com-a94a8-default-rtdb.firebaseio.com",
  projectId: "data-com-a94a8",
  storageBucket: "data-com-a94a8.firebasestorage.app",
  messagingSenderId: "276904640935",
  appId: "1:276904640935:web:9cd805aeba6c34c767f682",
  measurementId: "G-FYQCWY5G4S"
};
const VAPID_KEY = "BBmFUU8EgrWms0LnAcsleRMkYPXS7A0teI22WNVEpg2Xii6RwkQ6XuR1IfJAVUHUo8PabGi26OQ2iaYXMRs0IbU";
const API_BASE = window.location.origin;
const CORRECT_PASSWORD = "express200@";
const STORAGE_KEY = "notif_feed";

const $ = id => document.getElementById(id);
let fcmToken = null;
let pwVisible = false;

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
  const d = new Date(ts);
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois  = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
  const jour  = jours[d.getDay()];
  const date  = d.getDate();
  const mo    = mois[d.getMonth()];
  const year  = d.getFullYear();
  const hh    = String(d.getHours()).padStart(2,'0');
  const mm    = String(d.getMinutes()).padStart(2,'0');
  const ss    = String(d.getSeconds()).padStart(2,'0');
  return `${jour} ${date} ${mo} ${year} — ${hh}:${mm}:${ss}`;
}

// ── LOCALSTORAGE ──
function loadNotifs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch(e) { return []; }
}

function saveNotifs(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch(e) {}
}

function deleteNotif(id) {
  const list = loadNotifs().filter(n => n.id !== id);
  saveNotifs(list);
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    el.style.transition = 'opacity 0.2s, transform 0.2s';
    setTimeout(() => {
      el.remove();
      if ($('feed').children.length === 0) renderEmptyFeed();
    }, 220);
  }
}

function renderEmptyFeed() {
  $('feed').innerHTML = `
    <div class="empty-feed">
      <div class="empty-icon">◎</div>
      <div class="empty-text">En attente de messages entrants…</div>
    </div>
  `;
}

// ── FEED ──
function buildNotifEl(notif) {
  const el = document.createElement('div');
  el.className = 'notif-item';
  el.setAttribute('data-id', notif.id);
  el.innerHTML = `
    <div class="notif-header">
      <div class="notif-title">${escHtml(notif.title)}</div>
      <button class="notif-delete" data-id="${notif.id}" title="Supprimer">×</button>
    </div>
    <div class="notif-meta">${escHtml(formatDateTime(notif.ts))}</div>
    <div class="notif-body">${escHtml(notif.body)}</div>
  `;
  el.querySelector('.notif-delete').addEventListener('click', () => deleteNotif(notif.id));
  return el;
}

function renderFeed() {
  const list = loadNotifs();
  const feed = $('feed');
  feed.innerHTML = '';
  if (list.length === 0) {
    renderEmptyFeed();
    return;
  }
  list.forEach(notif => feed.appendChild(buildNotifEl(notif)));
}

function addToFeed(title, body) {
  const notif = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2),
    title,
    body,
    ts: Date.now()
  };

  const list = loadNotifs();
  list.unshift(notif);
  saveNotifs(list);

  const feed = $('feed');
  const empty = feed.querySelector('.empty-feed');
  if (empty) empty.remove();

  const el = buildNotifEl(notif);
  el.style.animation = 'appear 0.25s ease';
  feed.prepend(el);
}

function listenForeground(messaging) {
  messaging.onMessage(payload => {
    console.log('[FCM] foreground:', payload);
    addToFeed(
      payload.notification?.title || 'Sans titre',
      payload.notification?.body || ''
    );
  });
}

// ── SERVICE WORKER ──
async function registerSW() {
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  return reg;
}

// ── TOKEN ──
async function saveToken(token) {
  try {
    const res = await fetch(`${API_BASE}/api/save-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId: null }),
    });
    return await res.json();
  } catch(e) { console.warn('save-token error', e); }
}

// ── NOTIFICATIONS ──
async function enableNotifications() {
  const btn = $('btnEnable');
  btn.disabled = true;
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

    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    btn.textContent = 'Connexion en cours…';
    const token = await messaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg
    });

    if (!token) throw new Error('Token FCM vide');

    fcmToken = token;
    $('tokenText').textContent = token;

    await saveToken(token);
    showAlert('Notifications activées. Vous recevrez les messages en temps réel.', 'success');

    btn.textContent = '✓ Système actif';
    btn.classList.add('success');

    if (window._setPulseActive) window._setPulseActive(true);

    listenForeground(messaging);

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

function closeModal() {
  $('pwOverlay').classList.remove('open');
}

function submitPassword() {
  const val = $('pwInput').value;
  if (val === CORRECT_PASSWORD) {
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
  renderFeed();

  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) {
    $('btnEnable').disabled = true;
    showAlert('Votre navigateur ne supporte pas les notifications push.', 'error');
    return;
  }
  if (Notification.permission === 'granted') {
    await enableNotifications();
  }
}

// ── EVENT LISTENERS ──
$('btnEnable').addEventListener('click', enableNotifications);

$('ctaAcceder').addEventListener('click', function(e) {
  e.preventDefault();
  openModal();
});

$('pwClose').addEventListener('click', closeModal);

$('pwOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

$('pwSubmit').addEventListener('click', submitPassword);

$('pwInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') submitPassword();
  if (e.key === 'Escape') closeModal();
});

$('pwToggle').addEventListener('click', function() {
  pwVisible = !pwVisible;
  $('pwInput').type = pwVisible ? 'text' : 'password';
  this.textContent = pwVisible ? 'cacher' : 'voir';
});

init();
