const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Using the stable V1 syntax which is more reliable for cleanup tasks
exports.onuserdelete = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const email = user.email;

  console.log(`Cleaning up data for deleted user: ${uid} (${email})`);

  try {
    const batch = db.batch();

    // 1. Find and delete their username mapping
    const usernameSnapshot = await db.collection("usernames").where("uid", "==", uid).get();
    usernameSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 2. Find and delete their email history in the "mail" collection
    if (email) {
      const mailSnapshot = await db.collection("mail").where("to", "==", email).get();
      mailSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
    }

    // Execute the deletions
    await batch.commit();
    console.log(`Successfully deleted all Firestore data for user: ${uid}`);
  } catch (error) {
    console.error(`Error during user cleanup for ${uid}:`, error);
  }
});
