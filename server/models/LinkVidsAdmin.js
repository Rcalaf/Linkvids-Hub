// server/models/LinkVidsAdmin.js
const BaseUser = require('./BaseUser');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
    permissionLevel: {
        type: String,
        enum: ['SuperAdmin', 'Manager', 'Viewer'],
        default: 'Viewer',
        required: true
    },
    department: { type: String },
});

const LinkVidsAdmin = BaseUser.discriminator('LinkVidsAdmin', adminSchema);
module.exports = LinkVidsAdmin;