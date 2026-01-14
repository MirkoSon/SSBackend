/**
 * Personalized Hello Route Handler
 *
 * GET /hello/:name
 * Returns a personalized greeting.
 */

module.exports = (req, res) => {
  const { name } = req.params;

  res.json({
    message: `Hello, ${name}!`,
    greeting: `Welcome to SSBackend, ${name}. This message comes from a plugin.`,
    timestamp: new Date().toISOString()
  });
};
