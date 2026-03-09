import fs from 'fs';

const files = ['src/services/api.ts', 'src/App.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // Replace: fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://jiosaavn-api-privatecvc2.vercel.app/...`)}`)
  // With: fetch(`https://jiosaavn-api-privatecvc2.vercel.app/...`)
  
  // In App.tsx
  content = content.replace(/fetch\(`https:\/\/api\.allorigins\.win\/raw\?url=\$\{encodeURIComponent\(`(https:\/\/jiosaavn-api-privatecvc2\.vercel\.app[^`]+)`\)\}`\)/g, 'fetch(`$1`)');

  // In api.ts
  content = content.replace(/const proxyUrl = `https:\/\/api\.allorigins\.win\/raw\?url=\$\{encodeURIComponent\(targetUrl\)\}`;/g, 'const proxyUrl = targetUrl;');

  fs.writeFileSync(file, content);
}
console.log('Replaced successfully');
