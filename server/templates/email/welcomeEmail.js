const baseLayout = require('./baseLayout');

const welcomeEmail = (userName, loginUrl) => {
    const content = `
        <h2>Welcome to the Team, ${userName}!</h2>
        <p>We are thrilled to have you on board as a new creator on the LinkVids Platform.</p>
        <p>Your account has been successfully created. You can now access your dashboard to start managing your content and viewing your stats.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" class="button" style="color: #ffffff;">Access My Dashboard</a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="background: #f0f0f0; padding: 10px; font-family: monospace; word-break: break-all;">${loginUrl}</p>
        
        <p>Best regards,<br>The LinkVids Team</p>
    `;

    return baseLayout(content);
};

module.exports = welcomeEmail;