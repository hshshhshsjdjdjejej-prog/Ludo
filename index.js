const express = require('express');
const admin = require('firebase-admin');
const app = express();

// Crash se bachne ke liye try-catch block
try {
    if (!process.env.FIREBASE_CONFIG) {
        console.error("ERROR: FIREBASE_CONFIG is missing in Render settings!");
        process.exit(1);
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
    });

    console.log("Firebase Connected Successfully!");
} catch (error) {
    console.error("Initialization Error:", error.message);
    process.exit(1); 
}

const db = admin.database();

// Server chalu hai ya nahi check karne ke liye home page
app.get('/', (req, res) => {
    res.send("Ludo Server is LIVE and Running!");
});

// Dice Roll API
app.get('/roll', async (req, res) => {
    const { roomId, userId } = req.query;
    if (!roomId) return res.send({ error: "Missing RoomId" });

    const diceValue = Math.floor(Math.random() * 6) + 1;
    await db.ref(`rooms/${roomId}/state`).update({
        lastDice: diceValue,
        lastRoller: userId || "unknown",
        timestamp: Date.now()
    });
    res.send({ dice: diceValue });
});

// Status API
app.get('/status', async (req, res) => {
    const { roomId } = req.query;
    const snap = await db.ref(`rooms/${roomId}/state`).once('value');
    res.send(snap.val() || { lastDice: 0 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
