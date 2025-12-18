// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyJWT = require('../middleware/verifyJWT');

// NOTE: Add authentication middleware here (e.g., router.use(verifyAdminJWT))

router.use(verifyJWT);

router.route('/create')
    .post(userController.createNewUser); // CREATE (already implemented)

router.route('/')
    .get(userController.getAllUsers);     // READ ALL (LIST)

router.get('/dashboard-stats', userController.getDashboardStats);

router.route('/:userId')
    .get(userController.getUserById)     // SHOW / EDIT FORM LOAD
    .put(userController.updateExistingUser) // UPDATE
    .delete(userController.deleteUser);



module.exports = router;