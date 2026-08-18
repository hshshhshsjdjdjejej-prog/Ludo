const express = require('express');
const admin = require('firebase-admin');
const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// API: Join & Waiting Logic
app.get('/join', async (req, res) => {
    const { roomId, userId, name, dp } = req.query;
    const ref = db.ref(`rooms/${roomId}`);
    const snap = await ref.once('value');
    let room = snap.val() || { status: "WAITING", players: {} };

    const colors = ["RED", "GREEN", "YELLOW", "BLUE"];
    const count = Object.keys(room.players || {}).length;
    
    if (!room.players || !room.players[userId]) {
        await ref.child(`players/${userId}`).update({
            name, dp, color: colors[count], active: true, misses: 0
        });
    }
    res.send({ success: true });
});

// API: Status with Timeout (30s)
app.get('/status', async (req, res) => {
    const { roomId } = req.query;
    const ref = db.ref(`rooms/${roomId}`);
    const snap = await ref.once('value');
    if (!snap.exists()) return res.send({ status: "EMPTY" });

    let room = snap.val();
    if (room.status === "PLAYING" && (Date.now() - room.state.turnStartTime > 30000)) {
        // Turn Timeout Logic... (Previous logic here)
    }
    res.send(room);
});

app.listen(process.env.PORT || 3000);
