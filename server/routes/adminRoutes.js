const express = require('express');
const router = express.Router();
const verifyJWT = require('../middleware/verifyJWT');
const verifyRoles = require('../middleware/verifyRoles');
const verifyPermissions = require('../middleware/verifyPermissions');
const adminController = require('../controllers/adminController');

router.use(verifyJWT);
router.use(verifyRoles('LinkVidsAdmin')); 

router.get('/', adminController.getDashboardStats);

router.route('/users')
    .get(verifyPermissions('admins', 'view'),adminController.getAllAdmins)
    .post(verifyPermissions('admins', 'edit'),adminController.createAdmin);

router.route('/users/:id')
    .get(verifyPermissions('admins', 'view'),adminController.getAdminById)
    .put(verifyPermissions('admins', 'edit'),adminController.updateAdmin)
    .delete(verifyPermissions('admins', 'edit'),adminController.deleteAdmin);

router.put('/users/:id/status',verifyPermissions('admins', 'edit'), adminController.toggleAdminStatus);

module.exports = router;