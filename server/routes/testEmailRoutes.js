const express = require('express');
const router = express.Router();
const { sendEmail } = require('../services/emailService');

router.post('/send-test', async (req, res) => {
    const { email } = req.body;
    try {
        await sendEmail({
            to: email,
            subject: "Test Email from LinkVids",
            html: "<h1>It Works!</h1><p>This email was sent via the new Gmail integration.</p>"
        });
        res.json({ message: 'Email sent successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send email' });
    }
});

module.exports = router;