const fs = require('fs');
let content = fs.readFileSync('src/pages/Flashcards.tsx', 'utf-8');

if (!content.includes('useSearchParams')) {
  content = content.replace(
    `import { useAuth } from '../lib/AuthContext';`,
    `import { useAuth } from '../lib/AuthContext';
import { useSearchParams } from 'react-router-dom';`
  );

  content = content.replace(
    `  const { currentUser } = useAuth();`,
    `  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();`
  );

  content = content.replace(
    `  useEffect(() => {
    const savedSyllabus = localStorage.getItem('dugu_syllabus_v2');`,
    `  useEffect(() => {
    const savedSyllabus = localStorage.getItem('dugu_syllabus_v2');`
  );

  const effectHookStr = `  useEffect(() => {
    const savedSyllabus = localStorage.getItem('dugu_syllabus_v2');
    if (savedSyllabus) setSyllabus(JSON.parse(savedSyllabus));
    const savedItems = localStorage.getItem('dugu_learning_items');
    if (savedItems) setItems(JSON.parse(savedItems));
  }, []);`;

  const newEffectHook = `  useEffect(() => {
    const savedSyllabus = localStorage.getItem('dugu_syllabus_v2');
    if (savedSyllabus) setSyllabus(JSON.parse(savedSyllabus));
    const savedItems = localStorage.getItem('dugu_learning_items');
    if (savedItems) setItems(JSON.parse(savedItems));
    
    const subjectId = searchParams.get('subjectId');
    const chapterId = searchParams.get('chapterId');
    const action = searchParams.get('action');
    
    if (subjectId) setPracticeSubjectId(subjectId);
    if (chapterId) setPracticeChapterId(chapterId);
    
    if (action === 'play-flashcard') setActiveTab('flashcards');
    if (action === 'play-quiz') setActiveTab('quiz');
  }, [searchParams]);`;
  
  content = content.replace(effectHookStr, newEffectHook);
  fs.writeFileSync('src/pages/Flashcards.tsx', content);
}
