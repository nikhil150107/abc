/**
 * PrivGuard Multi-Client Integration Verification Suite
 * Tests end-to-end telemetry, audit-feed extraction, and DPDPA compliance evaluation
 * for both Messenger (Port 5002) and DemoApp (Port 5001) with PrivGuard (Port 5000).
 */

const PRIVGUARD_URL = process.env.PRIVGUARD_URL || 'http://localhost:5000';
const DEMOAPP_URL   = process.env.DEMOAPP_URL   || 'http://localhost:5001';
const MESSENGER_URL = process.env.MESSENGER_URL || 'http://localhost:5002';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('🛡️  PRIVGUARD MULTI-CLIENT INTEGRATION TEST SUITE');
  console.log('===============================================================\n');

  console.log(`[Configuration]`);
  console.log(`  PrivGuard Server : ${PRIVGUARD_URL}`);
  console.log(`  DemoApp Client   : ${DEMOAPP_URL}`);
  console.log(`  Messenger Client : ${MESSENGER_URL}\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: PrivGuard Core Health & Policies
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📦 TEST 1: PrivGuard Core Health & Policies');
  try {
    const policiesRes = await fetchJSON(`${PRIVGUARD_URL}/api/policies`);
    assert(policiesRes.ok, `PrivGuard is online and returned status ${policiesRes.status}`);
    assert(Array.isArray(policiesRes.data?.data) && policiesRes.data.data.length >= 6, `Policies seeded: ${policiesRes.data?.data?.length || 0} active statutory policies`);
  } catch (err) {
    assert(false, `PrivGuard unreachable at ${PRIVGUARD_URL}: ${err.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Messenger Event Streaming & PII Telemetry
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📨 TEST 2: Messenger Telemetry Ingestion to PrivGuard');
  try {
    const messengerEventPayload = {
      eventType: 'USER_REGISTERED',
      source: 'APPLICATION_MIDDLEWARE',
      service: 'messenger-backend',
      endpoint: '/api/auth/register',
      payload: {
        name: 'Pankaj Shinde',
        email: 'user.test@messenger.local',
        mob_no: '9876543210'
      },
      timestamp: new Date().toISOString()
    };

    const emitRes = await fetchJSON(`${PRIVGUARD_URL}/api/events`, {
      method: 'POST',
      body: JSON.stringify(messengerEventPayload)
    });

    assert(emitRes.ok && emitRes.data.success, 'PrivGuard successfully ingested event from Messenger');
    assert(emitRes.data.data?.service === 'messenger-backend', `Event tagged with service: ${emitRes.data.data?.service}`);
  } catch (err) {
    assert(false, `Messenger telemetry test failed: ${err.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: DemoApp Event Streaming & Policy Violation Evaluation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📱 TEST 3: DemoApp Telemetry Ingestion & Violation Engine');
  try {
    const demoAppEventPayload = {
      eventType: 'USER_PROFILE_ACCESSED',
      source: 'DEMOAPP_API',
      service: 'demoapp-core',
      endpoint: '/api/users/1',
      payload: {
        userId: 1,
        dataFields: ['fullName', 'email', 'mobileNumber', 'pan'],
        purpose: 'ACCOUNT_SERVICE'
      },
      timestamp: new Date().toISOString()
    };

    const emitRes = await fetchJSON(`${PRIVGUARD_URL}/api/events`, {
      method: 'POST',
      body: JSON.stringify(demoAppEventPayload)
    });

    assert(emitRes.ok && emitRes.data.success, 'PrivGuard successfully ingested event from DemoApp');
    assert(emitRes.data.data?.service === 'demoapp-core', `Event tagged with service: ${emitRes.data.data?.service}`);
  } catch (err) {
    assert(false, `DemoApp telemetry test failed: ${err.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Messenger DPDPA Audit Feed Endpoints (SDK Middleware)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔍 TEST 4: Messenger Audit Feed Endpoints Verification');
  try {
    const evidenceRes = await fetchJSON(`${MESSENGER_URL}/api/audit-feed/evidence`);
    if (evidenceRes.ok) {
      assert(true, 'Messenger /api/audit-feed/evidence is responding with HTTP 200');
      assert(evidenceRes.data.application?.name === 'messenger-backend', `Application declared: ${evidenceRes.data.application?.name}`);
      assert(evidenceRes.data.evidence?.policy?.fiduciary?.name === 'Messenger Technologies Pvt. Ltd.', `Fiduciary declared: ${evidenceRes.data.evidence?.policy?.fiduciary?.name}`);
      assert(Array.isArray(evidenceRes.data.evidence?.policy?.itemizedPurposes), 'Statutory itemized purposes present in policy');
    } else {
      assert(false, `Messenger evidence endpoint failed with status ${evidenceRes.status}: ${JSON.stringify(evidenceRes.data)}`);
    }

    const policyRes = await fetchJSON(`${MESSENGER_URL}/audit-feed/policy`);
    assert(policyRes.ok && policyRes.data.policy?.title?.includes('Messenger'), 'Messenger /audit-feed/policy endpoint returns valid privacy notice');
  } catch (err) {
    assert(false, `Messenger audit feed endpoints unreachable at ${MESSENGER_URL}: ${err.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: DemoApp DPDPA Audit Feed Endpoints
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🔍 TEST 5: DemoApp Audit Feed Endpoints Verification');
  try {
    const demoEvidenceRes = await fetchJSON(`${DEMOAPP_URL}/api/audit-feed/evidence`);
    if (demoEvidenceRes.ok) {
      assert(true, 'DemoApp /api/audit-feed/evidence is responding with HTTP 200');
      assert(demoEvidenceRes.data.application?.name === 'DemoApp', `Application declared: ${demoEvidenceRes.data.application?.name}`);
      assert(Array.isArray(demoEvidenceRes.data.evidence?.logs), `Application logs package extracted (${demoEvidenceRes.data.evidence?.logs?.length || 0} logs)`);
    } else {
      assert(false, `DemoApp evidence endpoint returned status ${demoEvidenceRes.status}`);
    }
  } catch (err) {
    assert(false, `DemoApp audit feed unreachable at ${DEMOAPP_URL}: ${err.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Autonomous DPDPA Audit Scan on Messenger (Port 5002)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🚀 TEST 6: Autonomous Compliance Scan on Messenger');
  try {
    const scanMessengerRes = await fetchJSON(`${PRIVGUARD_URL}/api/audit/scan-target`, {
      method: 'POST',
      body: JSON.stringify({ targetUrl: MESSENGER_URL })
    });

    assert(scanMessengerRes.ok && scanMessengerRes.data.success, 'PrivGuard successfully performed autonomous audit scan on Messenger');
    assert(scanMessengerRes.data.scanSummary?.fiduciary === 'Messenger Technologies Pvt. Ltd.', `Scan correctly identified fiduciary: ${scanMessengerRes.data.scanSummary?.fiduciary}`);
    assert(typeof scanMessengerRes.data.scanSummary?.complianceScore === 'number', `Computed Statutory Compliance Score: ${scanMessengerRes.data.scanSummary?.complianceScore}%`);
  } catch (err) {
    assert(false, `Autonomous audit scan on Messenger failed: ${err.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Autonomous DPDPA Audit Scan on DemoApp (Port 5001)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n🚀 TEST 7: Autonomous Compliance Scan on DemoApp');
  try {
    const scanDemoRes = await fetchJSON(`${PRIVGUARD_URL}/api/audit/scan-target`, {
      method: 'POST',
      body: JSON.stringify({ targetUrl: DEMOAPP_URL })
    });

    assert(scanDemoRes.ok && scanDemoRes.data.success, 'PrivGuard successfully performed autonomous audit scan on DemoApp');
    assert(typeof scanDemoRes.data.scanSummary?.complianceScore === 'number', `Computed Statutory Compliance Score: ${scanDemoRes.data.scanSummary?.complianceScore}%`);
  } catch (err) {
    assert(false, `Autonomous audit scan on DemoApp failed: ${err.message}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Export Comprehensive DPDPA Audit Report
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n📄 TEST 8: Export DPDPA Audit Report');
  try {
    const reportRes = await fetchJSON(`${PRIVGUARD_URL}/api/audit/report`);
    assert(reportRes.ok && reportRes.data.success, 'PrivGuard generated comprehensive DPDPA Audit Report');
    assert(reportRes.data.report?.targetApplication, `Report target: ${reportRes.data.report?.targetApplication}`);
    assert(reportRes.data.report?.executiveSummary?.complianceHealthScore, `Health score: ${reportRes.data.report?.executiveSummary?.complianceHealthScore}`);
  } catch (err) {
    assert(false, `Report export failed: ${err.message}`);
  }

  console.log('\n===============================================================');
  console.log(`🏁 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
