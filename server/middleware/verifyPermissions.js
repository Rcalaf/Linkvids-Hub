// server/middleware/verifyPermissions.js
const BaseUser = require('../models/BaseUser');

const verifyPermissions = (requiredModule, requiredLevel) => {
    return async (req, res, next) => {
        try {
            const userId = req.user; // From verifyJWT
            const user = await BaseUser.findById(userId).select('permissions userType').lean();

            if (!user) return res.sendStatus(401);

            // 1. Super-Super Fallback: If for some reason they don't have the permission object
            if (!user.permissions) {
                return res.status(403).json({ message: 'No permissions found for this user.' });
            }

            // 2. Define Hierarchy
            const levels = { none: 0, view: 1, edit: 2 };
            const userLevel = levels[user.permissions[requiredModule] || 'none'];
            const reqLevel = levels[requiredLevel];

            // 3. Check Access
            if (userLevel >= reqLevel) {
                next(); // ✅ Access Granted
            } else {
                res.status(403).json({ 
                    message: `Access Denied: You need '${requiredLevel}' access for ${requiredModule}.` 
                });
            }

        } catch (error) {
            console.error("Permission Check Error:", error);
            res.sendStatus(500);
        }
    };
};

module.exports = verifyPermissions;