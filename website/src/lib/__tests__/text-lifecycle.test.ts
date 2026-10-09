import { textDiff } from '../text-lifecycle';
import { publicationMatches } from '../text-publication';
import { verifiedCommittedFiles } from '../deployment-file-proof';
it.each([['Hello.','Hello!'],['a b','a  b'],['','😀'],['abc','ac'],['restored','restored']])('reconstructs exact strings from a deterministic diff %j → %j',(before,after)=> {
  const diff=textDiff(before,after);
  expect(diff.filter(p=>p.kind!=='insert').map(p=>p.text).join('')).toBe(before);
  expect(diff.filter(p=>p.kind!=='delete').map(p=>p.text).join('')).toBe(after);
  expect(textDiff(before,after)).toEqual(diff);
});
it('highlights a punctuation-only edit',()=>expect(textDiff('Home.','Home!')).toEqual([{kind:'equal',text:'Home'},{kind:'delete',text:'.'},{kind:'insert',text:'!'}]));
it('exposes inserted whitespace rather than normalizing it',()=>expect(textDiff('a b','a  b').find(p=>p.kind==='insert')?.text).toBe(' '));
const sha='a'.repeat(40);
const proof={expectedSha:sha,statusSha:sha,vercelStatus:'success',statusDeploymentId:'release-a',servedSha:sha,servedDeploymentId:'dpl_release-a',apiSha:sha,apiDeploymentId:'dpl_release-a',actualValue:'Home',bundledValue:'Home',expectedValue:'Home'};
it('correlates status, served page, API bundle, deployment identity, and copy',()=>expect(publicationMatches(proof)).toBe(true));
it.each([{servedSha:'b'.repeat(40)},{apiSha:'b'.repeat(40)},{statusSha:'b'.repeat(40)},{servedDeploymentId:'other-release'},{apiDeploymentId:null},{statusDeploymentId:null},{actualValue:'Stale'},{bundledValue:'Stale'},{vercelStatus:'pending'}])('rejects concurrent/stale/missing release evidence %j',changed=>expect(publicationMatches({...proof,...changed})).toBe(false));
const paths=['website/src/config/strings.v1.json','website/src/config/media.v1.json'];
it.each(paths)('reports the verified changed authority file %s',filename=>expect(verifiedCommittedFiles({sha,files:[{filename}]},sha,paths)).toEqual([filename]));
it('requires the text file and rejects mismatched commit/file metadata',()=> {
  expect(()=>verifiedCommittedFiles({sha,files:[{filename:paths[1]}]},sha,paths,[paths[0]])).toThrow();
  expect(()=>verifiedCommittedFiles({sha:'b'.repeat(40),files:[{filename:paths[0]}]},sha,paths)).toThrow();
  expect(()=>verifiedCommittedFiles({sha,files:[{filename:'website/src/app/page.tsx'}]},sha,paths)).toThrow();
});
