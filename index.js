const admin = require('firebase-admin');

// Firebase Admin Setup (Aapne jo JSON download kiya hoga console se)
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ludo-e8ffb-default-rtdb.firebaseio.com/" // Aapka URL yahan daalein
});

const db = admin.database();

console.log("Ludo Authoritative Server is LIVE...");

db.ref('rooms').on('child_changed', async (snapshot) => {
    const roomId = snapshot.key;
    const roomData = snapshot.val();

    if (roomData.actions && roomData.actions.pending) {
        const action = roomData.actions.pending;
        const stateRef = db.ref(`rooms/${roomId}/state`);

        // Turn Validation: Kya ye usi player ki turn hai?
        // Hum abhi simple Dice Roll logic handle kar rahe hain
        if (action.type === "ROLL") {
            const diceValue = Math.floor(Math.random() * 6) + 1;
            
            await stateRef.update({
                lastDice: diceValue,
                currentTurn: action.uid, // logic to switch turn can be added here
                status: "MOVING",
                timestamp: Date.now()
            });
            console.log(`Room: ${roomId} | Player: ${action.uid} rolled ${diceValue}`);
        }
        
        // Action process hone ke baad use delete karein
        await db.ref(`rooms/${roomId}/actions/pending`).remove();
    }
});
