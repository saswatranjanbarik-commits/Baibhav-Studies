const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/StoreSync.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/let parsedValue = value;/, 'let parsedValue: any = value;');
content = content.replace(/let mergedValue = parsedValue;/, 'let mergedValue: any = parsedValue;');
content = content.replace(/existingValue\.forEach\(/g, 'existingValue.forEach((item: any) =>');
content = content.replace(/parsedValue\.forEach\(/g, 'parsedValue.forEach((item: any) =>');

fs.writeFileSync(file, content);
