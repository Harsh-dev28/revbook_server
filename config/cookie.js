const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Same options (without maxAge) for clearing cookies reliably
const clearCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
};

const USER_COOKIE_NAME = 'usertoken';
const AUTHOR_COOKIE_NAME = 'authortoken';

module.exports = {
    cookieOptions,
    clearCookieOptions,
    USER_COOKIE_NAME,
    AUTHOR_COOKIE_NAME,
};
