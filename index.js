const express = require('express');
const admin = require('firebase-admin');
const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Ludo Game Config (Design control from here)
const gameConfig = {
    colors: { RED: "#E74C3C", GREEN: "#27AE60", BLUE: "#2980B9", YELLOW: "#F1C40F" },
    headline: "SagarTech 99",
    timeout: 30000
};

// API: Status (AIDE app isi ko har 1 second mein hit karega)
app.get('/status', async (req, res) => {
    const { roomId } = req.query;
    const snap = await db.ref(`rooms/${roomId}`).once('value');
    if (!snap.exists()) return res.json({ status: "EMPTY", config: gameConfig });
    
    let data = snap.val();
    data.config = gameConfig; // Send design data to app
    res.json(data);
});

// API: Roll Dice Logic
app.get('/roll', async (req, res) => {
    const { roomId, userId } = req.query;
    const dice = Math.floor(Math.random() * 6) + 1;
    await db.ref(`rooms/${roomId}/state`).update({
        lastDice: dice,
        status: "WAITING_MOVE",
        turnStartTime: Date.now()
    });
    res.json({ dice });
});

app.listen(process.env.PORT || 3000);
