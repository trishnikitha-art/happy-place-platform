const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/config/projects.v1.json', 'utf8'));
data.projects.forEach(p => console.log(p.id, p.title, (p.media?.gallery || []).length));
