// server/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT'); // Ensure you have this
const notificationController = require('../controllers/notificationController');

router.use(verifyJWT);

router.get('/', notificationController.getMyNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

router.post('/token', notificationController.registerPushToken);
router.post('/token/remove', notificationController.unregisterPushToken);

module.exports = router;