/**
 * PrivGuard Zero-Touch DPDPA Compliance Middleware / SDK
 *
 * Plug-and-play integration for ANY Node.js / Express client application.
 * Requires ONLY 1 LINE OF CODE in the client app:
 *
 *   const privguard = require('./privguard-middleware');
 *   app.use(privguard({ serviceName: 'my-app', fiduciaryName: 'My Company Pvt. Ltd.' }));
 *
 * Automatically provides:
 *  1. Zero-code Request Interception & Live DPDPA Telemetry Emission.
 *  2. Auto-mounted Statutory Audit Feeds (/audit-feed/policy, /audit-feed/logs, /audit-feed/consents).
 *  3. In-memory Log Capturing & PII Telemetry Forwarding.
 */

const axios = require('axios');

function privguard(options = {}) {
  const PRIVGUARD_URL = options.privguardUrl || process.env.PRIVGUARD_URL || 'http://localhost:5000';
  const SERVICE_NAME = options.serviceName || process.env.TARGET_APP_NAME || 'client-application';
  const FIDUCIARY_NAME = options.fiduciaryName || 'Client Application Technologies Pvt. Ltd.';
  const DPO_EMAIL = options.dpoEmail || 'dpo@clientapp.local';
  const GRIEVANCE_EMAIL = options.grievanceEmail || 'grievance@clientapp.local';

  // Circular in-memory audit log buffer for DPDPA statutory scans
  const memoryLogs = [];

  // Helper to infer Event Type from HTTP Method & Route Path
  function inferEventType(method, path) {
    const p = path.toLowerCase();
    if (p.includes('login') || p.includes('auth')) return 'USER_LOGIN';
    if (p.includes('register') || p.includes('signup')) return 'USER_REGISTERED';
    if (p.includes('profile')) return method === 'GET' ? 'USER_PROFILE_ACCESSED' : 'USER_PROFILE_UPDATED';
    if (p.includes('order') || p.includes('checkout') || p.includes('cart')) return 'ORDER_CREATED';
    if (p.includes('consent')) return method === 'DELETE' ? 'CONSENT_WITHDRAWN' : 'CONSENT_GRANTED';
    if (p.includes('kyc') || p.includes('document')) return 'KYC_DOC_UPLOADED';
    if (p.includes('delete') || p.includes('erasure')) return 'DATA_DELETION_REQUESTED';
    if (p.includes('marketing')) return 'MARKETING_PROCESSING';
    return `${method}_${p.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  }

  // Middleware Dispatcher
  return function privguardMiddleware(req, res, next) {
    const path = req.path || req.url;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. AUTO-MOUNTED DPDPA STATUTORY AUDIT FEED ENDPOINTS (Zero Code Required)
    // ─────────────────────────────────────────────────────────────────────────
    if (path === '/audit-feed/policy') {
      return res.json({
        success: true,
        policy: {
          title: `${FIDUCIARY_NAME} Digital Privacy Notice`,
          fiduciary: {
            name: FIDUCIARY_NAME,
            address: options.address || 'Corporate Headquarters, Technology Corridor, India',
            dpoContact: DPO_EMAIL,
            grievanceOfficer: GRIEVANCE_EMAIL,
          },
          itemizedPurposes: options.itemizedPurposes || [
            { purpose: 'ACCOUNT_SERVICES', lawfulBasis: 'Contractual Performance', retentionPeriod: '3 Years' },
            { purpose: 'OTP_VERIFICATION', lawfulBasis: 'Technical Necessity', retentionPeriod: '24 Hours' },
            { purpose: 'MARKETING_OFFERS', lawfulBasis: 'Explicit Consent', retentionPeriod: '1 Year' }
          ]
        }
      });
    }

    if (path === '/audit-feed/logs') {
      return res.json({
        success: true,
        count: memoryLogs.length,
        logs: memoryLogs.slice(-50)
      });
    }

    if (path === '/audit-feed/consents') {
      return res.json({
        success: true,
        count: (options.consentsProvider ? options.consentsProvider() : []).length,
        consents: options.consentsProvider ? options.consentsProvider() : []
      });
    }

    if (path === '/audit-feed/inventory') {
      return res.json({
        success: true,
        inventory: options.inventory || [
          { field: 'email', purpose: 'ACCOUNT_SERVICES', classification: 'PII' },
          { field: 'mobile', purpose: 'OTP_VERIFICATION', classification: 'PII' }
        ]
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. AUTOMATIC ASYNC TELEMETRY EMISSION (Zero Controller Modifications)
    // ─────────────────────────────────────────────────────────────────────────
    // Intercept response finish
    res.on('finish', () => {
      // Ignore static assets and health checks
      if (path.startsWith('/static') || path.startsWith('/assets') || path === '/health' || path.startsWith('/audit-feed')) {
        return;
      }

      const eventType = inferEventType(req.method, path);
      const payload = { ...(req.body || {}), ...(req.query || {}) };

      // Record in memory audit log
      memoryLogs.push({
        timestamp: new Date().toISOString(),
        action: eventType,
        endpoint: path,
        status: res.statusCode
      });
      if (memoryLogs.length > 200) memoryLogs.shift();

      // Forward telemetry asynchronously to PrivGuard
      axios.post(`${PRIVGUARD_URL}/api/events`, {
        eventType,
        source: 'APPLICATION_MIDDLEWARE',
        service: SERVICE_NAME,
        endpoint: path,
        payload,
        timestamp: new Date().toISOString()
      }).catch(() => {}); // Fire and forget (silent failure protects client app)
    });

    next();
  };
}

module.exports = privguard;
