
const verifyRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.userType) {
            return res.sendStatus(401); // Unauthorized if no role found
        }

        // console.log(req.userType)
        // console.log(allowedRoles)
        // We compare the single string role (e.g., 'LinkVidsAdmin') against the allowed list
        const result = allowedRoles.includes(req.userType);
        
        if (!result) return res.sendStatus(401); // Unauthorized
        
        next();
    }
}

module.exports = verifyRoles;