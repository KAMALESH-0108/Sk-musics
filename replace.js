import fs from 'fs';

const files = ['src/services/api.ts', 'src/App.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/https:\/\/api\.codetabs\.com\/v1\/proxy\?quest=/g, 'https://api.allorigins.win/raw?url=');
  fs.writeFileSync(file, content);
}
console.log('Replaced successfully');
