/**
 * X-API-Key Authentication Middleware for Member 2 Event Processor
 *
 * Validates the X-API-Key header against a comma-separated list of allowed keys
 * configured in the API_KEYS environment variable.
 */

function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'Missing X-API-Key header',
    });
  }

  const allowedKeys = (process.env.API_KEYS || 'dpdpa-api-key-001').split(',').map((k) => k.trim());

  if (!allowedKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key',
    });
  }

  next();
}

module.exports = apiKeyMiddleware;