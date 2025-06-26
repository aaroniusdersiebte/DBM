const fs = require('fs');
const path = require('path');

console.log('Copying electron.js to build directory...');

const electronPath = path.join(__dirname, 'electron.js');
const buildPath = path.join(__dirname, 'build', 'electron.js');

try {
  // Ensure build directory exists
  const buildDir = path.join(__dirname, 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // Copy electron.js
  fs.copyFileSync(electronPath, buildPath);
  console.log('✅ electron.js successfully copied to build directory');

  // Also copy services directory
  const servicesSourcePath = path.join(__dirname, 'src', 'services');
  const servicesDestPath = path.join(__dirname, 'build', 'src', 'services');
  
  if (fs.existsSync(servicesSourcePath)) {
    // Create destination directory
    fs.mkdirSync(path.dirname(servicesDestPath), { recursive: true });
    fs.mkdirSync(servicesDestPath, { recursive: true });
    
    // Copy services recursively
    copyDir(servicesSourcePath, servicesDestPath);
    console.log('✅ Services directory copied to build');
  }

} catch (error) {
  console.error('❌ Error copying files:', error);
  process.exit(1);
}

function copyDir(src, dest) {
  const items = fs.readdirSync(src);
  
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.statSync(srcPath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}
