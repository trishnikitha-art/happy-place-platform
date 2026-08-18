/**
 * Media Ordering Panel - Workbench
 * 
 * Displays all 25 canonical photos from MAIN (duplicate excluded)
 * Allows drag/reorder
 * Saves ordering to Workbench overlay
 * Resets to MAIN baseline
 * 
 * MAIN authorities remain completely untouched.
 * 
 * Duplicate excluded: pergolas-001-after (duplicate of pergolas-001-hero)
 */

'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Layers, Save, RotateCcw } from 'lucide-react';
import { loadMediaManifest } from '@/lib/media';
import type { Media } from '@/types/media';
import { loadWorkbenchOrdering, saveWorkbenchOrdering, resetToMainBaseline, loadSavedOrdering, type MediaOrder } from '@/lib/workbench-ordering';

interface MediaItem extends Media {
  workbenchPosition: number;
}

export default function MediaOrderingPanel() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedStatus, setSavedStatus] = useState<'unsaved' | 'saved' | 'unsaved-changes'>('unsaved');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadCanonicalMedia();
  }, []);

  const loadCanonicalMedia = () => {
    try {
      setLoading(true);
      const manifest = loadMediaManifest();
      
      // Exclude duplicate: pergolas-001-after is duplicate of pergolas-001-hero
      const canonicalMedia = manifest.media.filter(media => media.id !== 'pergolas-001-after');
      
      // Load saved ordering if exists
      const savedOrdering = loadSavedOrdering();
      
      // Create media items with workbench position
      let items: MediaItem[];
      
      if (savedOrdering && savedOrdering.orders.length > 0) {
        // Apply saved ordering
        const orderMap = new Map(savedOrdering.orders.map(o => [o.mediaId, o.position]));
        items = canonicalMedia.map((media, index) => ({
          ...media,
          workbenchPosition: orderMap.get(media.id) ?? index
        }));
        items.sort((a, b) => a.workbenchPosition - b.workbenchPosition);
        setSavedStatus('saved');
      } else {
        // Use MAIN baseline order (array position)
        items = canonicalMedia.map((media, index) => ({
          ...media,
          workbenchPosition: index
        }));
        setSavedStatus('unsaved');
      }
      
      setMediaItems(items);
    } catch (err) {
      console.error('Failed to load canonical media:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const newItems = [...mediaItems];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    
    // Update positions
    newItems.forEach((item, index) => {
      item.workbenchPosition = index;
    });
    
    setMediaItems(newItems);
    setDraggedIndex(null);
    setSavedStatus('unsaved-changes');
  };

  const handleSave = () => {
    const ordering: MediaOrder[] = mediaItems.map((item, index) => ({
      mediaId: item.id,
      position: index,
      scope: item.projectId ? 'project' : 'global',
      projectId: item.projectId
    }));
    
    const workbenchOrdering = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      baseline: {
        source: 'main',
        commit: '5ba201cd354b4cc2ba95f9612c39e08d813ffab1'
      },
      orderVersion: (loadWorkbenchOrdering().orderVersion || 0) + 1,
      orders: ordering
    };
    
    saveWorkbenchOrdering(workbenchOrdering);
    setSavedStatus('saved');
  };

  const handleReset = () => {
    resetToMainBaseline();
    loadCanonicalMedia();
  };

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes('hero')) return <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">Hero</span>;
    if (roles.includes('before')) return <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">Before</span>;
    if (roles.includes('after')) return <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">After</span>;
    if (roles.includes('brand')) return <span className="px-2 py-1 border border-border text-xs rounded">Brand</span>;
    if (roles.includes('portrait')) return <span className="px-2 py-1 border border-border text-xs rounded">Portrait</span>;
    return <span className="px-2 py-1 border border-border text-xs rounded">Gallery</span>;
  };

  const getIdentityStatus = (mediaId: string) => {
    // All displayed photos are canonical (duplicate excluded at load time)
    return <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded ml-2">Canonical</span>;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Layers className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading canonical media...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ImageIcon size={20} />
              Media Ordering
            </h1>
            <span className="text-xs text-muted-foreground">
              {mediaItems.length} canonical photos from MAIN (duplicate excluded)
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground mr-4">
              Status: {savedStatus === 'saved' ? 'Saved' : savedStatus === 'unsaved-changes' ? 'Unsaved changes' : 'Unsaved'}
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Reset to MAIN
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              Save Ordering
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto p-6 touch-pan-y" style={{ overscrollBehavior: 'contain' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mediaItems.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`
                bg-card border border-border rounded-lg p-4 cursor-grab active:cursor-grabbing
                hover:border-primary transition-colors
                ${draggedIndex === index ? 'opacity-50' : ''}
              `}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-muted rounded mb-3 overflow-hidden">
                {item.variants.thumbnail ? (
                  <img
                    src={item.variants.thumbnail}
                    alt={item.alt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate" title={item.id}>
                      {item.id}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={item.filename}>
                      {item.filename}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getRoleBadge(item.roles)}
                    {getIdentityStatus(item.id)}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {item.projectId && (
                    <span>Project: {item.projectId}</span>
                  )}
                  {item.service && (
                    <span>• {item.service}</span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Position: {item.workbenchPosition + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border bg-card px-6 py-3">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Baseline: MAIN@5ba201cd</span>
            <span>Workbench ordering overlay: {savedStatus === 'saved' ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
