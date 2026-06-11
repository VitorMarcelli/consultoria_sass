const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src/app/(dashboard)/escritorios/[id]');

function replaceColors(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceColors(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      
      // Replace indigo with teal
      content = content.replace(/indigo/g, 'teal');
      
      // Replace purple-500 to-teal-600 with teal-500 to-teal-700
      content = content.replace(/purple/g, 'teal');
      
      // Replace blue-600 with teal-700
      content = content.replace(/blue/g, 'teal');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated colors in ${fullPath}`);
      }
    }
  }
}

replaceColors(targetDir);
