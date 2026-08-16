const express = require('express');
const admin = require('firebase-admin');
const app = express();

// Firebase Admin Setup
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "APNA_FIREBASE_DATABASE_URL_YAHAN_DALEIN"
});

const db = admin.database();

// 1. API to Roll Dice (GitHub se control hoga)
app.get('/roll', async (req, res) => {
    const { roomId, userId } = req.query;
    const diceValue = Math.floor(Math.random() * 6) + 1; // Dice Logic
    
    await db.ref(`rooms/${roomId}/state`).update({
        lastDice: diceValue,
        lastRoller: userId,
        timestamp: Date.now()
    });
    
    res.send({ success: true, dice: diceValue });
});

// 2. API to Get Status
app.get('/status', async (req, res) => {
    const { roomId } = req.query;
    const snap = await db.ref(`rooms/${roomId}/state`).once('value');
    res.send(snap.val() || { lastDice: 0 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
