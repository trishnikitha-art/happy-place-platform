/**
 * Visual Asset Registry - Complete Website Visual Inventory
 * 
 * Purpose: Comprehensive registry of ALL visual assets for the August website
 * - Includes 35 total assets (not just 16 reconciled ones)
 * - Preserves August 3 Drive ID provenance for missing assets
 * - Maps August asset → canonical identity → project → service → website slot → physical status
 * - Read-only projection of existing authorities
 * 
 * Architecture:
 * - Uses existing manifest.v1.json, media.v1.json, projects.v1.json, services.v1.json, brand.v1.json
 * - Augments with August 3 baseline data from archive/legacy-runtime/media.v1.json
 * - Does NOT duplicate authority logic
 * - Source of truth for Workbench visual inventory
 */

import { loadMediaManifest } from './media';
import type { Media, MediaManifest } from '@/types/media';
import { getMedia as getMediaFromKV } from './media-kv-store';

// Visual slot structure
export interface VisualSlot {
  id: string;
  route: string;
  page: string;
  component: string;
  section: string;
  slotName: string;
  currentMediaId: string | null;
  physicalStatus: 'PRESENT' | 'MISSING' | 'RECOVERABLE' | 'DRIVE_ONLY' | 'BLOB';
  augustDriveId?: string;
}

// Enhanced asset with full provenance
export interface VisualAsset extends Media {
  classification: 'PRESENT_MAPPED' | 'PRESENT_UNMAPPED' | 'REFERENCED_MISSING' | 'AUGUST_RECOVERABLE' | 'ORPHANED_VARIANT' | 'DRIVE_ONLY' | 'PUBLISHED' | 'UNKNOWN';
  usageSlots: VisualSlot[];
  physicalPath: string;
  augustDriveId?: string;
  augustProject?: string | null;
  augustService?: string | null;
  augustRoles?: string[];
  physicalStatus: 'PRESENT' | 'MISSING' | 'RECOVERABLE' | 'DRIVE_ONLY' | 'BLOB';
}

// August 3 baseline assets (from archive/legacy-runtime/media.v1.json)
const AUGUST_3_BASELINE = [
  { filename: 'FENCE BUILD.jpg', driveId: 'fences-001-master', project: 'fences-001', service: 'fences', roles: ['hero'], featured: true },
  { filename: 'FENCE BEFORE.jpg', driveId: 'drive-c266e5096e43', project: 'fences-001', service: 'fences', roles: ['before'], featured: false },
  { filename: 'FENCE AFTER.jpg', driveId: 'drive-7a4b33c8b2bb', project: 'fences-001', service: 'fences', roles: ['after'], featured: false },
  { filename: 'FENCEREBUILDMATCHINGSTAIN.png', driveId: 'fences-001-variant-001', project: 'fences-001', service: 'fences', roles: ['gallery'], featured: false },
  { filename: 'FINISHEDCARPENTRY.png', driveId: 'builtins-001-master', project: 'builtins-001', service: 'built-ins', roles: ['hero'], featured: true },
  { filename: 'FINISHEDCARPENTRY0.png', driveId: 'builtins-001-variant-001', project: 'builtins-001', service: 'built-ins', roles: ['gallery'], featured: false },
  { filename: 'TRIMREPAIR.png', driveId: 'repairs-001-master', project: 'repairs-001', service: 'repairs', roles: ['hero'], featured: true },
  { filename: 'DRYWALL.png', driveId: 'repairs-001-variant-001', project: 'repairs-001', service: 'repairs', roles: ['gallery'], featured: false },
  { filename: 'FLOOR.png', driveId: 'repairs-001-variant-002', project: 'repairs-001', service: 'repairs', roles: ['gallery'], featured: false },
  { filename: 'GUTTERCLEANING.jpg', driveId: 'repairs-001-variant-003', project: 'repairs-001', service: 'repairs', roles: ['gallery'], featured: false },
  { filename: 'IMG_0535.JPG', driveId: 'painting-001-master', project: 'exterior-painting-001', service: 'painting', roles: ['hero'], featured: true },
  { filename: 'IMG_0555.JPG', driveId: 'painting-001-variant-001', project: 'exterior-painting-001', service: 'painting', roles: ['gallery'], featured: false },
  { filename: 'IMG_0559.JPG', driveId: 'painting-001-variant-002', project: 'exterior-painting-001', service: 'painting', roles: ['gallery'], featured: false },
  { filename: 'IMG_0737.JPG', driveId: 'painting-001-variant-003', project: 'exterior-painting-001', service: 'painting', roles: ['gallery'], featured: false },
  { filename: 'IMG_0805.JPG', driveId: 'painting-001-variant-004', project: 'exterior-painting-001', service: 'painting', roles: ['gallery'], featured: false },
  { filename: 'IMG_0841.JPG', driveId: 'painting-001-variant-005', project: 'exterior-painting-001', service: 'painting', roles: ['gallery'], featured: false },
  { filename: 'BATHROOM_WALL.png', driveId: 'bathroom-001-master', project: 'bathroom-remodeling-001', service: 'bathrooms', roles: ['hero'], featured: true },
  { filename: 'featured.jpeg', driveId: 'drive-7fc72d02ab05', project: null, service: null, roles: ['brand'], featured: false },
  { filename: 'hero.jpeg', driveId: 'brand-hero-001', project: null, service: null, roles: ['hero', 'brand'], featured: true },
  { filename: 'portrait.jpeg', driveId: 'brand-portrait-001', project: null, service: null, roles: ['portrait', 'brand'], featured: false },
  { filename: 'FLOOR0.jpg', driveId: 'repairs-001-variant-004', project: 'repairs-001', service: 'repairs', roles: ['gallery'], featured: false },
  { filename: 'IMG_0544.JPG', driveId: 'repairs-001-variant-005', project: 'repairs-001', service: 'repairs', roles: ['gallery'], featured: false },
  { filename: 'IMG_0546.JPG', driveId: 'repairs-001-variant-006', project: 'repairs-001', service: 'repairs', roles: ['gallery'], featured: false },
  { filename: 'HOMESERVICEPROJECTPERGOLAS.jpg', driveId: 'pergolas-001-master', project: 'pergolas-001', service: 'pergolas', roles: ['hero'], featured: true },
  { filename: '1.png', driveId: 'pergolas-001-variant-001', project: 'pergolas-001', service: 'pergolas', roles: ['before'], featured: false },
];

