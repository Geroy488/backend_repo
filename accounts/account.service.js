const config = require('config.json');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require("crypto");
const { Op } = require('sequelize');
const sendEmail = require('_helpers/send-email');
const db = require('_helpers/db');
const Role = require('_helpers/role');

module.exports = {
    authenticate,
    refreshToken,
    revokeToken,
    register,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAll,
    getById,
    create,
    update,
    getAvailable   // 👈 added
};

// ------------------ AUTHENTICATION ------------------
async function authenticate({ email, password, ipAddress }) {
   const account = await db.Account.findOne({ where: { email } });

if (!account || !(await compare(password, account.passwordHash))) {
    throw 'Email or password is incorrect.';
}

// 🔹 Only check email verification now
if (!account.verified) {
    throw 'Please verify your email before logging in.';
}

// Optional: still allow admin to deactivate manually
if (account.status === 'Inactive') {
    throw 'Your account has been deactivated. Please contact support.';
}


    // ✅ Passed all checks — generate tokens
    const jwtToken = generateJwtToken(account);
    const refreshToken = generateRefreshToken(account, ipAddress);
    await refreshToken.save();

    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: refreshToken.token
    };
}

async function refreshToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);
    const account = await refreshToken.getAccount();

    const newRefreshToken = generateRefreshToken(account, ipAddress);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;

    await refreshToken.save();
    await newRefreshToken.save();

    return {
        ...basicDetails(account),
        jwtToken: generateJwtToken(account),
        refreshToken: newRefreshToken.token
    };
}

async function revokeToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
}

// ------------------ ACCOUNT MANAGEMENT ------------------

// REGISTER (user self-register)
async function register(params, origin) {
    // check if email already exists
    const existing = await db.Account.findOne({ where: { email: params.email } });
    if (existing) throw 'Email "' + params.email + '" is already registered';

    // create account with "Pending" status until admin or user verifies
    const account = new db.Account({
        title: params.title,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        passwordHash: await hash(params.password),
        role: Role.User,
        verificationToken: randomTokenString(),
        status: 'Pending'
    });

    await account.save();

    // send verification email
    await sendVerificationEmail(account, origin);

    return account;
}

async function verifyEmail({ token }) {
    const account = await db.Account.findOne({ where: { verificationToken: token } });

    if (!account) throw 'Verification failed — invalid token';

    // ✅ mark as verified and active
    account.verified = Date.now();
    account.verificationToken = null;
    account.status = 'Active';
    await account.save();
}

async function forgotPassword({ email }, origin) {
    const account = await db.Account.findOne({ where: { email } });
    if (!account) return;

    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() + 24*60*60*1000);
    await account.save();

    await sendPasswordResetEmail(account, origin);
}

async function validateResetToken({ token }) {
    const account = await db.Account.findOne({
        where: {
            resetToken: token,
            resetTokenExpires: { [Op.gt]: Date.now() }
        }
    });
    if (!account) throw 'Invalid token';
    return account;
}

async function resetPassword({ token, password }) {
    const account = await validateResetToken({ token });
    account.passwordHash = await hash(password);
    account.passwordReset = Date.now();
    account.resetToken = null;
    await account.save();
}

async function getAll() {
    const accounts = await db.Account.findAll({
        include: [
            {
                model: db.Employee,
                as: 'employees',   // must match association
                attributes: ['employeeId', 'positionId', 'status'],
                 include: [
                    {
                        model: db.Position,
                        as: 'position',
                        attributes: ['id', 'name'] // ✅ pull position name here
                    }
                ]
            }
        ]
    });

    return accounts.map(acc => ({
        id: acc.id,
        title: acc.title,
        firstName: acc.firstName,
        lastName: acc.lastName,
        email: acc.email,
        role: acc.role,
        status: acc.status,
        created: acc.created,
        updated: acc.updated,
        isVerified: acc.isVerified,
        // Handle plural employees
        employees: acc.employees ? acc.employees.map(emp => ({
            employeeId: emp.employeeId,
            position: emp.position ? emp.position.name : null, // ✅ from relation
            status: emp.status
        })) : []
    }));
}


async function getById(id) {
    const account = await getAccount(id);
    return basicDetails(account);
}

// CREATE (admin creating account)
async function create(params) {
    if (await db.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already registered';
    }

    const account = new db.Account({
        ...params,
        verified: Date.now(),              // Admin-created accounts are verified automatically
        passwordHash: await hash(params.password)
        // Use status exactly as provided
    });

    await account.save();

    // Only create employee if status is Active
    //if (account.status === 'Active') {
    //await ensureEmployeeExists(account);
    //}

    return basicDetails(account);
}

// UPDATE
async function update(id, params) {
    const account = await getAccount(id);

    // prevent overwriting password if not provided
    if (!params.password) {
        delete params.password;
    } else {
        params.passwordHash = await hash(params.password);
        delete params.password; // remove plain password
    }

    // ignore confirmPassword if passed accidentally
    delete params.confirmPassword;

    // email check
    if (params.email && account.email !== params.email && await db.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already taken';
    }

    Object.assign(account, params);
    account.updated = Date.now();
    await account.save();

    return basicDetails(account);
}

