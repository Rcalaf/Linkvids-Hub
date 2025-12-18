// server/controllers/globalDataController.js
const countryList = require('country-list');
const iso6391 = require('iso-639-1');

// Cache data to avoid recalculating on every request
const cachedData = {
    countries: countryList.getNames(),
    languages: iso6391.getAllNames(),
};

/**
 * GET /api/data/static-lists
 * Serves comprehensive lists of countries and languages.
 */
exports.getStaticLists = (req, res) => {
    // Send the structured, comprehensive data
    res.json(cachedData);
};