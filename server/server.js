// server/server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const dbConnect = require('./config/dbConnect');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const app = express();
const PORT = process.env.PORT || 3500;

// Connect to MongoDB (and run seeding)
dbConnect();

app.use(cors(corsOptions));

app.use(express.json()); // Built-in body parser for JSON
app.use(express.static(path.join(__dirname, 'public')));

// Routes (Admin/Auth/User management routes will go here)

app.use('/api/auth', require('./routes/authRoutes'));

app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/attributes', require('./routes/attributeRoutes'));
app.use('/api/user-types', require('./routes/userTypeRoutes'));
app.use('/api/data', require('./routes/dataRoutes'));
app.use('/api/collaborators', require('./routes/userRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/financial', require('./routes/financialRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/news', require('./routes/newsRoutes'));


// Start listening once DB connection is successful
mongoose.connection.once('open', () => {
    console.log('🔗 MongoDB Connected Successfully.');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});

mongoose.connection.on('error', err => {
    console.error(`❌ MongoDB connection error: ${err}`);
});