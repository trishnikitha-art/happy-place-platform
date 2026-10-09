export function verifiedCommittedFiles(commit: {sha?:string; files?:{filename:string}[]}, expectedSha: string, authorityPaths: string[], requiredPaths: string[]=[]): string[] {
  if(commit.sha!==expectedSha || !Array.isArray(commit.files) || commit.files.length>authorityPaths.length) throw new Error('Invalid committed file proof');
  const files=commit.files.map(f=>f.filename).sort();
  if(new Set(files).size!==files.length || files.some(p=>!authorityPaths.includes(p)) || requiredPaths.some(p=>!files.includes(p))) throw new Error('Committed files differ from allowed authority');
  return files;
}
