const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyD4hjE7UhFfzpBh63XzPwRY9gOhCQfUn8w",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "dugu-edutrack",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const storeRef = doc(db, 'appStore', 'global_store');
  const snap = await getDoc(storeRef);
  let data = snap.exists() ? snap.data() : {};
  
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        console.log(`${key}: array of type ${typeof value[0]}, has id: ${value[0] && 'id' in value[0]}`);
      } else {
        console.log(`${key}: empty array`);
      }
    } else {
      console.log(`${key}: not an array`);
    }
  }
}
run().catch(console.error);
