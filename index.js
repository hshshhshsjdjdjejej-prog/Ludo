const express = require('express');
const admin = require('firebase-admin');
const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Ludo Game Rules
app.get('/join', async (req, res) => {
    const { roomId, userId, name } = req.query;
    const ref = db.ref(`rooms/${roomId}`);
    const snap = await ref.once('value');
    let room = snap.val() || { status: "WAITING", players: {} };
    const colors = ["RED", "GREEN", "BLUE", "YELLOW"];
    const count = Object.keys(room.players || {}).length;
    if (!room.players || !room.players[userId]) {
        await ref.child(`players/${userId}`).set({
            name: name || "User", color: colors[count % 4], active: true, misses: 0
        });
    }
    res.json({ success: true });
});

app.get('/start', async (req, res) => {
    const { roomId } = req.query;
    const ref = db.ref(`rooms/${roomId}`);
    const players = (await ref.child('players').once('value')).val();
    await ref.update({
        status: "PLAYING",
        state: {
            currentTurn: Object.keys(players)[0],
            lastDice: 0,
            turnStartTime: Date.now(),
            pieces: { RED: [-1,-1,-1,-1], GREEN: [-1,-1,-1,-1], BLUE: [-1,-1,-1,-1], YELLOW: [-1,-1,-1,-1] }
        }
    });
    res.json({ success: true });
});

app.get('/roll', async (req, res) => {
    const { roomId, userId } = req.query;
    const dice = Math.floor(Math.random() * 6) + 1;
    await db.ref(`rooms/${roomId}/state`).update({
        lastDice: dice,
        turnStartTime: Date.now()
    });
    res.json({ dice });
});

app.get('/status', async (req, res) => {
    const { roomId } = req.query;
    const snap = await db.ref(`rooms/${roomId}`).once('value');
    res.json(snap.val() || { status: "EMPTY" });
});

app.listen(process.env.PORT || 3000);
