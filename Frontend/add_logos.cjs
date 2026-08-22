const fs = require('fs');
const path = require('path');

const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add import if it doesn't exist
  if (!content.includes('import Logo from "../components/Logo";')) {
    // Find the last import
    const importRegex = /import\s+.*?;/g;
    let match;
    let lastIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex > 0) {
      content = content.slice(0, lastIndex) + '\nimport Logo from "../components/Logo";' + content.slice(lastIndex);
    }
  }

  // 2. Replace the old sidebar-logo with the new one
  // The old ones look like:
  // <div className="sidebar-logo ds-flex-between">
  //   PrivGuard
  //   <label ...
  // Or:
  // <div className="sidebar-logo ds-flex-between">
  //   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
  //     <Logo size={22} />
  //     PrivGuard
  //   </div>
  //   <label
  
  if (!content.includes('<Logo size={22} />')) {
    content = content.replace(
      /<div className="sidebar-logo ds-flex-between">\s*PrivGuard\s*<label/g,
      `<div className="sidebar-logo ds-flex-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo size={22} />
            PrivGuard
          </div>
          <label`
    );
    
    // Some might just have `className="sidebar-logo"` without `ds-flex-between` if they don't have the mobile toggle (but all do now)
    content = content.replace(
      /<div className="sidebar-logo">\s*PrivGuard/g,
      `<div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo size={22} />
            PrivGuard
          </div>`
    );
  }

  fs.writeFileSync(filePath, content);
});

console.log('Logos added to sidebars');
