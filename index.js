const express = require('express');
const admin = require('firebase-admin');
const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Helper: Get Next Turn
const getNextTurn = (players, currentUid) => {
    const uids = Object.keys(players).filter(id => players[id].active);
    const idx = uids.indexOf(currentUid);
    return uids[(idx + 1) % uids.length];
};

// API: Join Room
app.get('/join', async (req, res) => {
    const { roomId, userId, name, dp } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const snap = await roomRef.once('value');
    let room = snap.val() || { status: "WAITING", players: {}, state: {} };

    if (room.status === "PLAYING" && !room.players[userId]) return res.send({ error: "Game already running" });

    const colors = ["RED", "GREEN", "BLUE", "YELLOW"];
    const assignedColor = room.players[userId] ? room.players[userId].color : colors[Object.keys(room.players).length];

    await roomRef.child(`players/${userId}`).update({
        name, dp, color: assignedColor, active: true, misses: 0, lastSeen: Date.now()
    });

    res.send({ success: true, color: assignedColor });
});

// API: Roll Dice
app.get('/roll', async (req, res) => {
    const { roomId, userId } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const snap = await roomRef.once('value');
    const room = snap.val();

    if (room.state.currentTurn !== userId) return res.send({ error: "Not your turn" });

    const dice = Math.floor(Math.random() * 6) + 1;
    await roomRef.child('state').update({
        lastDice: dice,
        status: "WAITING_MOVE",
        turnStartTime: Date.now()
    });
    res.send({ dice });
});

// Turn Timeout Logic (Auto-run on every status check)
app.get('/status', async (req, res) => {
    const { roomId } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const snap = await roomRef.once('value');
    if (!snap.exists()) return res.send({ status: "EMPTY" });

    let room = snap.val();
    const now = Date.now();

    // Turn Timeout Logic: 30 Seconds
    if (room.status === "PLAYING" && room.state.turnStartTime && (now - room.state.turnStartTime > 30000)) {
        const currentUid = room.state.currentTurn;
        let misses = (room.players[currentUid].misses || 0) + 1;
        
        if (misses >= 3) {
            // Kick out player
            await roomRef.child(`players/${currentUid}`).update({ active: false });
        }
        
        // Rotate Turn
        const nextUid = getNextTurn(room.players, currentUid);
        await roomRef.child('state').update({
            currentTurn: nextUid,
            turnStartTime: now,
            lastDice: 0,
            status: "WAITING_ROLL"
        });
        await roomRef.child(`players/${currentUid}`).update({ misses: misses });
    }

    res.send(room);
});

// API: Exit Game
app.get('/exit', async (req, res) => {
    const { roomId, userId } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    await roomRef.child(`players/${userId}`).remove();
    
    const snap = await roomRef.child('players').once('value');
    if (!snap.exists()) {
        await roomRef.remove(); // Delete table if everyone left
    }
    res.send({ success: true });
});

app.listen(process.env.PORT || 3000);
