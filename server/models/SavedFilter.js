const mongoose = require('mongoose');

const savedFilterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name for this filter set'],
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Filters are private to the admin who created them
    },
    context: {
        type: String,
        enum: ['collaborators', 'jobs', 'applications'],
        default: 'collaborators'
    },
    filters: {
        type: Object, // Stores the JSON object of filters
        required: true
    }
}, { timestamps: true });

// Prevent duplicate names for the same user & context
savedFilterSchema.index({ user: 1, name: 1, context: 1 }, { unique: true });

module.exports = mongoose.model('SavedFilter', savedFilterSchema);