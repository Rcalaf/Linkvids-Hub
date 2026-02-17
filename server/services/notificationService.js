const admin = require('../config/firebase'); 
const Notification = require('../models/Notification');
const BaseUser = require('../models/BaseUser'); 

exports.sendNotification = async ({ userId, title, message, type = 'SYSTEM', data = {}, relatedJobId = null }) => {
    try {
        // 1. Save to Database (In-App History)
        const notification = await Notification.create({
            recipient: userId,
            title,
            message,
            type,
            data,
            relatedJob: relatedJobId // Optional: Link to Job model if provided
        });

        // 2. Fetch User's FCM Tokens from BaseUser
        // We must use .select('+fcmTokens') because we set select: false in the schema
        const user = await BaseUser.findById(userId).select('+fcmTokens');
        
        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
            console.log(`User ${userId} has no FCM tokens registered.`);
            return notification; // Return saved notification even if push fails
        }

        // 3. Prepare Firebase Payload
        // Note: FCM expects all 'data' values to be Strings!
        const stringifiedData = {
            screen: data.screen || '', 
            relatedId: data.relatedId || '',
            notificationId: notification._id.toString(), // Crucial for tracking
            type: type
        };

        const payload = {
            notification: {
                title: title,
                body: message,
            },
            data: stringifiedData, 
            tokens: user.fcmTokens
        };

        // 4. Send via Firebase Multicast
        const response = await admin.messaging().sendMulticast(payload);
        
        // 5. Cleanup Invalid Tokens (e.g., app uninstalled)
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    // Error codes: 'messaging/invalid-registration-token' or 'messaging/registration-token-not-registered'
                    failedTokens.push(user.fcmTokens[idx]);
                }
            });

            if (failedTokens.length > 0) {
                await BaseUser.updateOne(
                    { _id: userId },
                    { $pull: { fcmTokens: { $in: failedTokens } } }
                );
                console.log(`Removed ${failedTokens.length} invalid tokens for user ${userId}`);
            }
        }

        return notification;

    } catch (error) {
        console.error("Notification Service Error:", error);
        // Don't crash the app if notification fails, just log it
    }
};