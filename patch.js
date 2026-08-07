const fs = require('fs');
let content = fs.readFileSync('src/pages/DailyLog.tsx', 'utf-8');

// 1. Update interface
content = content.replace(
  /topicId\?: string;\s*topicName\?: string;\s*subTopicId\?: string;\s*subTopicName\?: string;/,
  `topicId?: string | string[];
  topicName?: string | string[];
  subTopicId?: string | string[];
  subTopicName?: string | string[];`
);

// 2. Update activeTopic to activeTopics array
content = content.replace(
  `const activeTopic = activeChapter?.topics?.find((t: any) => t.id === newLog.topicId);`,
  `const activeTopics = activeChapter?.topics?.filter((t: any) => Array.isArray(newLog.topicId) ? newLog.topicId.includes(t.id) : t.id === newLog.topicId) || [];`
);

// 3. Update activeSubTopics logic for the UI
// The UI currently uses `!activeTopic || !activeTopic.subTopics?.length`
// We will replace this in the JSX directly.

// 4. Update onChange resets
content = content.replace(
  `onChange={e => setNewLog({ ...newLog, subjectId: e.target.value, chapterId: '', topicId: '', subTopicId: '' })}`,
  `onChange={e => setNewLog({ ...newLog, subjectId: e.target.value, chapterId: '', topicId: [], subTopicId: [] })}`
);
content = content.replace(
  `onChange={e => setNewLog({ ...newLog, chapterId: e.target.value, topicId: '', subTopicId: '' })}`,
  `onChange={e => setNewLog({ ...newLog, chapterId: e.target.value, topicId: [], subTopicId: [] })}`
);

fs.writeFileSync('src/pages/DailyLog.tsx', content);
