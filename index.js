const express = require('express');
const admin = require('firebase-admin');
const app = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ludo-a461a-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Ludo Path Mapping (0 to 56 steps)
const SAFE_SPOTS = [1, 9, 14, 22, 27, 35, 40, 48]; 

app.get('/status', async (req, res) => {
    const { roomId } = req.query;
    const snap = await db.ref(`rooms/${roomId}`).once('value');
    if (!snap.exists()) return res.json({ status: "EMPTY" });
    
    let room = snap.val();
    const now = Date.now();

    // 30s AFK / Timeout Logic
    if (room.status === "PLAYING" && (now - room.state.turnStartTime > 30000)) {
        const currentUid = room.state.currentTurn;
        let misses = (room.players[currentUid].misses || 0) + 1;
        
        const updates = {};
        if (misses >= 3) {
            updates[`players/${currentUid}/active`] = false; // Kick out
        }
        
        // Switch Turn
        const players = Object.keys(room.players).filter(id => room.players[id].active);
        const nextIdx = (players.indexOf(currentUid) + 1) % players.length;
        updates['state/currentTurn'] = players[nextIdx];
        updates['state/turnStartTime'] = now;
        updates['state/status'] = "WAITING_ROLL";
        updates[`players/${currentUid}/misses`] = misses;
        
        await db.ref(`rooms/${roomId}`).update(updates);
    }
    res.json(room);
});

app.get('/move', async (req, res) => {
    const { roomId, userId, pIdx } = req.query;
    const ref = db.ref(`rooms/${roomId}`);
    const room = (await ref.once('value')).val();
    
    const dice = room.state.lastDice;
    const color = room.players[userId].color;
    let pos = room.state.pieces[color][pIdx];

    // Logic: Base se nikalna ya aage badhna
    if (pos === -1 && dice === 6) pos = 0;
    else if (pos >= 0) pos += dice;

    if (pos > 56) return res.json({error: "invalid"});

    // Check for Capture (Cutting)
    let extraTurn = (dice === 6 || pos === 56);
    // [Cutting Logic will be processed here by comparing other players positions]

    const updates = {};
    updates[`state/pieces/${color}/${pIdx}`] = pos;
    
    if (pos === 56 && room.state.pieces[color].every(p => p === 56)) {
        updates['status'] = "FINISHED";
        updates['winner'] = userId;
    }

    if (!extraTurn) {
        const players = Object.keys(room.players).filter(id => room.players[id].active);
        const nextIdx = (players.indexOf(userId) + 1) % players.length;
        updates['state/currentTurn'] = players[nextIdx];
    }
    
    updates['state/status'] = "WAITING_ROLL";
    updates['state/turnStartTime'] = Date.now();
    await ref.update(updates);
    res.json({success: true});
});

app.listen(process.env.PORT || 3000);
