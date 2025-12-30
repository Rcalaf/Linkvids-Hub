const allowedOrigins = require('./allowedOrigins');

const corsOptions = {

    origin: (origin, callback) => {
      // console.log(origin)
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    preflightContinue: false,
    credentials: true,
    // maxAge:600,
    optionsSuccessStatus: 200
}

module.exports = corsOptions;
