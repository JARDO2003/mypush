// Configuration Firebase Client
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

// Clé VAPID pour les notifications Web Push
const VAPID_PUBLIC_KEY = "BBmFUU8EgrWms0LnAcsleRMkYPXS7A0teI22WNVEpg2Xii6RwkQ6XuR1IfJAVUHUo8PabGi26OQ2iaYXMRs0IbU";

export { firebaseConfig, VAPID_PUBLIC_KEY };