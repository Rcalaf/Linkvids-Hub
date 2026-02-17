const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log("Firebase Admin Initialized. Project ID:", admin.app().options.credential.projectId); // <--- Add this

module.exports = admin;