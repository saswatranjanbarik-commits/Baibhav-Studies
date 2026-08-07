const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/StoreSync.tsx');
let content = fs.readFileSync(file, 'utf8');

const injection = `
      // MIGRATION: Push existing local data to cloud on first load
      let needsCloudUpload = false;
      const localUploads: Record<string, any> = {};
      
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('dugu_')) {
          const localValue = window.localStorage.getItem(key);
          if (localValue) {
            try {
              const parsedLocal = JSON.parse(localValue);
              
              // Only push if local has data and cloud doesn't, OR if local has MORE items (arrays)
              // But to be safe, let's just trigger a transaction for every local key that has data
              // To avoid spamming, we can just merge all local arrays with cloud arrays here locally,
              // then do a single setDoc with {merge: true}.
              const cloudValue = data[key];
              
              if (cloudValue === undefined) {
                localUploads[key] = parsedLocal;
                needsCloudUpload = true;
                data[key] = parsedLocal; // Use it locally immediately
              } else if (Array.isArray(parsedLocal) && Array.isArray(cloudValue)) {
                // If both are arrays, we can do a smart merge right here
                const isObjectArray = (parsedLocal.length > 0 && typeof parsedValue === 'undefined' ? typeof parsedLocal[0] === 'object' && parsedLocal[0] !== null && 'id' in parsedLocal[0] : false) || 
                                      (cloudValue.length > 0 && typeof cloudValue[0] === 'object' && cloudValue[0] !== null && 'id' in cloudValue[0]);
                
                if (isObjectArray) {
                  const cloudMap = new Map();
                  cloudValue.forEach((item: any) => { if (item && item.id) cloudMap.set(item.id, item); });
                  
                  let merged = false;
                  parsedLocal.forEach((item: any) => {
                    if (item && item.id && !cloudMap.has(item.id)) {
                      cloudMap.set(item.id, item);
                      merged = true;
                    }
                  });
                  
                  if (merged) {
                    localUploads[key] = Array.from(cloudMap.values());
                    needsCloudUpload = true;
                    data[key] = localUploads[key];
                  }
                }
              }
            } catch(e) {}
          }
        }
      }
      
      if (needsCloudUpload) {
        console.log("Uploading local data to cloud...", Object.keys(localUploads));
        setDoc(storeRef, localUploads, { merge: true }).catch(console.error);
      }
`;

content = content.replace(
  /\/\/ Populate local storage with cloud data/,
  injection.trim() + '\n\n      // Populate local storage with cloud data'
);

fs.writeFileSync(file, content);
console.log("Patched StoreSync for upload");
