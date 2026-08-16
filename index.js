// Add this logic to your GitHub index.js
app.get('/join', async (req, res) => {
    const { roomId, userId, userName } = req.query;
    const roomRef = db.ref(`rooms/${roomId}`);
    const snap = await roomRef.once('value');
    const room = snap.val() || { players: {}, status: "WAITING" };

    if (Object.keys(room.players).length < 4) {
        const colors = ["RED", "GREEN", "BLUE", "YELLOW"];
        const assignedColor = colors[Object.keys(room.players).length];
        
        await roomRef.child(`players/${userId}`).set({
            name: userName,
            color: assignedColor,
            ready: true
        });
        
        // If 2 or more players joined, game can start
        if (Object.keys(room.players).length >= 1) {
            await roomRef.child('status').set("PLAYING");
            // Set initial turn
            await roomRef.child('state/currentTurn').set(userId);
        }
    }
    res.send({ success: true });
});
