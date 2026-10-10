'use client';

import { useEffect, useRef, useState } from 'react';

// Callers retain source authority; this only presents an already-selected thumbnail URL.
export function MediaThumbnail({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) setState(image.naturalWidth > 0 ? 'loaded' : 'error');
  }, []);
  return <span className={`relative block overflow-hidden bg-surface ${className}`}>
    {state === 'loading' && <span aria-hidden="true" className="loading-skeleton absolute inset-0 bg-primary/10" />}
    {state === 'error' && <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-muted-foreground">Photo unavailable</span>}
    <img ref={imageRef} src={src} alt={alt} loading="lazy" decoding="async" draggable={false}
      onLoad={() => setState('loaded')} onError={() => setState('error')}
      className={`h-full w-full object-cover transition-opacity duration-200 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`} />
  </span>;
}
