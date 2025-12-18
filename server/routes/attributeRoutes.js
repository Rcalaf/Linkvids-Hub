// server/routes/adminRoutes.js (Updated)
const express = require('express');
const router = express.Router();
const attributesController = require('../controllers/attributesController');
// const verifyRoles = require('../middleware/verifyRoles');
const verifyJWT = require('../middleware/verifyJWT');

router.use(verifyJWT);
// --- Attribute Definitions Routes ---
router.route('/')
    .get(attributesController.getAllAttributes)
    .post(attributesController.createNewAttribute);

router.route('/:slug')
    .put(attributesController.updateAttribute)
    .delete(attributesController.deleteAttribute);



module.exports = router;