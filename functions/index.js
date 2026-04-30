const functions = require("firebase-functions/v1");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
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

// New function to generate and send OTP (V2)
exports.requestLoginCode = onCall(async (request) => {
  const { email } = request.data;

  if (!email) {
    throw new HttpsError("invalid-argument", "Missing email.");
  }

  try {
    // 1. Check if user exists in Auth
    const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);
    if (!userRecord) {
      throw new HttpsError("not-found", "Account does not exist. Please create an account first.");
    }

    // 2. Generate a 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 3. Save OTP to Firestore (expires in 10 mins)
    // Backend has admin privileges, so it ignores security rules
    await db.collection("login_codes").doc(email.toLowerCase()).set({
      code: otpCode,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // 4. Generate the Magic Link
    const actionCodeSettings = {
      url: 'https://xfoundaryapp.web.app/login', // Change this to your actual production domain if different
      handleCodeInApp: true,
    };
    const magicLink = await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);

    // 5. Send a single COMBINED email
    await db.collection("mail").add({
      to: email,
      message: {
        subject: 'Sign in to X Foundary',
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 450px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 12px; color: #111;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background-color: #6300dd; width: 42px; height: 42px; line-height: 42px; display: inline-block; border-radius: 4px; color: white; font-weight: 800; font-size: 16px; text-align: center;">XF</div>
              <h2 style="margin-top: 20px; color: #111;">Sign in to X Foundary</h2>
            </div>
            
            <p>Hello,</p>
            <p>We received a request to sign in to your account. You can sign in instantly by clicking the link below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" style="background-color: #6300dd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Sign in to X Foundary</a>
            </div>
            
            <p style="text-align: center; color: #888; font-size: 0.9rem;">— OR —</p>
            
            <p>Enter this 6-digit code on the login page:</p>
            <div style="background: #f8f8f8; padding: 20px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #111; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
              ${otpCode}
            </div>
            
            <p style="font-size: 12px; color: #999; margin-top: 30px; line-height: 1.5;">
              If you did not request this link, you can safely ignore this email. This link and code will expire in 10 minutes.
            </p>
          </div>
        `
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending OTP:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

// New function to verify OTP and return a custom auth token (V2)
exports.verifyLoginCode = onCall(async (request) => {
  const { email, otp } = request.data;

  if (!email || !otp) {
    throw new HttpsError("invalid-argument", "Missing email or OTP.");
  }

  try {
    const otpRef = db.collection("login_codes").doc(email.toLowerCase());
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists) {
      throw new HttpsError("not-found", "No code found for this email.");
    }

    const { code, expiresAt } = otpDoc.data();

    // Check if code matches and is not expired
    if (code !== otp) {
      throw new HttpsError("permission-denied", "Incorrect code. Please try again.");
    }

    if (Date.now() > expiresAt) {
      throw new HttpsError("deadline-exceeded", "Code has expired. Please request a new one.");
    }

    // Code is valid! Delete it so it can't be reused
    await otpRef.delete();

    // Get the user's UID to create a custom token
    const userRecord = await admin.auth().getUserByEmail(email.toLowerCase());
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    return { token: customToken };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});
