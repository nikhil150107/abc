const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('src/pages').filter(f => f.endsWith('.jsx')).map(f => path.join('src/pages', f));

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/<div className="sidebar-nav-item"( tabIndex=\{0\})?>Settings<\/div>/g, '<div className="sidebar-nav-item" onClick={() => navigate(\'/settings\')} tabIndex={0} onKeyDown={(e) => { if(e.key===\'Enter\') navigate(\'/settings\'); }}>Settings</div>');
    fs.writeFileSync(file, content);
  }
});
console.log('Fixed Settings nav links');
