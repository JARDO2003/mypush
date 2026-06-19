// notifications.js — Gestion des permissions et tokens FCM côté client
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';

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

const VAPID_PUBLIC_KEY = "BBmFUU8EgrWms0LnAcsleRMkYPXS7A0teI22WNVEpg2Xii6RwkQ6XuR1IfJAVUHUo8PabGi26OQ2iaYXMRs0IbU";

// URL de base de votre API Vercel (à adapter)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || window.location.origin;

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/**
 * Demande la permission de notifications et enregistre le token FCM
 * @param {string|null} userId - Identifiant optionnel de l'utilisateur
 * @returns {Promise<string|null>} Le token FCM ou null si refusé
 */
export async function requestNotificationPermission(userId = null) {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.warn('Permission de notification refusée');
      return null;
    }

    // Enregistrement du service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker enregistré:', registration);

    // Obtention du token FCM
    const token = await getToken(messaging, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn('Aucun token FCM obtenu');
      return null;
    }

    console.log('Token FCM obtenu:', token);

    // Sauvegarde du token dans la base de données via l'API
    await saveTokenToServer(token, userId);

    return token;
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return null;
  }
}

/**
 * Envoie le token FCM à l'API pour le sauvegarder en base de données
 */
async function saveTokenToServer(token, userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/save-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId }),
    });

    const result = await response.json();
    console.log('Token sauvegardé:', result);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du token:', error);
  }
}

/**
 * Écoute les messages reçus en premier plan
 * @param {function} callback - Fonction appelée à la réception d'un message
 */
export function onForegroundMessage(callback) {
  onMessage(messaging, (payload) => {
    console.log('[FCM] Message reçu en premier plan:', payload);
    callback(payload);
  });
}

/**
 * Envoie une notification à une liste de tokens via l'API
 * @param {string[]} tokens
 * @param {string} title
 * @param {string} body
 * @param {object} data
 */
export async function sendNotification(tokens, title, body, data = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens, title, body, data }),
    });

    return await response.json();
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    return null;
  }
}