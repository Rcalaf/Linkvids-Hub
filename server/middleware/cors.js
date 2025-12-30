const allowedOrigins = require('../config/allowedOrigins');

const cors = (req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || !origin) {
        if(!origin) res.header("Access-Control-Allow-Origin", '*'); // restrict it to the required domain
        else res.header("Access-Control-Allow-Origin", origin); // restrict it to the required domain
    }
    next();
}

module.exports = cors