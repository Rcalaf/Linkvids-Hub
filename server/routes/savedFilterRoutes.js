const express = require('express');
const router = express.Router();
const filtersController = require('../controllers/savedFilterController');
const verifyJWT = require('../middleware/verifyJWT');

router.use(verifyJWT);

router.route('/')
    .post(filtersController.saveFilter)
    .get(filtersController.getMyFilters);

router.route('/:id')
    .delete(filtersController.deleteFilter);

module.exports = router;