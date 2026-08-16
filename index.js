const admin = require('firebase-admin');
const express = require('express');
const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Ludo Game Rules & Logic
app.get('/roll', async (req, res) => {
    const { roomId, userId } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const snap = await roomRef.once('value');
    const room = snap.val();

    if (!room || room.state.currentTurn !== userId) return res.send({error: "Not your turn"});

    const dice = Math.floor(Math.random() * 6) + 1;
    let nextStatus = "WAITING_MOVE";
    
    // Check if player can even move
    // logic simplified: if no 6 and all in home, skip turn
    await roomRef.child('state').update({
        lastDice: dice,
        status: nextStatus
    });
    res.send({ dice });
});

app.get('/move', async (req, res) => {
    const { roomId, userId, pieceIndex } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const snap = await roomRef.once('value');
    const room = snap.val();

    const dice = room.state.lastDice;
    const color = room.players[userId].color;
    let pos = room.state.pieces[color][pieceIndex];

    // Ludo King Rules
    if (pos === -1 && dice === 6) pos = 0; // Release
    else if (pos >= 0) pos += dice; // Move

    if (pos > 57) return res.send({error: "Invalid move"});

    // Check Capture (Cutting) logic
    let extraTurn = (dice === 6 || pos === 57);
    // Add logic here to check other players' positions for cutting...

    const updates = {};
    updates[`state/pieces/${color}/${pieceIndex}`] = pos;
    if (!extraTurn) {
        updates[`state/currentTurn`] = getNextPlayer(room); // Turn rotation
    }
    updates[`state/status`] = "WAITING_ROLL";

    await roomRef.update(updates);
    res.send({success: true});
});

function getNextPlayer(room) {
    const uids = Object.keys(room.players);
    const currentIdx = uids.indexOf(room.state.currentTurn);
    return uids[(currentIdx + 1) % uids.length];
}

app.listen(process.env.PORT || 3000);
