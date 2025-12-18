const verifyOwnership = (req, res, next) => {
    // 1. Get Requester Info (Attached by verifyJWT)
    const requesterId = req.user; 
    const requesterRole = req.userType;

    // 2. Get Target Resource ID (from URL params)
    const { userId } = req.params; 

    // 3. Logic: Admin can do anything; Users can only touch their own data
    if (requesterRole === 'LinkVidsAdmin') {
        return next(); // Admin allowed
    }

    if (requesterId === userId) {
        return next(); // Owner allowed
    }

    // 4. Deny Access
    return res.status(403).json({ message: 'Forbidden: You do not have permission to modify this resource.' });
};

module.exports = verifyOwnership;