// Website visual slots from semantic analysis
const WEBSITE_VISUAL_SLOTS: VisualSlot[] = [
  // Homepage
  { id: 'homepage-hero-slot', route: '/', page: 'Homepage', component: 'HeroSection', section: 'Hero', slotName: 'Hero Background', currentMediaId: 'homepage-hero-canonical', physicalStatus: 'PRESENT' },
  { id: 'homepage-logo-slot', route: '/', page: 'Homepage', component: 'SiteHeader', section: 'Header', slotName: 'Logo', currentMediaId: null, physicalStatus: 'PRESENT' },
  { id: 'homepage-owner-portrait-slot', route: '/', page: 'Homepage', component: 'HeroSection', section: 'Hero', slotName: 'Owner Portrait', currentMediaId: 'brand-portrait', physicalStatus: 'MISSING', augustDriveId: 'brand-portrait-001' },
  { id: 'homepage-service-card-slot-fences', route: '/', page: 'Homepage', component: 'ServiceCard', section: 'Services', slotName: 'Fences Service Card', currentMediaId: null, physicalStatus: 'PRESENT' },
  { id: 'homepage-service-card-slot-painting', route: '/', page: 'Homepage', component: 'ServiceCard', section: 'Services', slotName: 'Painting Service Card', currentMediaId: null, physicalStatus: 'PRESENT' },
  { id: 'homepage-featured-transformation-before-slot', route: '/', page: 'Homepage', component: 'BeforeAfterSlider', section: 'Featured Transformation', slotName: 'Before Image', currentMediaId: null, physicalStatus: 'MISSING', augustDriveId: 'painting-001-variant-001' },
  { id: 'homepage-featured-transformation-after-slot', route: '/', page: 'Homepage', component: 'BeforeAfterSlider', section: 'Featured Transformation', slotName: 'After Image', currentMediaId: null, physicalStatus: 'MISSING', augustDriveId: 'painting-001-master' },
  
  // About Page
  { id: 'about-hero-slot', route: '/about', page: 'About', component: 'HeroSection', section: 'Hero', slotName: 'Owner Portrait', currentMediaId: 'brand-portrait', physicalStatus: 'MISSING', augustDriveId: 'brand-portrait-001' },
  { id: 'about-logo-slot', route: '/about', page: 'About', component: 'SiteHeader', section: 'Header', slotName: 'Logo', currentMediaId: null, physicalStatus: 'PRESENT' },
  
  // Our Work Page
  { id: 'our-work-featured-before-slot', route: '/our-work', page: 'Our Work', component: 'BeforeAfterSlider', section: 'Featured Transformations', slotName: 'Before Image', currentMediaId: null, physicalStatus: 'MISSING', augustDriveId: 'drive-c266e5096e43' },
  { id: 'our-work-featured-after-slot', route: '/our-work', page: 'Our Work', component: 'BeforeAfterSlider', section: 'Featured Transformations', slotName: 'After Image', currentMediaId: null, physicalStatus: 'MISSING', augustDriveId: 'drive-7a4b33c8b2bb' },
  
  // Projects
  { id: 'project-hero-slot-fences', route: '/projects/fences', page: 'Project Detail', component: 'ProjectSpotlight', section: 'Hero', slotName: 'Hero Image', currentMediaId: 'b8adf93d-6a2e-5738-9dbf-aa2350f01d55', physicalStatus: 'PRESENT' },
  { id: 'project-hero-slot-builtins', route: '/projects/built-ins', page: 'Project Detail', component: 'ProjectSpotlight', section: 'Hero', slotName: 'Hero Image', currentMediaId: '0a70fd32-d9f2-5aea-bd86-25437d39a7ad', physicalStatus: 'PRESENT' },
  { id: 'project-hero-slot-repairs', route: '/projects/repairs', page: 'Project Detail', component: 'ProjectSpotlight', section: 'Hero', slotName: 'Hero Image', currentMediaId: '898839ee-b2cf-5507-a862-6e27ecae71f4', physicalStatus: 'PRESENT' },
  { id: 'project-hero-slot-painting', route: '/projects/exterior-painting', page: 'Project Detail', component: 'ProjectSpotlight', section: 'Hero', slotName: 'Hero Image', currentMediaId: null, physicalStatus: 'MISSING', augustDriveId: 'painting-001-master' },
  
  // Global
  { id: 'global-logo-slot', route: '*', page: 'All Pages', component: 'SiteHeader/SiteFooter', section: 'Header/Footer', slotName: 'Logo', currentMediaId: null, physicalStatus: 'PRESENT' },
];

