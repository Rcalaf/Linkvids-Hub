const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');
const verifyOwnership = require('../middleware/verifyOwnership');
const verifyJWT = require('../middleware/verifyJWT');

router.use(verifyJWT);

router.get('/:userId', verifyOwnership, financialController.getFinancialProfile);
router.put('/:userId', verifyOwnership, financialController.updateFinancialProfile);
router.delete('/:userId', verifyOwnership, financialController.deleteFinancialProfile);

module.exports = router;