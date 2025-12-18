const Notification = require('../models/Notification');

// --- GET MY NOTIFICATIONS ---
exports.getMyNotifications = async (req, res) => {
    try {
       
        const notifications = await Notification.find({ recipient: req.user })
            .sort({ createdAt: -1 }) // Newest first
            .limit(50) // Limit to last 50 to keep it fast
            .populate('relatedJob', 'projectName'); // Get job title

        // Count unread
        const unreadCount = await Notification.countDocuments({ 
            recipient: req.user, 
            isRead: false 
        });

        res.json({ notifications, unreadCount });
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