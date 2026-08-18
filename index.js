const express = require('express');
const admin = require('firebase-admin');
const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Ludo Path Mapping (Standard Ludo King Logic)
const colors = ["RED", "GREEN", "YELLOW", "BLUE"];

app.get('/join', async (req, res) => {
    const { roomId, userId, name, dp } = req.query;
    const ref = db.ref(`rooms/${roomId}`);
    const snap = await ref.once('value');
    let room = snap.val() || { status: "WAITING", players: {}, state: { currentTurn: "", lastDice: 0 } };

    if (!room.players || !room.players[userId]) {
        const count = room.players ? Object.keys(room.players).length : 0;
        if (count >= 4) return res.json({ error: "Full" });
        
        await ref.child(`players/${userId}`).set({
            name, dp, color: colors[count], active: true, misses: 0, isHost: count === 0
        });
    }
    res.json({ success: true });
});

app.get('/start', async (req, res) => {
    const { roomId } = req.query;
    const ref = db.ref(`rooms/${roomId}`);
    const playersSnap = await ref.child('players').once('value');
    const players = playersSnap.val();
    const firstPlayer = Object.keys(players)[0];

    await ref.update({
        status: "PLAYING",
        state: {
            currentTurn: firstPlayer,
            lastDice: 0,
            status: "WAITING_ROLL",
            turnStartTime: Date.now(),
            pieces: { RED: [-1,-1,-1,-1], GREEN: [-1,-1,-1,-1], YELLOW: [-1,-1,-1,-1], BLUE: [-1,-1,-1,-1] }
        }
    });
    res.json({ success: true });
});

app.get('/roll', async (req, res) => {
    const { roomId, userId } = req.query;
    const ref = db.ref(`rooms/${roomId}`);
    const snap = await ref.once('value');
    const room = snap.val();

    if (room.state.currentTurn !== userId) return res.json({ error: "Not your turn" });

    const dice = Math.floor(Math.random() * 6) + 1;
    await ref.child('state').update({
        lastDice: dice,
        status: "WAITING_MOVE",
        turnStartTime: Date.now()
    });
    res.json({ dice });
});

// Goti Chalne aur Katne ka logic
app.get('/move', async (req, res) => {
    const { roomId, userId, pieceIdx } = req.query;
    const ref = db.ref(`rooms/${roomId}`);
    const room = (await ref.once('value')).val();
    
    const dice = room.state.lastDice;
    const color = room.players[userId].color;
    let pos = room.state.pieces[color][pieceIdx];

    if (pos === -1 && dice === 6) pos = 0; // Goti Bahar nikli
    else if (pos >= 0) pos += dice; 

    if (pos > 56) return res.json({ error: "Can't move" });

    // Capture Logic (Goti Katna)
    let extraTurn = (dice === 6);
    // Yahan cutting logic add hoga positions compare karke...

    const updates = {};
    updates[`state/pieces/${color}/${pieceIdx}`] = pos;
    if (!extraTurn) {
        const uids = Object.keys(room.players);
        const nextIdx = (uids.indexOf(userId) + 1) % uids.length;
        updates[`state/currentTurn`] = uids[nextIdx];
    }
    updates[`state/status`] = "WAITING_ROLL";
    updates[`state/turnStartTime`] = Date.now();

    await ref.update(updates);
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000);
