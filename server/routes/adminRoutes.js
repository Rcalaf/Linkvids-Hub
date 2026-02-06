const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT');
const verifyRoles = require('../middleware/verifyRoles');
const verifyPermissions = require('../middleware/verifyPermissions');
const adminController = require('../controllers/adminController');
const jobController = require('../controllers/jobControllers');

router.use(verifyJWT);
//router.use(verifyRoles('LinkVidsAdmin')); 

router.get('/', adminController.getDashboardStats);

router.route('/users')
    .get(verifyPermissions('users', 'view'),adminController.getAllAdmins)
    .post(verifyPermissions('users', 'edit'),adminController.createAdmin);

router.route('/users/:id')
    .get(verifyPermissions('users', 'view'),adminController.getAdminById)
    .put(verifyPermissions('users', 'edit'),adminController.updateAdmin)
    .delete(verifyPermissions('users', 'edit'),adminController.deleteAdmin);

router.put('/users/:id/status',verifyPermissions('users', 'edit'), adminController.toggleAdminStatus);

module.exports = router;