const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/StoreSync.tsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("window.addEventListener('storage'")) {
  const injection = `
    // Also listen for cross-tab local storage changes
    const handleStorage = (e) => {
      if (e.key && e.key.startsWith('dugu_')) {
        window.dispatchEvent(new Event('cloud_sync_update'));
      }
    };
    window.addEventListener('storage', handleStorage);
`;
  const returnInjection = `
      window.removeEventListener('storage', handleStorage);
`;
  content = content.replace(
    /window\.localStorage\.setItem = function\(key, value\) \{/, 
    injection + '\n    window.localStorage.setItem = function(key, value) {'
  );
  content = content.replace(
    /window\.localStorage\.setItem = originalSetItem;/,
    returnInjection + '\n      window.localStorage.setItem = originalSetItem;'
  );
  fs.writeFileSync(file, content);
  console.log('Patched StoreSync.tsx');
} else {
  console.log('StoreSync.tsx already patched');
}
