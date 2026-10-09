export function publicationMatches(proof: {expectedSha:string;statusSha:string;vercelStatus:string;statusDeploymentId?:string|null;servedSha?:string|null;servedDeploymentId?:string|null;apiSha?:string|null;apiDeploymentId?:string|null;actualValue?:string|null;bundledValue:string;expectedValue:string}): boolean {
  const id=(value?:string|null)=>value?.replace(/^dpl_/,'');
  return /^[a-f0-9]{40}$/.test(proof.expectedSha) && proof.vercelStatus==='success' &&
    proof.statusSha===proof.expectedSha && proof.servedSha===proof.expectedSha && proof.apiSha===proof.expectedSha &&
    !!id(proof.statusDeploymentId) && id(proof.statusDeploymentId)===id(proof.servedDeploymentId) && id(proof.apiDeploymentId)===id(proof.servedDeploymentId) &&
    proof.actualValue===proof.expectedValue && proof.bundledValue===proof.expectedValue;
}
