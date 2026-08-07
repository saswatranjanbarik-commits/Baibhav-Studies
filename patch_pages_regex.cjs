const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  let content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  
  // We want to wrap the contents of the useEffect that has localStorage.getItem 
  // and an empty dependency array.
  // This is a bit tricky, but we can look for:
  // useEffect(() => {
  //   const savedSyllabus = localStorage.getItem(...
  //   ...
  // }, []);
  
  const effectRegex = /useEffect\(\(\) => \{([\s\S]*?localStorage\.getItem[\s\S]*?)\}, \[\]\);/;
  const match = content.match(effectRegex);
  
  if (match && !match[0].includes('cloud_sync_update')) {
    const body = match[1];
    const newBody = `\n    const load = () => {${body}    };\n    load();\n    window.addEventListener('cloud_sync_update', load);\n    return () => window.removeEventListener('cloud_sync_update', load);\n  `;
    const newEffect = `useEffect(() => {${newBody}}, []);`;
    content = content.replace(match[0], newEffect);
    fs.writeFileSync(path.join(pagesDir, file), content);
    console.log('Patched', file);
  } else if (file === 'Dashboard.tsx') {
    // Dashboard might have React.useEffect(() => { ... }, []);
    const dashEffectRegex = /React\.useEffect\(\(\) => \{([\s\S]*?localStorage\.getItem[\s\S]*?)\}, \[\]\);/;
    const dashMatch = content.match(dashEffectRegex);
    if (dashMatch && !dashMatch[0].includes('cloud_sync_update')) {
      const body = dashMatch[1];
      const newBody = `\n    const load = () => {${body}    };\n    load();\n    window.addEventListener('cloud_sync_update', load);\n    return () => window.removeEventListener('cloud_sync_update', load);\n  `;
      const newEffect = `React.useEffect(() => {${newBody}}, []);`;
      content = content.replace(dashMatch[0], newEffect);
      fs.writeFileSync(path.join(pagesDir, file), content);
      console.log('Patched', file);
    }
  }
}
