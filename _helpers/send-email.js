// const nodemailer = require('nodemailer');
// const config = require('config.json');

// module.exports = sendEmail;

// async function sendEmail({ to, subject, html, from = config.emailFrom }) {
//     const transporter = nodemailer.createTransport(config.smtpOptions);
//     await transporter.sendMail({ from, to, subject, html });
// }

//new for gmail verification

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }) {
  try {
      const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`, result);
  } catch (err) {
    console.error('❌ Error sending email:', err.message);
  }
}

module.exports = sendEmail;
