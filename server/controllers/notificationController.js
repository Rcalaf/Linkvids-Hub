const Notification = require('../models/Notification');
const BaseUser = require('../models/BaseUser');

// --- GET MY NOTIFICATIONS ---
exports.getMyNotifications = async (req, res) => {
    try {
        // 1. Parse Pagination Params (with defaults)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 2. Fetch Paginated Data
        const notifications = await Notification.find({ recipient: req.user })
            .sort({ createdAt: -1 })    // Newest first
            .skip(skip)                 // 🚨 Skip previous pages
            .limit(limit)               // 🚨 Limit to requested amount
            .populate('relatedJob', 'projectName') 
            .lean();                    // Performance optimization

        // 3. Count Unread (Total)
        const unreadCount = await Notification.countDocuments({ 
            recipient: req.user, 
            isRead: false 
        });

        // 4. Return Data
        res.json({ 
            notifications, 
            unreadCount,
            page,
            limit 
        });

    } catch (error) {
        console.error("Notif Error:", error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

// --- MARK AS READ ---
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndUpdate(id, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update notification' });
    }
};

// --- MARK ALL AS READ ---
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user, isRead: false },
            { isRead: true }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update all' });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user; // From verifyJWT

        const notification = await Notification.findById(id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });

        // Security Check: Ensure the user owns this notification
        if (notification.recipient.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to delete this notification' });
        }

        await Notification.findByIdAndDelete(id);

        res.json({ message: 'Notification deleted successfully' });

    } catch (error) {
        console.error("Delete Notif Error:", error);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
};

exports.registerPushToken = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user;

        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        // Add token to BaseUser.fcmTokens array using $addToSet (prevents duplicates)
        await BaseUser.findByIdAndUpdate(userId, {
            $addToSet: { fcmTokens: token }
        });

        console.log(`FCM Token registered for user ${userId}`);
        res.json({ success: true, message: 'Token registered successfully' });

    } catch (error) {
        console.error("Register Token Error:", error);
        res.status(500).json({ message: 'Failed to register token' });
    }
};

exports.unregisterPushToken = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user;

        await BaseUser.findByIdAndUpdate(userId, {
            $pull: { fcmTokens: token }
        });

        res.json({ success: true, message: 'Token removed' });

    } catch (error) {
        console.error("Unregister Token Error:", error);
        res.status(500).json({ message: 'Failed to remove token' });
    }
};