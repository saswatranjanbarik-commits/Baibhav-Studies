const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/StoreSync.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldSetItem = `
    // Intercept setItem to also write to the cloud
    window.localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      
      if (!currentUser) return; // Only sync if logged in
      
      try {
        let parsedValue = value;
        try {
          parsedValue = JSON.parse(value);
        } catch(e) {}
        
        setDoc(storeRef, { [key]: parsedValue }, { merge: true })
          .catch(e => console.error("Cloud sync error for setItem:", e));
      } catch (e) {
        console.error(e);
      }
    };
`;

content = content.replace(
  /\/\/ Intercept setItem to also write to the cloud[\s\S]*?catch \(e\) \{\n        console\.error\(e\);\n      \}\n    \};/,
  oldSetItem.trim()
);

fs.writeFileSync(file, content);
console.log("Reverted StoreSync interceptor to setDoc");
