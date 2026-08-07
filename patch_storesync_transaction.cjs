const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/StoreSync.tsx');
let content = fs.readFileSync(file, 'utf8');

// We need to add runTransaction to the imports
if (!content.includes('runTransaction')) {
  content = content.replace(/import \{ doc, getDoc, setDoc, onSnapshot \} from 'firebase\/firestore';/, 
    "import { doc, getDoc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';");
}

const newSetItem = `
    // Intercept setItem to also write to the cloud
    window.localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      
      if (!currentUser) return; // Only sync if logged in
      
      try {
        let parsedValue = value;
        try {
          parsedValue = JSON.parse(value);
        } catch(e) {}
        
        // Use a transaction to safely merge arrays and objects
        runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(storeRef);
          const currentData = docSnap.exists() ? docSnap.data() : {};
          const existingValue = currentData[key];
          
          let mergedValue = parsedValue;
          
          if (existingValue !== undefined) {
            if (Array.isArray(existingValue) && Array.isArray(parsedValue)) {
              const isObjectArray = (parsedValue.length > 0 && typeof parsedValue[0] === 'object' && parsedValue[0] !== null && 'id' in parsedValue[0]) ||
                                    (existingValue.length > 0 && typeof existingValue[0] === 'object' && existingValue[0] !== null && 'id' in existingValue[0]);
              
              if (isObjectArray) {
                if (parsedValue.length < existingValue.length) {
                  // Assume deletion, trust the new array
                  mergedValue = parsedValue;
                } else {
                  const map = new Map();
                  existingValue.forEach(item => {
                    if (item && item.id) map.set(item.id, item);
                  });
                  parsedValue.forEach(item => {
                    if (item && item.id) map.set(item.id, item);
                  });
                  mergedValue = Array.from(map.values());
                }
              } else {
                mergedValue = Array.from(new Set([...existingValue, ...parsedValue]));
              }
            } else if (typeof existingValue === 'object' && existingValue !== null && typeof parsedValue === 'object' && parsedValue !== null) {
              mergedValue = { ...existingValue, ...parsedValue };
            }
          }
          
          transaction.set(storeRef, { [key]: mergedValue }, { merge: true });
        }).catch(e => console.error("Cloud sync transaction error for setItem:", e));
      } catch (e) {
        console.error(e);
      }
    };
`;

content = content.replace(
  /\/\/ Intercept setItem to also write to the cloud[\s\S]*?catch \(e\) \{\n        console\.error\(e\);\n      \}\n    \};/,
  newSetItem.trim()
);

fs.writeFileSync(file, content);
console.log("Patched StoreSync with transaction merge");
