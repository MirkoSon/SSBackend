/**
 * Hello Route Handler
 *
 * GET /hello
 * Returns a simple greeting message.
 */

module.exports = (req, res) => {
  const { pluginName } = req.pluginContext;

  res.json({
    message: 'Hello from the hello-world plugin!',
    plugin: pluginName,
    timestamp: new Date().toISOString()
  });
};
