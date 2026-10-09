export class TextError extends Error {
  constructor(public status: number, public code: string, message=code) { super(message); }
}
export async function textDependency<T>(operation: ()=>Promise<T>): Promise<T> {
  try { return await operation(); } catch(e) { if(e instanceof TextError) throw e; throw new TextError(503,'TEXT_DEPENDENCY_UNAVAILABLE'); }
}
export function textPrincipal(): string {
  const id=process.env.HPP_WORKBENCH_PRINCIPAL_ID;
  if(!id) throw new TextError(503,'TEXT_PRINCIPAL_UNAVAILABLE');
  return id;
}
export function validateTextId(id: unknown): asserts id is string {
  if(typeof id!=='string' || !/^WBDEP-\d+-[a-f0-9-]{36}$/.test(id)) throw new TextError(400,'INVALID_TEXT_RECEIPT');
}
export function scriptResult(result: unknown): void {
  if(!Array.isArray(result)) throw new TextError(500,'INVALID_LIFECYCLE_RESPONSE');
  if(result[0]==='OK') return;
  const code=String(result[1]);
  throw new TextError(code==='NOT_FOUND'?404:code==='FORBIDDEN'?403:409,code);
}