/**
 * Load complete visual asset registry
 * Combines current media.v1.json with August 3 baseline data
 * Note: Vercel KV Drive assets are loaded dynamically when needed
 */
export async function loadVisualAssetRegistry(): Promise<VisualAsset[]> {
  const manifest = loadMediaManifest();
  const registry: VisualAsset[] = [];

  // Add current media assets from media.v1.json
  manifest.media.forEach(m => {
    const augustData = AUGUST_3_BASELINE.find(a => a.filename === m.filename);
    const classification = classifyAsset(m, augustData);
    const usageSlots = getUsageSlots(m);
    const physicalPath = `/images/projects/${m.projectId || 'unknown'}/${m.filename}`;
    const physicalStatus = determinePhysicalStatus(m, augustData);

    registry.push({
      ...m,
      classification,
      usageSlots,
      physicalPath,
      augustDriveId: augustData?.driveId,
      augustProject: augustData?.project,
      augustService: augustData?.service,
      augustRoles: augustData?.roles,
      physicalStatus,
    });
  });

  // Add missing August 3 assets that aren't in current media.v1.json
  AUGUST_3_BASELINE.forEach(august => {
    const exists = manifest.media.some(m => m.filename === august.filename);
    if (!exists) {
      registry.push({
        id: `august-missing-${august.driveId}`,
        filename: august.filename,
        alt: `Missing August 3 asset: ${august.filename}`,
        type: 'image',
        orientation: 'landscape',
        dimensions: { width: 0, height: 0 },
        projectId: august.project,
        service: august.service,
        roles: august.roles,
        tags: ['missing', 'august3'],
        featured: august.featured,
        variants: {},
        provenance: {
          august3_driveId: august.driveId,
          match_type: 'august3-only',
          confidence: 'high',
        },
        classification: 'AUGUST_RECOVERABLE',
        usageSlots: getUsageSlotsForAugustAsset(august),
        physicalPath: `/images/projects/${august.project || 'unknown'}/${august.filename}`,
        augustDriveId: august.driveId,
        augustProject: august.project,
        augustService: august.service,
        augustRoles: august.roles,
        physicalStatus: 'RECOVERABLE',
      } as VisualAsset);
    }
  });

  return registry;
}

