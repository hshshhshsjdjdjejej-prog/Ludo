const express = require('express');
const admin = require('firebase-admin');
const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Get Next Player in rotation
const getNext = (players, current) => {
    const ids = Object.keys(players).filter(id => players[id].active);
    const idx = ids.indexOf(current);
    return ids[(idx + 1) % ids.length];
};

app.get('/roll', async (req, res) => {
    const { roomId, userId } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const snap = await roomRef.once('value');
    const room = snap.val();

    if (room.state.currentTurn !== userId) return res.send({ error: "Turn error" });

    const dice = Math.floor(Math.random() * 6) + 1;
    await roomRef.child('state').update({
        lastDice: dice,
        status: "WAITING_MOVE",
        turnStartTime: Date.now()
    });
    res.send({ dice });
});

// Main loop for 30s timeout
app.get('/status', async (req, res) => {
    const { roomId } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const snap = await roomRef.once('value');
    if (!snap.exists()) return res.send({ status: "EMPTY" });

    let room = snap.val();
    const now = Date.now();

    // 30s Turn Timeout Logic
    if (room.status === "PLAYING" && room.state.turnStartTime && (now - room.state.turnStartTime > 30000)) {
        const current = room.state.currentTurn;
        let misses = (room.players[current].misses || 0) + 1;
        
        if (misses >= 3) {
            await roomRef.child(`players/${current}`).update({ active: false });
        }
        
        const next = getNext(room.players, current);
        await roomRef.child('state').update({
            currentTurn: next,
            turnStartTime: now,
            lastDice: 0,
            status: "WAITING_ROLL"
        });
        await roomRef.child(`players/${current}`).update({ misses: misses });
    }
    res.send(room);
});

app.listen(process.env.PORT || 3000);
