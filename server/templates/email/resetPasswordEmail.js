const baseLayout = require('./baseLayout');

const resetPasswordEmail = (userName, resetLink) => {
    const content = `
        <h3>Password Reset Request</h3>
        <p>Hi ${userName},</p>
        <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" class="button" style="background-color: #dc3545; color: #ffffff;">Reset Password</a>
        </div>
        
        <p>This link will expire in 1 hour.</p>
    `;

    return baseLayout(content);
};

module.exports = resetPasswordEmail;