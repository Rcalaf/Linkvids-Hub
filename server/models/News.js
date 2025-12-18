// server/models/News.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const newsSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    excerpt: {
        type: String, // Short summary for the list view
        required: true,
        maxlength: 200
    },
    content: {
        type: String, // Full HTML or Text content
        required: true
    },
    image: {
        type: String, // URL to cover image
        default: null
    },
    status: {
        type: String,
        enum: ['Draft', 'Published'],
        default: 'Draft'
    },
    linkUrl: { 
        type: String, 
        trim: true,
        default: '' 
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User', // References BaseUser (could be Admin or Agency)
        required: true
    },
}, { timestamps: true });

module.exports = mongoose.model('News', newsSchema);