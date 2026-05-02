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

    // Delete from all possible user collections
    batch.delete(db.collection("users").doc(uid));
    batch.delete(db.collection("admins").doc(uid));
    batch.delete(db.collection("members").doc(uid));
    batch.delete(db.collection("memberApplications").doc(uid));

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

// New function to handle Admin Email Update via the reliable "mail" collection
exports.requestAdminEmailUpdate = onCall({ cors: true }, async (request) => {
  const { newEmail } = request.data;
  
  // 1. Security Check: Only authenticated users can call this
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "You must be logged in to change your email.");
  }

  if (!newEmail) {
    throw new HttpsError("invalid-argument", "Missing new email.");
  }

  try {
    const uid = request.auth.uid;
    const oldEmail = request.auth.token.email;

    console.log(`Performing direct email update for UID ${uid}: ${oldEmail} -> ${newEmail}`);

    // 2. Direct Update (Works without Identity Platform)
    await admin.auth().updateUser(uid, {
      email: newEmail,
      emailVerified: true // Mark as verified since the Admin performed this action while logged in
    });

    // Generate a custom token for automatic login if permissions allow
    let loginUrl = request.data.url;
    try {
        const customToken = await admin.auth().createCustomToken(uid);
        loginUrl = `${request.data.url}?token=${customToken}`;
    } catch (tokenErr) {
        console.warn("Could not create custom token (missing IAM permissions). Falling back to standard login link.", tokenErr);
    }

    // 3. Send Confirmation Email via the reliable "mail" collection
    await db.collection("mail").add({
      to: newEmail,
      message: {
        subject: 'Admin Email Updated - X Foundary',
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 450px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 12px; color: #111;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background-color: #6300dd; width: 42px; height: 42px; line-height: 42px; display: inline-block; border-radius: 0; color: white; font-weight: 800; font-size: 16px; text-align: center;">X</div>
              <h2 style="margin-top: 20px; color: #111;">Email Updated Successfully</h2>
            </div>
            <p>Hello,</p>
            <p>Your administrative email for X Foundary has been successfully updated.</p>
            <p><strong>New Email:</strong> ${newEmail}</p>
            <p><strong>Old Email:</strong> ${oldEmail}</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="background-color: #111; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Log in to Dashboard</a>
            </div>
            
            <p style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              If you did not perform this change, please contact support immediately.
            </p>
          </div>
        `
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating admin email:", error);
    if (error.code) {
        throw new HttpsError("internal", `Update Error (${error.code}): ${error.message}`);
    }
    throw new HttpsError("internal", error.message);
  }
});

// New function to generate and send OTP (V2)
exports.requestLoginCode = onCall({ cors: true }, async (request) => {
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
    await db.collection("login_codes").doc(email.toLowerCase()).set({
      code: otpCode,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // 4. Generate the Magic Link
    const actionCodeSettings = {
      url: 'https://xfoundaryapp.web.app/login', 
      handleCodeInApp: true,
    };
    const magicLink = await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);

    // 5. Send email
    await db.collection("mail").add({
      to: email,
      message: {
        subject: 'Sign in to X Foundary',
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 450px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 12px; color: #111;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background-color: #000; width: 42px; height: 42px; line-height: 42px; display: inline-block; border-radius: 0; color: white; font-weight: 800; font-size: 16px; text-align: center;">XF</div>
              <h2 style="margin-top: 20px; color: #111;">Sign in to X Foundary</h2>
            </div>
            <p>Hello,</p>
            <p>We received a request to sign in to your account. You can sign in instantly by clicking the link below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" style="background-color: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Sign in to X Foundary</a>
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
exports.verifyLoginCode = onCall({ cors: true }, async (request) => {
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

    if (code !== otp) {
      throw new HttpsError("permission-denied", "Incorrect code. Please try again.");
    }

    if (Date.now() > expiresAt) {
      throw new HttpsError("deadline-exceeded", "Code has expired. Please request a new one.");
    }

    await otpRef.delete();

    const userRecord = await admin.auth().getUserByEmail(email.toLowerCase());
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    return { token: customToken };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

// Function to handle application status updates (Submission & Approval)
// Function to handle application status updates (Submission, Approval, Hold, Reject)
exports.onApplicationUpdate = functions.firestore.document('users/{uid}').onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const uid = context.params.uid;

    if (!newData.application) return;

    const newStatus = newData.application.status;
    const oldStatus = oldData.application?.status;

    // If status hasn't changed, do nothing
    if (newStatus === oldStatus) return;

    const email = newData.email;
    const name = newData.profile?.name || email?.split('@')[0] || 'Founder';
    const companyName = newData.application?.companyName || 'your startup';
    const batch = newData.application?.batch || 'Summer 2026';

    console.log(`Status transition for ${email}: ${oldStatus} -> ${newStatus}`);

    let mailData = null;

    if (newStatus === 'pending' && oldStatus !== 'pending') {
        // 1. SUBMISSION
        mailData = {
            subject: `XF ${batch} Application Submitted`,
            html: `
                <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 12px; color: #111; line-height: 1.6;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="background-color: #000; width: 42px; height: 42px; line-height: 42px; display: inline-block; border-radius: 0; color: white; font-weight: 800; font-size: 16px; text-align: center;">XF</div>
                        <h2 style="margin-top: 20px; color: #111;">Application Submitted</h2>
                    </div>
                    <p>Hello ${name},</p>
                    <p>Congratulations on applying to X Foundary!</p>
                    <p>Your application to the <strong>${batch}</strong> batch for <strong>${companyName}</strong> has been successfully submitted.</p>
                    <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #eee;">
                        <p style="margin: 0; font-size: 14px; color: #666;">
                            <strong>What happens next?</strong><br/>
                            You can still edit your application for the next 24 hours. After that, our team will begin the review process.
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://xfoundaryapp.web.app/home" style="background-color: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Application Status</a>
                    </div>
                    <p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
                        Good luck with your startup journey!<br/>
                        — The X Foundary Team
                    </p>
                </div>
            `
        };
    } else if (newStatus === 'approved' && oldStatus !== 'approved') {
        // 2. APPROVAL
        mailData = {
            subject: `Congratulations! Your application for ${companyName} has been accepted`,
            html: `
                <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 12px; color: #111; line-height: 1.6;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="background-color: #000; width: 42px; height: 42px; line-height: 42px; display: inline-block; border-radius: 0; color: white; font-weight: 800; font-size: 16px; text-align: center;">XF</div>
                        <h2 style="margin-top: 20px; color: #111;">Welcome to X Foundary!</h2>
                    </div>
                    <p>Hello ${name},</p>
                    <p>We have great news! We've reviewed your application and are incredibly excited to invite <strong>${companyName}</strong> to join the <strong>X Foundary ${batch}</strong> batch.</p>
                    <p>We were very impressed with your vision and look forward to helping you grow.</p>
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #dcfce7;">
                        <p style="margin: 0; font-size: 14px; color: #166534;">
                            <strong>What's next?</strong><br/>
                            Log in to your dashboard to see the next steps and join the founder community.
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://xfoundaryapp.web.app/home" style="background-color: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
                    </div>
                    <p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
                        Welcome to the family!<br/>
                        — The X Foundary Team
                    </p>
                </div>
            `
        };
    } else if (newStatus === 'hold' && oldStatus !== 'hold') {
        // 3. HOLD
        mailData = {
            subject: `Update on your ${companyName} application - X Foundary`,
            html: `
                <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 12px; color: #111; line-height: 1.6;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="background-color: #000; width: 42px; height: 42px; line-height: 42px; display: inline-block; border-radius: 0; color: white; font-weight: 800; font-size: 16px; text-align: center;">XF</div>
                        <h2 style="margin-top: 20px; color: #111;">Application Update</h2>
                    </div>
                    <p>Hello ${name},</p>
                    <p>Thank you for your patience as we review applications for the <strong>${batch}</strong> batch.</p>
                    <p>We wanted to let you know that your application for <strong>${companyName}</strong> looks very promising! Our team would like a bit more time to carefully review your materials.</p>
                    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #92400e;">
                        <p style="margin: 0; font-size: 14px; color: #92400e;">
                            <strong>What this means:</strong><br/>
                            We haven't made a final decision yet. We are doing a deeper dive into your vision and will revert back to you soon with an update.
                        </p>
                    </div>
                    <p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
                        Thank you for being part of X&nbsp;Foundary.<br/>
                        — The X Foundary Team
                    </p>
                </div>
            `
        };
    } else if (newStatus === 'rejected' && oldStatus !== 'rejected') {
        // 4. REJECTED
        mailData = {
            subject: `Your X Foundary Application`,
            html: `
                <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #111; line-height: 1.6;">
                    <p>Hi ${name},</p>
                    <p>Thanks for applying to X Foundary. We're sorry to say that your startup was not selected for an interview. We carefully reviewed thousands of applications, and with so many strong submissions, we had to make difficult decisions. Unfortunately, this meant turning away many promising companies.</p>
                    <p>Unfortunately we can't give you individual feedback about your application. <a href="https://xfoundaryapp.web.app/faq" style="color: #000; text-decoration: underline;">This page explains why.</a></p>
                    <p>We hope you apply again in the future as you continue to make progress. In fact, we encourage it. Applying multiple times does not count against you and a surprisingly large number of companies are funded after applying more than once. Over 50% of the startups we accept are repeat applicants.</p>
                    <p>Best of luck,</p>
                    <p style="margin-top: 30px; font-weight: bold;">—XF</p>
                </div>
            `
        };
    }

    if (mailData && email) {
        console.log(`Dispatching email to ${email} for status: ${newStatus}`);
        try {
            await db.collection("mail").add({
                to: email,
                message: mailData
            });
            console.log(`Email successfully queued for ${email}`);
        } catch (e) {
            console.error(`Error queuing email for ${email}:`, e);
        }
    }
});


// New function to delete a user account from Auth (V2)
exports.deleteUserAccount = onCall({ cors: true }, async (request) => {
  const { uid } = request.data;

  console.log(`Delete request received for UID: ${uid} from requester: ${request.auth?.uid}`);

  // 1. Security Check: Only authenticated admins can call this
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "You must be logged in to perform this action.");
  }

  try {
    // Verify requester is an admin
    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists) {
      console.error(`Permission Denied: User ${request.auth.uid} is not an admin.`);
      throw new HttpsError("permission-denied", "Access Denied: Only administrators can delete accounts.");
    }

    if (!uid) {
      throw new HttpsError("invalid-argument", "Missing UID of the account to delete.");
    }

    console.log(`Admin ${request.auth.uid} confirmed. Deleting user account: ${uid}`);
    
    // Check if user exists in Auth first
    try {
      await admin.auth().getUser(uid);
    } catch (authErr) {
      console.warn(`User ${uid} not found in Auth, checking Firestore for cleanup...`);
      // If not in Auth, still try to trigger the cleanup by deleting Firestore doc if it exists
      await db.collection("users").doc(uid).delete().catch(() => {});
      return { success: true, message: "User not in Auth, Firestore record cleaned." };
    }

    // Delete from Auth
    await admin.auth().deleteUser(uid);
    console.log(`Successfully deleted Auth account for: ${uid}`);

    return { success: true };
  } catch (error) {
    console.error("Error in deleteUserAccount:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "An unexpected error occurred during account deletion.");
  }
});
