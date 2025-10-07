const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Add this line to verify connection when the app starts
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email transporter connection failed:', error);
    } else {
        console.log('✅ Email transporter is ready to send messages.');
    }
});

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }) {
    try {
        await transporter.sendMail({ from, to, subject, html });
        console.log(`✅ Email sent to ${to}`);
    } catch (err) {
        console.error('❌ Error sending email:', err);
    }
}

module.exports = sendEmail;