async function getAvailable() {
    // get all accountIds already used in employees
    const usedAccountIds = (await db.Employee.findAll({ attributes: ['accountId'] }))
        .map(e => e.accountId);

    // fetch only Active accounts not used yet
    const accounts = await db.Account.findAll({
        where: {
            id: { [Op.notIn]: usedAccountIds },
            status: 'Active'
        },
        attributes: ['id', 'firstName', 'lastName', 'email']
    });

    return accounts;
}

// ------------------ HELPER FUNCTIONS ------------------

// Get account by ID
async function getAccount(id) {
    const account = await db.Account.findByPk(id);
    if (!account) throw 'Account not found';
    return account;
}

// Refresh token helper
async function getRefreshToken(token) {
    const refreshToken = await db.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive) throw 'Invalid token';
    return refreshToken;
}

// Password hashing
async function hash(password) {
    return await bcrypt.hash(password, 10);
}

// JWT generation
function generateJwtToken(account) {
    return jwt.sign({ sub: account.id, id: account.id }, config.secret, { expiresIn: '15m' });
}

// Refresh token creation
function generateRefreshToken(account, ipAddress) {
    return new db.RefreshToken({
        accountId: account.id,
        token: randomTokenString(),
        expires: new Date(Date.now() + 7*24*60*60*1000),
        createdByIp: ipAddress
    });
}

// Random token generator
function randomTokenString() {
    return crypto.randomBytes(40).toString('hex');
}

// Basic account details
function basicDetails(account) {
    const { id, title, firstName, lastName, email, role, created, updated, isVerified, status } = account;
    return { id, title, firstName, lastName, email, role, created, updated, isVerified, status };
}

// ------------------ EMPLOYEE HELPER ------------------
async function ensureEmployeeExists (account) {
        await db.Employee.create({
            accountId: account.id,
            employeeId: await getNextEmployeeId(),
            firstName: account.firstName,
            lastName: account.lastName,
            email: account.email
        });
}

// Generate next employee ID
async function getNextEmployeeId() {
    const last = await db.Employee.findOne({
        order: [['employeeId', 'DESC']]
    });
    return last ? last.employeeId + 1 : 1;
}

// ------------------ EMAIL FUNCTIONS ------------------
// async function sendVerificationEmail(account, origin) {
//     let message;
//     if (origin) {
//         const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
//         message = `<p>Please click the link to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
//     } else {
//         message = `<p>Use this token to verify your email with the <code>/account/verify-email</code> API:</p><p><code>${account.verificationToken}</code></p>`;
//     }

//     await sendEmail({
//         to: account.email,
//         subject: 'Verify Email',
//         html: `<h4>Verify Email</h4>${message}`
//     });
// }

//new for gmail verification where it will send to me
// async function sendVerificationEmail(account, origin) {
//  const verifyUrl = `${process.env.FRONTEND_URL}/account/verify-email?token=${account.verificationToken}`;

//   await sendEmail({
//     to: 'mayecha302@gmail.com', // 👈 the email YOU want to receive verification requests
//     to: account.email, //user to get their own verification email instead
//     subject: 'New User Verification Request',
//     html: `
//       <h4>New User Registration</h4>
//       <p><strong>${account.firstName} ${account.lastName}</strong> (${account.email}) has registered.</p>
//       <p>Click below to verify their account:</p>
//       <p><a href="${verifyUrl}">${verifyUrl}</a></p>
//     `,
//   });
// }   

// Send verification email to the user's own Gmail
async function sendVerificationEmail(account, origin) {
  const verifyUrl = `${process.env.FRONTEND_URL}/account/verify-email?token=${account.verificationToken}`;

  await sendEmail({
    to: account.email, // 👈 send to the user's own email
    subject: 'Verify Your Email',
    html: `
      <h4>Hi ${account.firstName},</h4>
      <p>Thank you for registering! Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <br>
      <p>If you did not create this account, please ignore this email.</p>
    `,
  });
}


async function sendAlreadyRegisteredEmail(email, origin) {
    let message;
    if (origin) {
        message = `<p>If you forgot your password visit <a href="${origin}/account/forgot-password">forgot password</a>.</p>`;
    } else {
        message = `<p>You can reset your password via the <code>/account/forgot-password</code> API.</p>`;
    }

    await sendEmail({
        to: email,
        subject: 'Email Already Registered',
        html: `<h4>Email Already Registered</h4><p>Your email <strong>${email}</strong> is already registered.</p>${message}`
    });
}

async function sendPasswordResetEmail(account, origin) {
    let message;
    if (origin) {
        const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
        message = `<p>Click the link to reset your password (valid 1 day):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`;
    } else {
        message = `<p>Use this token to reset your password via the <code>/account/reset-password</code> API:</p><p><code>${account.resetToken}</code></p>`;
    }

    await sendEmail({
        to: account.email,
        subject: 'Reset Password',
        html: `<h4>Reset Password Email</h4>${message}`
    });
}
