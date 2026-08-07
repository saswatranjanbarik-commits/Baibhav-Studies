const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyD4hjE7UhFfzpBh63XzPwRY9gOhCQfUn8w",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "dugu-edutrack",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const docRef = doc(db, 'appStore', 'global_store');
  await setDoc(docRef, { test_key: "hello world" }, { merge: true });
  console.log("Updated test_key");
}
run().catch(console.error);
