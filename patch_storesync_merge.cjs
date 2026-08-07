const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/StoreSync.tsx');
let content = fs.readFileSync(file, 'utf8');

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
        
        // Use a transaction to prevent race conditions when appending to arrays
        import('firebase/firestore').then(({ runTransaction }) => {
          runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(storeRef);
            let newValue = parsedValue;
            
            if (docSnap.exists()) {
              const currentData = docSnap.data();
              const existingValue = currentData[key];
              
              if (Array.isArray(existingValue) && Array.isArray(parsedValue)) {
                // Determine if it's an array of objects with 'id'
                const hasId = parsedValue.length > 0 && parsedValue[0] && typeof parsedValue[0] === 'object' && 'id' in parsedValue[0];
                if (hasId) {
                  // Smart merge based on 'id'
                  // We prioritize parsedValue (local changes) but keep existingValue items that aren't in parsedValue
                  // Wait, if we keep existing items that aren't in parsedValue, DELETES won't work!
                  // Let's check if the array size DECREASED. If it decreased, it might be a delete.
                  // This is tricky. A simple heuristic: if it's DailyLogs or similar, users mostly add.
                  // But to be safe, if the new array is smaller than the old array, we assume a deletion occurred and we don't merge, we just overwrite.
                  // If the new array is larger or equal, we merge to prevent lost additions.
                  if (parsedValue.length >= existingValue.length) {
                    const map = new Map();
                    existingValue.forEach(item => {
                      if (item && item.id) map.set(item.id, item);
                    });
                    parsedValue.forEach(item => {
                      if (item && item.id) map.set(item.id, item);
                    });
                    newValue = Array.from(map.values());
                  }
                }
              }
            }
            transaction.set(storeRef, { [key]: newValue }, { merge: true });
          }).catch(e => console.error("Cloud sync transaction error for setItem:", e));
        });
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
console.log("Patched StoreSync with smart merge");
