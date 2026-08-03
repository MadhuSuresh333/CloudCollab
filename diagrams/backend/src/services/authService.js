import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token for the given user ID.
 * @param {string} id - User's MongoDB ObjectId
 * @returns {string} Signed JWT token
 */
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Format user data for API responses (strips sensitive fields).
 * @param {object} user - Mongoose User document
 * @param {string} token - JWT token
 * @returns {object} Sanitized user response
 */
export const formatUserResponse = (user, token) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    token,
  };
};
