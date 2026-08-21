const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('src/pages').filter(f => f.endsWith('.jsx')).map(f => path.join('src/pages', f));

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix PRIVGUARD in logo if it wasn't caught
    content = content.replace(/PRIVGUARD/g, 'PrivGuard');
    
    // Remove System Status
    const sysStatusRegex = /<div className="ds-flex ds-items-center ds-gap-sm ds-mb-sm ds-text-small ds-font-medium".*?>[\s\S]*?System Status: Active[\s\S]*?<\/div>\s*/g;
    content = content.replace(sysStatusRegex, '');
    
    fs.writeFileSync(file, content);
  }
});
console.log('Fixed sidebars');
