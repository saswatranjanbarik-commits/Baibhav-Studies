const { Project, SyntaxKind } = require('ts-morph');

const project = new Project();
project.addSourceFilesAtPaths('src/pages/**/*.tsx');

for (const sourceFile of project.getSourceFiles()) {
  let changed = false;
  
  const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  const bodiesToReplace = [];
  
  for (const call of calls) {
    const expr = call.getExpression();
    if (expr.getText() === 'useEffect' || expr.getText() === 'React.useEffect') {
      const args = call.getArguments();
      if (args.length >= 1) {
        const arrow = args[0];
        if (arrow.getKind() === SyntaxKind.ArrowFunction) {
          const body = arrow.getBody();
          if (body.getKind() === SyntaxKind.Block) {
            const text = body.getText();
            // Wrap if it reads from localStorage and hasn't been wrapped
            if (text.includes('localStorage.getItem') && !text.includes('cloud_sync_update')) {
              bodiesToReplace.push(body);
            }
          }
        }
      }
    }
  }
  
  for (const body of bodiesToReplace) {
    const stmts = body.getStatements().map(s => s.getText()).join('\n');
    const newBodyText = `{
      const load = () => {
        ${stmts}
      };
      load();
      window.addEventListener('cloud_sync_update', load);
      return () => window.removeEventListener('cloud_sync_update', load);
    }`;
    body.replaceWithText(newBodyText);
    changed = true;
  }
  
  if (changed) {
    console.log('Patched ' + sourceFile.getBaseName());
    sourceFile.saveSync();
  }
}
