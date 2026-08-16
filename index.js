const express = require('express');
const admin = require('firebase-admin');
const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// API: Join Room & Waiting List
app.get('/join', async (req, res) => {
    const { roomId, userId, name, dp } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const snap = await roomRef.once('value');
    let room = snap.val() || { status: "WAITING", players: {} };

    if (room.status === "PLAYING" && !room.players[userId]) return res.send({ error: "Game Busy" });

    const colors = ["RED", "GREEN", "BLUE", "YELLOW"];
    const count = Object.keys(room.players || {}).length;
    
    if (!room.players || !room.players[userId]) {
        await roomRef.child(`players/${userId}`).set({
            name, dp, color: colors[count], active: true, misses: 0, isHost: count === 0
        });
    }
    res.send({ success: true });
});

// API: Start Game
app.get('/start', async (req, res) => {
    const { roomId } = req.query;
    await db.ref(`rooms/${roomId}`).update({
        status: "PLAYING",
        state: {
            currentTurn: "", // Set first player ID here
            lastDice: 0,
            status: "WAITING_ROLL",
            turnStartTime: Date.now(),
            pieces: { RED: [-1,-1,-1,-1], GREEN: [-1,-1,-1,-1], BLUE: [-1,-1,-1,-1], YELLOW: [-1,-1,-1,-1] }
        }
    });
    res.send({ success: true });
});

// API: Roll Dice with Ludo King Rules
app.get('/roll', async (req, res) => {
    const { roomId, userId } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const dice = Math.floor(Math.random() * 6) + 1;
    
    await roomRef.child('state').update({
        lastDice: dice,
        status: "WAITING_MOVE",
        turnStartTime: Date.now()
    });
    res.send({ dice });
});

app.listen(process.env.PORT || 3000);
