// server/routes/adminRoutes.js (Updated)
const express = require('express');
const router = express.Router();
const userTypeController = require('../controllers/userTypeController');
// const verifyRoles = require('../middleware/verifyRoles');
const verifyJWT = require('../middleware/verifyJWT');


// --- User Type Configuration Routes ---
router.route('/')
    .get(userTypeController.getAllUserTypes)

router.use(verifyJWT);
router.route('/')
    .get(userTypeController.getAllUserTypes)
    .post(userTypeController.createNewUserType);

router.route('/:slug')
    .put(userTypeController.updateUserType)          
    .delete(userTypeController.deleteUserType);

module.exports = router;