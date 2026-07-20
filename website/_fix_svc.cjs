const fs = require("fs");
const p = "src/lib/media.ts";
let s = fs.readFileSync(p, "utf8");
// locate the servicePhoto body and replace the filter condition
const start = s.indexOf("export function servicePhoto");
const end = s.indexOf("return hits.length ? toMedia(hits[0])");
if (start < 0 || end < 0) { console.log("markers not found"); process.exit(1); }
const body = s.slice(start, end);
const oldFilter = "m.quality.service,\n  )\n    .sort";
if (!body.includes(oldFilter)) { console.log("filter token not found in body"); process.exit(1); }
const newBody = body.replace(
  "m.quality.service,\n  )\n    .sort",
  "m.quality.service) ||\n      SERVICE_PROXY[slug] === m.category,\n  )\n    .sort"
);
s = s.slice(0, start) + newBody + s.slice(end);
fs.writeFileSync(p, s);
console.log("servicePhoto proxy fix applied");
