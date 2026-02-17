const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
        type: String, 
        enum: ['JOB_ASSIGNED', 'JOB_REJECTED','JOB_INVITE', 'SYSTEM', 'INFO', 'ALERT'], 
        default: 'SYSTEM',
        required: true 
    },
    message: { type: String, required: true },
    relatedJob: { type: Schema.Types.ObjectId, ref: 'Job' },
    isRead: { type: Boolean, default: false },
    data: { 
        type: Object,
        default: {}
    },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);