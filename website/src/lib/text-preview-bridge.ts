import { TEXT_FIELDS, type TextKey } from './text-contract';
export type TextPreviewDraft = {key:TextKey;value:string;editable?:boolean;editVersion?:number;resetVersion?:number;queued?:Array<{key:TextKey;value:string}>};
export function isTextKey(value:unknown): value is TextKey {
  return typeof value === 'string' && Object.hasOwn(TEXT_FIELDS,value);
}
export function parseTextPreviewDraft(input:unknown):TextPreviewDraft|null {
  if (!input || typeof input !== 'object') return null;
  const draft=input as TextPreviewDraft;
  if (!isTextKey(draft.key) || typeof draft.value !== 'string' || draft.value.length > TEXT_FIELDS[draft.key].maxLength) return null;
  if (draft.queued !== undefined) {
    if (!Array.isArray(draft.queued) || draft.queued.length > Object.keys(TEXT_FIELDS).length ||
      Array.from(draft.queued).some(item => !item || !isTextKey(item.key) || typeof item.value !== 'string' || item.value.length > TEXT_FIELDS[item.key].maxLength) ||
      new Set(draft.queued.map(item => item.key)).size !== draft.queued.length) return null;
  }
  return {key:draft.key,value:draft.value,...(draft.queued !== undefined ? {queued:draft.queued.map(({key,value})=>({key,value}))} : {})};
}
