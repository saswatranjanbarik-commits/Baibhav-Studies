const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyD4hjE7UhFfzpBh63XzPwRY9gOhCQfUn8w",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "dugu-edutrack",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const docRef = doc(db, 'appStore', 'global_store');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    console.log("Keys in global_store:", Object.keys(data));
    console.log("Size approx:", JSON.stringify(data).length, "bytes");
  } else {
    console.log("global_store does not exist");
  }
}
run().catch(console.error);
