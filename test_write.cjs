const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

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
  
  let logs = data.dugu_daily_logs || [];
  console.log("Current logs:", logs.length);
  
  // Add a fake log
  logs.push({
    id: "fake_log_" + Date.now(),
    date: new Date().toISOString().split('T')[0],
    logType: 'Self Study',
    category: 'Rock',
    status: 'In Progress',
    subjectName: 'Test Subject ' + Date.now()
  });
  
  await setDoc(storeRef, { dugu_daily_logs: logs }, { merge: true });
  console.log("Added a fake log. New length:", logs.length);
}
run().catch(console.error);
