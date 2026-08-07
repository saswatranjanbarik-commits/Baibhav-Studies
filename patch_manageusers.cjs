const fs = require('fs');
let content = fs.readFileSync('src/pages/ManageUsers.tsx', 'utf-8');

const targetStr = `        await deleteDoc(doc(db, 'users', user._docId || user.email));`;
const replacementStr = `        await deleteDoc(doc(db, 'users', user._docId || user.email));
        alert("User successfully deleted from the app.");`;

if (!content.includes('User successfully deleted from the app.')) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync('src/pages/ManageUsers.tsx', content);
}
