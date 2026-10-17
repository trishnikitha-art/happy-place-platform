'use client';

import { Fragment } from 'react';
import { useTextCopy } from '@/components/text-copy';
import type { TextKey } from '@/lib/text-contract';

/** Format the existing article copy without changing its canonical text or edit identity. */
export function ArticleCopy({ textKey }: { textKey: TextKey }) {
  const text = useTextCopy(textKey).replace(/^#{1,6}\s+/, '').replace(/^(?:-\s+|\d+\.\s+)/, '');
  return <span data-text-key={textKey}>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**') ? <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>)}</span>;
}
