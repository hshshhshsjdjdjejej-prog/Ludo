const express = require('express');
const admin = require('firebase-admin');
const app = express();

// Step 1 wala JSON text yahan aayega (Environment Variable se)
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
});

const db = admin.database();

app.get('/roll', async (req, res) => {
    const { roomId, userId } = req.query;
    const diceValue = Math.floor(Math.random() * 6) + 1;
    
    await db.ref(`rooms/${roomId}/state`).update({
        lastDice: diceValue,
        lastRoller: userId,
        timestamp: Date.now()
    });
    res.send({ dice: diceValue });
});

app.get('/status', async (req, res) => {
    const { roomId } = req.query;
    const snap = await db.ref(`rooms/${roomId}/state`).once('value');
    res.send(snap.val() || { lastDice: 0 });
});

app.listen(process.env.PORT || 3000);
