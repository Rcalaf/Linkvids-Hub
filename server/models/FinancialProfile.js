// server/models/FinancialProfile.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const financialProfileSchema = new Schema({
    profileType: {
        type: String,
        required: true,
        enum: ['Company', 'SelfEmployed', 'Individual'],
        default: 'Individual'
    },

    // --- 1. COMMON DATA (For all types) ---
    billingContactName: { type: String, required: true }, // Persona de contacto
    billingEmail: { type: String, required: true },       // Correo electrónico de contacto
    billingPhone: { type: String },                       // Teléfono (Opcional)
    fiscalAddress: { type: String, required: true },      // Dirección fiscal

    // --- 2. COMPANY DATA (S.L., S.A., etc.) ---
    companyName: { 
        type: String, 
        required: function() { return this.profileType === 'Company'; } 
    },
    taxId: {  // NIF / CIF
        type: String, 
        required: function() { return this.profileType === 'Company' || this.profileType === 'SelfEmployed'; } 
    },
    vatNumber: { type: String }, // IVA Intracomunitario (Optional)
    
    // --- 3. SELF EMPLOYED (Autónomo) ---
    // Uses 'billingContactName' for Name and 'taxId' for NIF.
    
    // --- 4. INDIVIDUAL (Particular) ---
    nationalId: { // DNI / NIE
        type: String, 
        required: function() { return this.profileType === 'Individual'; } 
    },
    socialSecurityNumber: { 
        type: String, 
        required: function() { return this.profileType === 'Individual'; } 
    },
    
    // --- BANKING (Common but conditional logic) ---
    bankAccountHolder: { type: String },
    iban: { type: String },
    swiftBic: { type: String },

}, { _id: false }); 

module.exports = financialProfileSchema;