export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'chatlingua-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
