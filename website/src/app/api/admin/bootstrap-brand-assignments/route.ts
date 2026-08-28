/**
 * Bootstrap Brand Assignments API
 *
 * Direct runtime assignment creation for brand media (brand-hero, brand-portrait)
 * Bypasses Workbench staging to ensure homepage has working media immediately
 *
 * POST /api/admin/bootstrap-brand-assignments
 * Body: { brandHeroMediaId: string, brandPortraitMediaId: string }
 */

import { NextResponse } from 'next/server';
import { storeServiceCardAssignment, getServiceCardAssignment } from '@/lib/assignment-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { brandHeroMediaId, brandPortraitMediaId } = body;

    if (!brandHeroMediaId || !brandPortraitMediaId) {
      return NextResponse.json(
        { error: 'MISSING_MEDIA_IDS', message: 'Both brandHeroMediaId and brandPortraitMediaId are required' },
        { status: 400 }
      );
    }

    console.log('[BOOTSTRAP_BRAND] Creating direct runtime assignments', {
      brandHeroMediaId,
      brandPortraitMediaId,
    });

    // Get current assignments for CAS
    const currentHeroAssignment = await getServiceCardAssignment('brand-hero', 'bootstrap');
    const currentPortraitAssignment = await getServiceCardAssignment('brand-portrait', 'bootstrap');

    const heroExpectedRevision = currentHeroAssignment?.revision ?? 0;
    const portraitExpectedRevision = currentPortraitAssignment?.revision ?? 0;

    // Create brand-hero assignment
    const heroAssignment = {
      serviceSlug: 'brand-hero',
      mediaId: brandHeroMediaId,
      updatedAt: new Date().toISOString(),
      source: 'bootstrap' as const,
      revision: heroExpectedRevision + 1,
    };

    await storeServiceCardAssignment(heroAssignment, heroExpectedRevision, 'bootstrap');
    console.log('[BOOTSTRAP_BRAND] BRAND_HERO_ASSIGNMENT_CREATED', {
      serviceSlug: 'brand-hero',
      mediaId: brandHeroMediaId,
      revision: heroAssignment.revision,
    });

    // Create brand-portrait assignment
    const portraitAssignment = {
      serviceSlug: 'brand-portrait',
      mediaId: brandPortraitMediaId,
      updatedAt: new Date().toISOString(),
      source: 'bootstrap' as const,
      revision: portraitExpectedRevision + 1,
    };

    await storeServiceCardAssignment(portraitAssignment, portraitExpectedRevision, 'bootstrap');
    console.log('[BOOTSTRAP_BRAND] BRAND_PORTRAIT_ASSIGNMENT_CREATED', {
      serviceSlug: 'brand-portrait',
      mediaId: brandPortraitMediaId,
      revision: portraitAssignment.revision,
    });

    return NextResponse.json({
      success: true,
      message: 'Brand assignments bootstrapped successfully',
      assignments: {
        brandHero: heroAssignment,
        brandPortrait: portraitAssignment,
      },
    });
  } catch (error) {
    console.error('[BOOTSTRAP_BRAND] ERROR', error);
    return NextResponse.json(
      {
        error: 'BOOTSTRAP_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}