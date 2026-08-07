import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyD4hjE7UhFfzpBh63XzPwRY9gOhCQfUn8w",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "dugu-edutrack",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = collection(db, 'users');
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}
run();
