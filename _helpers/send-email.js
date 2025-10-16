// const nodemailer = require('nodemailer');
// const config = require('config.json');

// module.exports = sendEmail;

// async function sendEmail({ to, subject, html, from = config.emailFrom }) {
//     const transporter = nodemailer.createTransport(config.smtpOptions);
//     await transporter.sendMail({ from, to, subject, html });
// }

//new for gmail verification

// file: _helpers/send-email.js

const { Resend } = require('resend');

let resend;

// Initialize Resend only if API key is available
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log("📨 Resend email service initialized");
} else {
  console.log("⚠️ Resend API key missing — emails will NOT be sent");
}

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }) {
  if (!resend) {
    console.log("📧 Skipping email send (Resend disabled):", { to, subject });
    return { success: false, message: "Email sending disabled" };
  }

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`, result);
    return result;
  } catch (err) {
    console.error("❌ Error sending email:", err.message);
    return { success: false, message: err.message };
  }
}

module.exports = sendEmail;
