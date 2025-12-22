const nodemailer = require('nodemailer');

// Create the Transporter using standard Gmail service
// This works for both @gmail.com and Google Workspace (@yourcompany.com)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, 
    },
});

// Verify connection on server startup
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Email Service Error:", error.message);
    } else {
        console.log(`✅ Email Service Ready (${process.env.EMAIL_USER})`);
    }
});

exports.sendEmail = async ({ to, subject, html, text }) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM, // "Your Name <email@company.com>"
        to: to,
        subject: subject,
        text: text || "Please view this email in an HTML compatible viewer.",
        html: html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error; // Rethrow so the controller knows it failed
    }
};