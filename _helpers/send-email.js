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
    await resend.emails.send({
      from,
      to: 'mayecha302@gmail.com', // 👈 send notification to YOU
      subject: 'New User Verification Request',
      html: `
    <h4>New User Registration</h4>
    <p><strong>${account.firstName} ${account.lastName}</strong> (${account.email}) has registered.</p>
    <p>Click below to verify their account:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
  `
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Error sending email:', err.message);
  }
}

module.exports = sendEmail;
