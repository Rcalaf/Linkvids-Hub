
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const jobSchema = new Schema({

    projectName: { 
        type: String, 
        required: true,
        trim: true
    },
    projectDescription: { 
        type: String, 
        required: true 
    },
    deliverables: { 
        type: String, 
        required: true 
    },

    projectStartDate: { type: Date },
    projectEndDate: { type: Date },
    

    shootingDates: [{ type: Date }],

    projectLanguage: { 
        type: String,
        required: true
    },

    targetRole: { 
        type: String, 
        required: true 
    },
    rate: { 
        type: Number, 
        required: true 
    },
    imageRightsDuration: { 
        type: String, 
        required: true // e.g., "6 months", "2 years", "Perpetuity"
    },
    status: {
        type: String,
        enum: ['Draft', 'Open', 'Assigned', 'Completed', 'Cancelled'],
        default: 'Draft'
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User', // References BaseUser (could be Admin or Agency)
        required: true
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    applicants: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    rejectedApplicants: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
}, {
    timestamps: true
});

module.exports = mongoose.model('Job', jobSchema);