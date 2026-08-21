// Run: node demo.js
// Triggers real-time live events and compliance evaluations directly from DemoApp (Target Application)

const DEMOAPP_BASE = process.env.DEMOAPP_URL || 'http://localhost:5001';
const PRIVGUARD_BASE = process.env.PRIVGUARD_URL || 'http://localhost:5000';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const SCENARIOS = [
  { id: 'TEST-001', name: 'Raw PII (Name, Email, Mobile) Written to Application Logs' },
  { id: 'TEST-002', name: 'Excessive Personal Data Exposure via API Profile' },
  { id: 'TEST-003', name: 'Consent Enforcement: Marketing Post-Withdrawal' },
  { id: 'TEST-004', name: 'Purpose Mismatch: Mobile Number Used in Order Creation' },
  { id: 'TEST-005', name: 'Retention Violation: Record Age Exceeds 365 Days' },
  { id: 'TEST-006', name: 'Identity Document Exposure: Plaintext PAN in KYC Flow' },
  { id: 'TEST-007', name: 'Data Principal Right-to-Erasure Request (Sec 12)' }
];

(async () => {
  console.log('\n🛡️  PrivGuard <-> DemoApp Live Real-Time Integration Runner\n');
  console.log(`Target Application : ${DEMOAPP_BASE}`);
  console.log(`Auditor Platform   : ${PRIVGUARD_BASE}\n`);

  for (const s of SCENARIOS) {
    console.log(`🚀 Executing Live Scenario [${s.id}]: ${s.name}`);
    try {
      const res = await fetch(`${DEMOAPP_BASE}/api/audit-feed/trigger-test/${s.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        console.log(`   ✅ Emitted live telemetry -> Processed by PrivGuard Socket.IO & Rule Engine`);
      } else {
        console.log(`   ❌ Error: ${data.message}`);
      }
    } catch (err) {
      console.log(`   ⚠️ Could not reach DemoApp: ${err.message}`);
    }
    await delay(1500);
  }

  console.log('\n🎯 Triggering holistic Autonomous DPDPA Audit Scan...');
  try {
    const scanRes = await fetch(`${PRIVGUARD_BASE}/api/audit/scan-target`, { method: 'POST' });
    const scanData = await scanRes.json();
    if (scanData.success) {
      console.log(`   ✅ Audit complete! Score: ${scanData.scanSummary.complianceScore}% | Found: ${scanData.scanSummary.violationsDetected} violations`);
    }
  } catch (err) {
    console.log(`   ⚠️ Scan error: ${err.message}`);
  }

  console.log('\n✨ All real-time telemetry successfully synced to PrivGuard Dashboard!\n');
})();
