const admin = require('firebase-admin');

// Init une seule fois (réutilisé entre les invocations Vercel)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: "data-com-a94a8",
      private_key_id: "5d32b8244e36b1f0b73d49c27d22b0135e2c10f6",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDIL1k8jrVcKQJ0\ntT4Lzu2eOmMPg65o9sWa1TobvaVgCZbm428gsh0uhyro9gZ0yJn4/cobNqok7nOO\nMuzu7Jk+OpXWVeavM8FYkCLOWCJB6qKk9OSHWHi1+ZgnXNmCVJlpX1JYB9/ECVOu\nv/eHwpMfTIf6HfbsQ0xG0A1jIg6/dmF4oRrrM2bFuPnTLRAd2yBOB9rT9Pak311d\nNxcxk7B1IJ+I9DxWfhNM4zGZrGzTL3eh0iUnbysKlsMSwAXCoJD4H1Hkb3tnTu31\nVZUrpoujFvpgKwdYXElUAzhMN73Fh8J347k+pQFG6G2SZPs6ZK6yhJDO2Q4Rg1XC\nlMnwGnQBAgMBAAECggEAHc8nK6RYj0uwCO8AOUPsEFbDb4j9TLYKgN7lk0HvQVjM\nNr+BSc4cGFSaaCxSk8tXWkN4eArw1SUI4hDlRULIIwMYUt1hx48eaHC2LiHjoAsv\ngv7QlPLwrrBnHt1tqkGswosmOOObR5bX9jqxwm6P9+YujWku3sm6rwTGKY/lwE69\nrdpjQ7D6NqV+p1qsCfBOC6BJQ+qlsoi+8ywB1xASH3uC6FMO9LOJSc4olqC/co4P\nGxdLiGKHGNqChmilXjBEaueE7eUPshhdNLBVXRxXUkk1ffAkkezrSoXgFLmwlqSr\nv1ENN4wQIoYZRYWey96e7BTJCmIKm6zox/NBknYYrQKBgQD8TCCB3KyQ9kU2h91I\nobh4gSs7guqv2NzR1bzdI5ZZvb+laAWQ5VB4iEszMetvojuiDrH8wuKia6YyR2fk\nHsTvU1ofnl7XgB9WWqO+xsEAY5XMsXy4Ecj/0cI4XTl848gEhlWcbg8NPqh02v1T\n0dfyanb8Pts4FdzUUIdrCEKpmwKBgQDLH2/b0MvGoby07EOLcxo8QAMvvucislfd\nnKXgeEjoqGIzIrDVQzTYTLojRGJQp3TM93QIMCKsk0AeMB+2OTvPGXqfY4YlHmcy\nUgRw+AO50es2/az1YEvZ58tb1d5mOk1VRwZfiKZUmpEjqyGNm/rqiWD+2dVBQP6o\n+yq8sXIwkwKBgFhJ854+MQ1RgQsCJIfEQB+7Y/uhZqs+wpeTqlHgoD6rTiN98WSx\nOqXTXC2ALJmWNjQR3GtNb63S6gfyQQLtWZE+o+0oqJvVNCIt+dtLBkMyljtZaQGp\nB6OuLb83sGRp+ZbLw63IPfAumxi5gakRZ/ZnF1hSTrijvfF2dM0ZyOo9AoGBAICA\nqe6hwFkwd0bqdaziK8XUJW/uUSG1PDs6YAKLdmyiIkYBe2ff9a2llNi86Ynm9tC4\n+BI6CaWuHpE6lsVcngbeMqJlfzc6bcT6+E5TyV+key81+1bdDf+UUiYOPn3kAoqh\nvVlxBPFfO9UZ7cc919bLBK8WNoDq0nErPRVVGU27AoGBAL8zfnDFPUdxYecC8MBJ\n/uOKqZ3xrpW+g4nZu4d3kUEcqXTIDGx99sUzo213wy7HybtY8NrDW+OFS/4A0gUN\nPZo11rSiorT3SWB2AN08zexTAPqtNHqWOO45o+dgrrHA0CjTRaOE5gj1OyL703dB\n81iDTACJqgfUqB6oAi+KrAiu\n-----END PRIVATE KEY-----\n",
      client_email: "firebase-adminsdk-fbsvc@data-com-a94a8.iam.gserviceaccount.com",
      client_id: "101594480167817977368",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40data-com-a94a8.iam.gserviceaccount.com",
      universe_domain: "googleapis.com"
    }),
    databaseURL: "https://data-com-a94a8-default-rtdb.firebaseio.com",
  });
}

const messaging = admin.messaging();

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tokens, title, body, data } = req.body;

  if (!tokens?.length || !title || !body) {
    return res.status(400).json({ error: 'Champs requis : tokens[], title, body' });
  }

  const db = admin.database();

  const message = {
    tokens,
    notification: { title, body },
    data: data || {},
    webpush: {
      headers: { Urgency: 'high' },
      notification: { title, body, icon: '/icon.png', requireInteraction: true },
    },
  };

  try {
    const result = await messaging.sendEachForMulticast(message);

    // Supprimer les tokens invalides de la DB
    const invalidTokens = [];
    result.responses.forEach((r, i) => {
      if (!r.success && (
        r.error?.code === 'messaging/registration-token-not-registered' ||
        r.error?.code === 'messaging/invalid-registration-token'
      )) {
        invalidTokens.push(tokens[i]);
      }
    });

    if (invalidTokens.length) {
      const snapshot = await db.ref('fcm_tokens').once('value');
      const all = snapshot.val() || {};
      for (const [key, val] of Object.entries(all)) {
        if (invalidTokens.includes(val.token)) {
          await db.ref(`fcm_tokens/${key}`).remove();
        }
      }
    }

    res.json({
      success: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};