/**
 * Classify asset based on semantic analysis
 */
function classifyAsset(media: Media, augustData?: any): VisualAsset['classification'] {
  // PUBLISHED: Materialized from Drive with local source and Blob storage
  if (media.source === 'local' && media.lifecycleState === 'published') {
    return 'PUBLISHED';
  }

  // DRIVE_ONLY: exists in canonical Drive graph but not in physical filesystem
  if (media.provenance?.drive_canonical && !media.variants?.original) {
    return 'DRIVE_ONLY';
  }

  if (media.filename === 'hero-background-enhanced.jpg' || media.filename === 'logo.png') {
    return 'PRESENT_MAPPED';
  }

  if (media.projectId && ['FENCE BUILD.jpg', 'FENCEREBUILDMATCHINGSTAIN.png', 'FINISHEDCARPENTRY.png', 'FINISHEDCARPENTRY0.png', 'TRIMREPAIR.png', 'DRYWALL.png', 'FLOOR.png', 'GUTTERCLEANING.jpg'].includes(media.filename)) {
    return 'PRESENT_UNMAPPED';
  }

  if (['Feature-Fence-Photo.jpg', 'HP0017_ExteriorPainting_After.jpg', 'HP0017_ExteriorPainting_Before.jpg', 'HP0018_FenceInstallation_Exterior_SideStained_After.jpg'].includes(media.filename)) {
    return 'REFERENCED_MISSING';
  }

  if ((media as VisualAsset).provenance?.august3_driveId && !media.variants?.original) {
    return 'AUGUST_RECOVERABLE';
  }

  if (media.filename.includes('-480.') || media.filename.includes('-thumb.')) {
    return 'ORPHANED_VARIANT';
  }

  if (media.variants?.original) {
    return 'PRESENT_MAPPED';
  }

  return 'UNKNOWN';
}

/**
 * Get usage slots for a media asset
 */
function getUsageSlots(media: Media): VisualSlot[] {
  const slots: VisualSlot[] = [];
  
  if (media.filename === 'hero-background-enhanced.jpg') {
    slots.push(WEBSITE_VISUAL_SLOTS.find(s => s.id === 'homepage-hero-slot')!);
  }
  
  if (media.filename === 'logo.png') {
    slots.push(WEBSITE_VISUAL_SLOTS.find(s => s.id === 'global-logo-slot')!);
  }
  
  if (media.filename === 'portrait.jpeg' || media.id === 'brand-portrait') {
    slots.push(
      WEBSITE_VISUAL_SLOTS.find(s => s.id === 'homepage-owner-portrait-slot')!,
      WEBSITE_VISUAL_SLOTS.find(s => s.id === 'about-hero-slot')!
    );
  }
  
  if (media.projectId === 'fences-001' || media.filename === 'FENCE BUILD.jpg') {
    slots.push(WEBSITE_VISUAL_SLOTS.find(s => s.id === 'project-hero-slot-fences')!);
  }
  
  if (media.projectId === 'builtins-001' || media.filename === 'FINISHEDCARPENTRY.png') {
    slots.push(WEBSITE_VISUAL_SLOTS.find(s => s.id === 'project-hero-slot-builtins')!);
  }
  
  if (media.projectId === 'repairs-001' || media.filename === 'TRIMREPAIR.png') {
    slots.push(WEBSITE_VISUAL_SLOTS.find(s => s.id === 'project-hero-slot-repairs')!);
  }
  
  return slots.filter(s => s !== undefined);
}

/**
 * Get usage slots for August 3 asset
 */
function getUsageSlotsForAugustAsset(august: any): VisualSlot[] {
  const slots: VisualSlot[] = [];
  
  if (august.roles.includes('hero') && august.project === 'exterior-painting-001') {
    slots.push(WEBSITE_VISUAL_SLOTS.find(s => s.id === 'project-hero-slot-painting')!);
  }
  
  if (august.roles.includes('before') && august.project === 'fences-001') {
    slots.push(WEBSITE_VISUAL_SLOTS.find(s => s.id === 'our-work-featured-before-slot')!);
  }
  
  if (august.roles.includes('after') && august.project === 'fences-001') {
    slots.push(WEBSITE_VISUAL_SLOTS.find(s => s.id === 'our-work-featured-after-slot')!);
  }
  
  if (august.roles.includes('portrait') || august.filename === 'portrait.jpeg') {
    slots.push(
      WEBSITE_VISUAL_SLOTS.find(s => s.id === 'homepage-owner-portrait-slot')!,
      WEBSITE_VISUAL_SLOTS.find(s => s.id === 'about-hero-slot')!
    );
  }
  
  return slots.filter(s => s !== undefined);
}

