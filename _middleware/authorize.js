const jwt = require('express-jwt');
const { secret } = require('config.json');
const db = require('_helpers/db');

module.exports = authorize;

function authorize(roles = []) {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        // authenticate JWT token
        jwt({ secret, algorithms: ['HS256'] }),

        // authorize based on user role
        async (req, res, next) => {
            console.log("🔑 Decoded JWT payload:", req.user);

            const account = await db.Account.findByPk(req.user.id);
            console.log("🗄️ Account from DB:", account ? { id: account.id, role: account.role, email: account.email } : null);

            if (!account || (roles.length && !roles.includes(account.role))) {
                console.log("❌ Unauthorized - reason: ", !account ? "Account not found" : "Role mismatch");
                return res.status(401).json({ message: 'Unauthorized' });
            }

            req.user.role = account.role;
            const refreshTokens = await account.getRefreshTokens();
            req.user.ownsToken = token => !!refreshTokens.find(x => x.token === token);
            
            console.log("✅ Authorized as:", account.role);
            next();
        }
    ];
}
