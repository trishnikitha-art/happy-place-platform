"use client";

/**
 * GalleryDropZone - Workbench-specific drop zone for adding items to project gallery
 * 
 * This component wraps ProjectPhotos in Workbench mode to provide drag-and-drop
 * functionality for adding media to the gallery.
 * 
 * Only active when ?workbench=true is in the URL
 */

import { useEffect, useRef } from 'react';

interface GalleryDropZoneProps {
  projectId: string;
  children: React.ReactNode;
}

export function GalleryDropZone({ projectId, children }: GalleryDropZoneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isWorkbench = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('workbench');

  useEffect(() => {
    if (!isWorkbench) return;

    const container = containerRef.current;
    if (!container) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();

      const data = e.dataTransfer!.getData('application/json');
      if (!data) return;

      try {
        const dragData = JSON.parse(data);
        
        // Send GALLERY_ADD message to parent Workbench
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'GALLERY_ADD',
            slotId: `gallery:${projectId}`,
            projectId,
            assetId: dragData.assetId,
            applicationData: dragData.applicationData,
          }, window.location.origin);
        }
      } catch (error) {
        console.error('[GALLERY_DROP_ZONE] Failed to parse drag data', error);
      }
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, [isWorkbench, projectId]);

  return (
    <div ref={containerRef} className={isWorkbench ? 'ring-2 ring-dashed ring-primary/50 ring-offset-2' : ''}>
      {children}
    </div>
  );
}