/**
 * Determine physical status
 */
function determinePhysicalStatus(media: Media, augustData?: any): 'PRESENT' | 'MISSING' | 'RECOVERABLE' | 'DRIVE_ONLY' {
  if (media.provenance?.drive_canonical && !media.variants?.original) {
    return 'DRIVE_ONLY';
  }

  if (media.variants?.original) {
    return 'PRESENT';
  }

  if (augustData?.driveId) {
    return 'RECOVERABLE';
  }

  return 'MISSING';
}

/**
 * Get all website visual slots
 */
export function getWebsiteVisualSlots(): VisualSlot[] {
  return WEBSITE_VISUAL_SLOTS;
}

/**
 * Get visual slots by route
 */
export function getVisualSlotsByRoute(route: string): VisualSlot[] {
  return WEBSITE_VISUAL_SLOTS.filter(s => s.route === route || s.route === '*');
}

/**
 * Get empty/broken slots
 */
export async function getEmptySlots(): Promise<VisualSlot[]> {
  const registry = await loadVisualAssetRegistry();
  return WEBSITE_VISUAL_SLOTS.filter(s => s.physicalStatus === 'MISSING' || s.physicalStatus === 'RECOVERABLE');
}

/**
 * Get August 3 recoverable assets
 */
export async function getAugust3RecoverableAssets(): Promise<VisualAsset[]> {
  const registry = await loadVisualAssetRegistry();
  return registry.filter(a => a.classification === 'AUGUST_RECOVERABLE' || a.augustDriveId);
}

/**
 * Get DRIVE_ONLY assets (exist in canonical Drive graph but not in physical filesystem)
 * Actually loads PublishedMediaAsset records from KV that have local source
 */
export async function getDriveOnlyAssets(): Promise<VisualAsset[]> {
  const driveAssets: VisualAsset[] = [];
  
  try {
    // Load all media records from KV that are published (materialized from Drive)
    const { listMediaIds } = await import('./media-kv-store');
    const mediaIds = await listMediaIds();
    
    for (const mediaId of mediaIds) {
      const { getMedia } = await import('./media-kv-store');
      const media = await getMedia(mediaId);
      
      if (media && media.source === 'local' && media.lifecycleState === 'published') {
        // This is a PublishedMediaAsset (materialized from Drive)
        const classification = 'PUBLISHED';
        const usageSlots: VisualSlot[] = [];
        const physicalPath = media.variants?.original || '';
        const physicalStatus = 'BLOB';
        
        driveAssets.push({
          ...media,
          classification,
          usageSlots,
          physicalPath,
          physicalStatus,
        } as VisualAsset);
      }
    }
    
    console.log('[VISUAL_ASSET_REGISTRY] Loaded PublishedMediaAsset records from KV:', {
      count: driveAssets.length,
    });
    
    return driveAssets;
  } catch (error) {
    console.error('[VISUAL_ASSET_REGISTRY] Failed to load Drive assets:', error);
    return [];
  }
}

/**
 * Add a materialized asset to the registry (called after successful ingestion)
 * 
 * CONSTITUTIONAL FIX: Properly classify materialized assets
 * - Drive source → materialized → PublishedMediaAsset should be classified as PUBLISHED
 * - Physical status should reflect Blob storage, not Drive dependency
 */
export async function addDriveAssetToRegistry(media: Media): Promise<VisualAsset> {
  // CONSTITUTIONAL FIX: Materialized assets are not DRIVE_ONLY
  // They have been converted from Drive source to local Blob storage
  const classification = media.lifecycleState === 'published' ? 'PUBLISHED' : 'DRIVE_ONLY';
  const usageSlots: VisualSlot[] = [];
  const physicalPath = media.variants?.original || '';
  const physicalStatus = media.source === 'local' ? 'BLOB' : 'DRIVE_ONLY';

  return {
    ...media,
    classification,
    usageSlots,
    physicalPath,
    physicalStatus,
  } as VisualAsset;
}
