const fs = require('fs');
const pages = [
  'Dashboard.jsx',
  'Violations.jsx',
  'LiveMonitor.jsx',
  'Policies.jsx',
  'AuditTrail.jsx'
];
pages.forEach(page => {
  const path = 'src/pages/' + page;
  let content = fs.readFileSync(path, 'utf8');
  
  // Replace sidebar structure
  content = content.replace(
    /<div className="sidebar-logo">[\s\S]*?PRIVGUARD[\s\S]*?<\/div>/,
    `<div className="sidebar-logo ds-flex-between">
          PRIVGUARD
          <label htmlFor="mobile-menu-toggle" className="mobile-menu-label" style={{ cursor: 'pointer', fontSize: '20px' }}>≡</label>
        </div>
        <input type="checkbox" id="mobile-menu-toggle" />`
  );
  
  content = content.replace(
    /<div style={{ flex: 1, overflowY: 'auto', paddingTop: '16px' }}>/,
    `<div className="sidebar-nav-container" style={{ flex: 1, overflowY: 'auto', paddingTop: '16px' }}>`
  );
  
  content = content.replace(
    /<div style={{ padding: '16px', borderTop: '1px solid var\(--border-medium\)', background: 'var\(--bg-primary\)' }}>/,
    `<div className="sidebar-bottom" style={{ padding: '16px', borderTop: '1px solid var(--border-medium)', background: 'var(--bg-primary)' }}>`
  );
  
  // Also remove height: '100vh' from sidebar aside style if any, to allow it to be auto on mobile
  content = content.replace(
    /<aside className="ds-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>/,
    `<aside className="ds-sidebar" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>`
  );
  
  fs.writeFileSync(path, content);
});
console.log('Sidebar updated');
