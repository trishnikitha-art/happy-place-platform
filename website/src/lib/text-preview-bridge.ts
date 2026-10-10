import { TEXT_FIELDS, type TextKey } from './text-contract';
export type TextPreviewDraft = {key:TextKey;value:string;editable?:boolean;editVersion?:number;resetVersion?:number};
export function isTextKey(value:unknown): value is TextKey {
  return typeof value === 'string' && Object.hasOwn(TEXT_FIELDS,value);
}
export function parseTextPreviewDraft(input:unknown):TextPreviewDraft|null {
  if (!input || typeof input !== 'object') return null;
  const draft=input as TextPreviewDraft;
  return isTextKey(draft.key) && typeof draft.value === 'string' &&
    draft.value.length <= TEXT_FIELDS[draft.key].maxLength ? {key:draft.key,value:draft.value} : null;
}
