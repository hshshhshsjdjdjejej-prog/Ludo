const express = require('express');
const admin = require('firebase-admin');
const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Ludo Path Logic: Start positions for each color
const START_POS = { RED: 0, GREEN: 13, YELLOW: 26, BLUE: 39 };

app.get('/roll', async (req, res) => {
    const { roomId, userId } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const dice = Math.floor(Math.random() * 6) + 1;

    await roomRef.child('state').update({
        lastDice: dice,
        status: "WAITING_MOVE",
        turnStartTime: Date.now()
    });
    res.json({ dice });
});

app.get('/move', async (req, res) => {
    const { roomId, userId, pieceIdx } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const room = (await roomRef.once('value')).val();
    
    const dice = room.state.lastDice;
    const color = room.players[userId].color;
    let pos = room.state.pieces[color][pieceIdx];

    // Ludo King Rules
    if (pos === -1 && dice === 6) pos = 0; // Goti Bahar nikli
    else if (pos >= 0) pos += dice; 

    if (pos > 56) return res.json({ error: "Invalid Move" });

    // Capture (Cutting) Logic Placeholder
    let extraTurn = (dice === 6 || pos === 56);
    
    const updates = {};
    updates[`state/pieces/${color}/${pieceIdx}`] = pos;
    
    if (!extraTurn) {
        const uids = Object.keys(room.players);
        const nextIdx = (uids.indexOf(userId) + 1) % uids.length;
        updates[`state/currentTurn`] = uids[nextIdx];
    }
    updates[`state/status`] = "WAITING_ROLL";
    updates[`state/turnStartTime`] = Date.now();

    await roomRef.update(updates);
    res.json({ success: true });
});

app.get('/status', async (req, res) => {
    const { roomId } = req.query;
    const snap = await db.ref(`rooms/${roomId}`).once('value');
    res.json(snap.val() || { status: "EMPTY" });
});

app.listen(process.env.PORT || 3000);
