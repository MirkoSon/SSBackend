/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with valid flag and error messages
 */
function validatePassword(password) {
  const minLength = 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { valid: false, errors };
  }
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (!hasLetter) {
    errors.push('Password must contain at least one letter');
  }
  
  if (!hasNumber) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get password requirements as human-readable text
 * @returns {Array} Array of requirement strings
 */
function getPasswordRequirements() {
  return [
    'At least 6 characters long',
    'Contains at least one letter (a-z, A-Z)',
    'Contains at least one number (0-9)'
  ];
}

module.exports = {
  validatePassword,
  getPasswordRequirements
};
