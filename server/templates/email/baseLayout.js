// server/templates/baseLayout.js

const baseLayout = (content) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LinkVids Notification</title>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background-color: #2e3c50; padding: 20px; text-align: center; }
            .header img { max-height: 50px; }
            .content { padding: 30px 20px; color: #333333; line-height: 1.6; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
            .footer { background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888888; }
            .footer a { color: #888888; text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="color: #ffffff; margin: 0;">LinkVids Platform</h1>
                </div>

            <div class="content">
                ${content}
            </div>

            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} LinkVids Platform. All rights reserved.</p>
                <p>
                    <a href="https://your-domain.com/privacy">Privacy Policy</a> | 
                    <a href="https://your-domain.com/support">Support</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = baseLayout;