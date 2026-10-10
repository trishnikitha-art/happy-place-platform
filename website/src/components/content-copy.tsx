'use client';
import { createContext,useContext,type ReactNode } from 'react';
import { contentCopyLimit,type ContentCollection,type ContentCopyChange } from '@/lib/content-contract';

const CopyPreview=createContext<{collection:ContentCollection;changes:ContentCopyChange[]}|null>(null);
// A verified immutable staging receipt supplies preview changes; this is never an authority store.
export function ContentCopyPreviewProvider({collection,changes,children}:{collection:ContentCollection;changes:ContentCopyChange[];children:ReactNode}) {
  return <CopyPreview.Provider value={{collection,changes}}>{children}</CopyPreview.Provider>;
}
export function ContentCopy({collection,id,field,value,route}:{collection:ContentCollection;id:string;field:string;value:string;route:string}) {
  const preview=useContext(CopyPreview),limit=contentCopyLimit(collection,field);
  if(!limit)throw new Error('Unsupported canonical copy field');
  const change=preview?.collection===collection?preview.changes.find(change=>change.id===id && change.field===field):undefined;
  return <span data-content-collection={collection} data-content-id={id} data-content-field={field} data-content-route={route} data-content-max-length={limit}>{change?.value??value}</span>;
}
