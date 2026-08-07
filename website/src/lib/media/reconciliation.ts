/**
 * Media Runtime Reconciliation Service
 * 
 * Continuously reconciles three realities:
 * 1. Google Drive (source of truth for original files)
 * 2. Canonical Graph (authoritative metadata and relationships)
 * 3. Website Runtime (published projections and deployment state)
 * 
 * The operator should immediately see:
 * Drive: 312 photos
 * Canonical: 298 imported, 14 new
 * Website: 287 published, 11 staged
 */

import { driveDiscovery } from '../drive/drive-discovery';
import { graphReconstructor, CanonicalAsset } from './graph-reconstructor';

export interface ReconciliationState {
  drive: {
    totalPhotos: number;
    folders: number;
    lastSync: string;
  };
  canonical: {
    totalAssets: number;
    imported: number;
    new: number;
    changed: number;
    deleted: number;
  };
  website: {
    published: number;
    staged: number;
    pending: number;
    lastPublished: string;
  };
  deltas: {
    driveToCanonical: number;
    canonicalToWebsite: number;
    drift: number;
  };
}

export class ReconciliationService {
  private static instance: ReconciliationService;
  private lastState: ReconciliationState | null = null;

  private constructor() {}

  static getInstance(): ReconciliationService {
    if (!ReconciliationService.instance) {
      ReconciliationService.instance = new ReconciliationService();
    }
    return ReconciliationService.instance;
  }

  /**
   * Perform full reconciliation across all three systems
   */
  async reconcile(): Promise<ReconciliationState> {
    // 1. Scan Drive
    const driveState = await this.scanDrive();

    // 2. Reconstruct Canonical Graph
    const { assets, summary } = await graphReconstructor.reconstruct();

    // 3. Check Website Runtime
    const websiteState = await this.scanWebsite();

    // 4. Calculate deltas
    const canonical = {
      totalAssets: summary.totalAssets,
      imported: summary.published + summary.staged,
      new: summary.pending,
      changed: 0,
      deleted: 0,
    };
    const deltas = this.calculateDeltas(driveState, canonical, websiteState);

    const state: ReconciliationState = {
      drive: driveState,
      canonical,
      website: websiteState,
      deltas,
    };

    this.lastState = state;
    return state;
  }

  /**
   * Scan Google Drive for photos
   */
  private async scanDrive(): Promise<{
    totalPhotos: number;
    folders: number;
    lastSync: string;
  }> {
    try {
      const structure = await driveDiscovery.discoverStructure();
      
      let totalPhotos = 0;
      let folders = 0;

      // Count photos in HPP folders
      for (const folder of structure.hppFolders) {
        const files = await driveDiscovery.listFiles(folder.id);
        const photos = files.filter(f => 
          f.mimeType.startsWith('image/') || 
          /\.(jpg|jpeg|png|webp|avif|heic)$/i.test(f.name)
        );
        totalPhotos += photos.length;
        folders++;
      }

      return {
        totalPhotos,
        folders,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Drive scan error:', error);
      return {
        totalPhotos: 0,
        folders: 0,
        lastSync: 'never',
      };
    }
  }

  /**
   * Scan Website Runtime for published assets
   */
  private async scanWebsite(): Promise<{
    published: number;
    staged: number;
    pending: number;
    lastPublished: string;
  }> {
    // TODO: Scan actual website runtime / projections
    // For now, return placeholder values
    return {
      published: 0,
      staged: 0,
      pending: 0,
      lastPublished: 'never',
    };
  }

  /**
   * Calculate deltas between systems
   */
  private calculateDeltas(
    drive: { totalPhotos: number },
    canonical: { totalAssets: number; imported: number; new: number; changed: number; deleted: number },
    website: { published: number; staged: number; pending: number; lastPublished: string }
  ): {
    driveToCanonical: number;
    canonicalToWebsite: number;
    drift: number;
  } {
    const driveToCanonical = drive.totalPhotos - canonical.imported;
    const canonicalToWebsite = canonical.imported - website.published;
    const drift = Math.abs(driveToCanonical) + Math.abs(canonicalToWebsite);

    return {
      driveToCanonical,
      canonicalToWebsite,
      drift,
    };
  }

  /**
   * Get last reconciliation state
   */
  getLastState(): ReconciliationState | null {
    return this.lastState;
  }

  /**
   * Check if reconciliation is needed
   */
  needsReconciliation(): boolean {
    if (!this.lastState) return true;
    return this.lastState.deltas.drift > 0;
  }
}

export const reconciliationService = ReconciliationService.getInstance();
