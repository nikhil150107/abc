/**
 * PrivGuard Zero-Touch DPDPA Compliance Middleware / SDK
 *
 * 100% Dependency-Free (No npm install required!).
 * Works out-of-the-box in ANY Node.js / Express project.
 */

function privguard(options = {}) {
  const PRIVGUARD_URL = options.privguardUrl || process.env.PRIVGUARD_URL || 'http://localhost:5000';
  const SERVICE_NAME = options.serviceName || process.env.TARGET_APP_NAME || 'messenger-app';
  const FIDUCIARY_NAME = options.fiduciaryName || 'Messenger Technologies Pvt. Ltd.';
  const DPO_EMAIL = options.dpoEmail || 'dpo@messenger.local';
  const GRIEVANCE_EMAIL = options.grievanceEmail || 'grievance@messenger.local';

  // Circular in-memory audit log buffer for DPDPA statutory scans
  const memoryLogs = [];

  // Helper to infer Event Type from HTTP Method & Route Path
  function inferEventType(method, path) {
    const p = path.toLowerCase();
    if (p.includes('login') || p.includes('auth')) return 'USER_LOGIN';
    if (p.includes('register') || p.includes('signup')) return 'USER_REGISTERED';
    if (p.includes('profile') || p.includes('user')) return method === 'GET' ? 'USER_PROFILE_ACCESSED' : 'USER_PROFILE_UPDATED';
    if (p.includes('order') || p.includes('checkout') || p.includes('cart')) return 'ORDER_CREATED';
    if (p.includes('consent')) return method === 'DELETE' ? 'CONSENT_WITHDRAWN' : 'CONSENT_GRANTED';
    if (p.includes('kyc') || p.includes('document')) return 'KYC_DOC_UPLOADED';
    if (p.includes('delete') || p.includes('erasure')) return 'DATA_DELETION_REQUESTED';
    if (p.includes('message') || p.includes('chat')) return 'MESSAGE_DISPATCHED';
    return `${method}_${p.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  }

  // Safe async HTTP dispatcher (zero dependencies using native fetch / http)
  function sendToPrivGuard(data) {
    try {
      if (typeof fetch === 'function') {
        fetch(`${PRIVGUARD_URL}/api/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).catch(() => {});
      } else {
        const http = PRIVGUARD_URL.startsWith('https') ? require('https') : require('http');
        const url = new URL(`${PRIVGUARD_URL}/api/events`);
        const payload = JSON.stringify(data);
        const req = http.request({
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        });
        req.on('error', () => {});
        req.write(payload);
        req.end();
      }
    } catch (_) {}
  }

  function getPolicyObject() {
    return {
      title: `${FIDUCIARY_NAME} Digital Privacy Notice`,
      effectiveDate: options.effectiveDate || '2025-01-01',
      fiduciary: {
        name: FIDUCIARY_NAME,
        address: options.address || 'Corporate Headquarters, Technology Corridor, India',
        dpoContact: DPO_EMAIL,
        grievanceOfficer: GRIEVANCE_EMAIL,
      },
      itemizedPurposes: options.itemizedPurposes || [
        { purpose: 'ACCOUNT_SERVICES', lawfulBasis: 'Contractual Performance', personalDataCollected: ['Name', 'Email'], retentionPeriod: '3 Years' },
        { purpose: 'OTP_VERIFICATION', lawfulBasis: 'Technical Necessity', personalDataCollected: ['Mobile Number'], retentionPeriod: '24 Hours' },
        { purpose: 'COMMUNICATION_SERVICES', lawfulBasis: 'Direct Consent', personalDataCollected: ['Messages', 'Chat Logs'], retentionPeriod: '1 Year' }
      ],
      principalRights: options.principalRights || {
        rightToAccess: 'Supported via user profile API',
        rightToCorrection: 'Supported via account settings',
        rightToErasure: 'Supported via privacy grievance channel',
        rightToWithdrawConsent: 'Supported via consent management preferences'
      },
      version: options.policyVersion || '2025.1'
    };
  }

  function getInventoryObject() {
    return options.inventory || {
      application: SERVICE_NAME,
      dataFields: [
        { field: 'name', purpose: 'ACCOUNT_SERVICES', classification: 'PII' },
        { field: 'email', purpose: 'ACCOUNT_SERVICES', classification: 'PII' },
        { field: 'mobile', purpose: 'OTP_VERIFICATION', classification: 'PII' }
      ],
      consentPurposes: ['ACCOUNT_SERVICES', 'COMMUNICATION_SERVICES']
    };
  }

  // Express Middleware Dispatcher
  return function privguardMiddleware(req, res, next) {
    const rawPath = req.path || req.url || '';
    // Normalize path by stripping query params and standardizing audit-feed subpath
    const path = rawPath.split('?')[0];
    const isAuditFeed = path.includes('/audit-feed');

    // ─────────────────────────────────────────────────────────────────────────
    // 1. AUTO-MOUNTED DPDPA STATUTORY AUDIT FEED ENDPOINTS (Zero Code Needed)
    // ─────────────────────────────────────────────────────────────────────────
    if (isAuditFeed) {
      if (path.endsWith('/audit-feed/evidence')) {
        const policy = getPolicyObject();
        const inventory = getInventoryObject();
        const consents = options.consentsProvider ? options.consentsProvider() : [];
        const logs = memoryLogs.slice(-100);
        const events = memoryLogs.map((l, idx) => ({
          eventId: `evt-auto-${idx}-${Date.now()}`,
          eventType: l.action,
          endpoint: l.endpoint,
          timestamp: l.timestamp,
          source: 'APPLICATION_MIDDLEWARE'
        }));

        return res.json({
          success: true,
          extractedAt: new Date().toISOString(),
          application: {
            name: SERVICE_NAME,
            environment: options.environment || 'Production / Auditor Target',
            version: options.version || '1.0.0',
            fiduciaryType: 'Data Fiduciary',
            serverUrl: `http://${req.headers.host || 'localhost'}`
          },
          evidence: {
            inventory,
            policy,
            events,
            logs,
            consents,
            consentHistory: [],
            users: [],
            deletionRequests: [],
            databaseSchema: options.databaseSchema || {
              tables: ['users', 'audit_logs'],
              piiColumnsDiscovered: [
                { table: 'users', columns: ['name', 'email', 'mob_no'] }
              ]
            }
          }
        });
      }

      if (path.endsWith('/audit-feed/policy')) {
        return res.json({
          success: true,
          policy: getPolicyObject()
        });
      }

      if (path.endsWith('/audit-feed/logs')) {
        return res.json({
          success: true,
          count: memoryLogs.length,
          logs: memoryLogs.slice(-50)
        });
      }

      if (path.endsWith('/audit-feed/consents')) {
        const consents = options.consentsProvider ? options.consentsProvider() : [];
        return res.json({
          success: true,
          count: consents.length,
          consents
        });
      }

      if (path.endsWith('/audit-feed/inventory')) {
        return res.json({
          success: true,
          inventory: getInventoryObject()
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. AUTOMATIC ASYNC TELEMETRY EMISSION (Zero Controller Modifications)
    // ─────────────────────────────────────────────────────────────────────────
    res.on('finish', () => {
      if (path.startsWith('/static') || path.startsWith('/assets') || path === '/health' || path.includes('/audit-feed')) {
        return;
      }

      const eventType = inferEventType(req.method, path);
      const payload = { ...(req.body || {}), ...(req.query || {}) };

      // Record in local memory audit log
      memoryLogs.push({
        timestamp: new Date().toISOString(),
        action: eventType,
        endpoint: path,
        status: res.statusCode,
        message: `${req.method} ${path} completed with status ${res.statusCode}`
      });
      if (memoryLogs.length > 200) memoryLogs.shift();

      // Forward telemetry to PrivGuard in background
      sendToPrivGuard({
        eventType,
        source: 'APPLICATION_MIDDLEWARE',
        service: SERVICE_NAME,
        endpoint: path,
        payload,
        timestamp: new Date().toISOString()
      });
    });

    next();
  };
}

module.exports = privguard;
