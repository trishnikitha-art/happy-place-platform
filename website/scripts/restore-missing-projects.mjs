/**
 * Restore missing projects from filesystem to authority
 * Scans /public/images/projects/ for directories not in projects.v1.json
 * Creates project records with media based on actual images found
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const projectsPath = join(process.cwd(), 'public/images/projects');
const projectsJsonPath = join(process.cwd(), 'src/config/projects.v1.json');
const mediaJsonPath = join(process.cwd(), 'src/config/media.v1.main.json');

// Load existing projects
const projectsData = JSON.parse(readFileSync(projectsJsonPath, 'utf-8'));
const existingProjectIds = new Set(projectsData.projects.map(p => p.id));

// Load existing media
const mediaData = JSON.parse(readFileSync(mediaJsonPath, 'utf-8'));
const existingMediaIds = new Set(mediaData.media.map(m => m.id));

// Get all directories in projects
const directories = readdirSync(projectsPath, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`Found ${directories.length} directories in /public/images/projects/`);
console.log(`Existing projects in authority: ${existingProjectIds.size}`);
console.log(`Existing media in authority: ${existingMediaIds.size}\n`);

// Find missing projects (exclude non-project directories like hero, portrait, featured)
const nonProjectDirs = ['hero', 'portrait', 'featured', 'repairs'];
const missingProjects = directories.filter(dir => 
  !existingProjectIds.has(dir) && !nonProjectDirs.includes(dir)
);

console.log(`Missing projects to restore: ${missingProjects.length}`);
console.log(missingProjects);

// For each missing project, scan images and create records
const newProjects = [];
const newMedia = [];

for (const projectName of missingProjects) {
  const projectDir = join(projectsPath, projectName);
  const imageFiles = readdirSync(projectDir).filter(f => 
    f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp')
  );

  if (imageFiles.length === 0) {
    console.log(`  Skipping ${projectName} - no images found`);
    continue;
  }

  console.log(`\nProcessing ${projectName}:`);
  console.log(`  Found ${imageFiles.length} images`);

  // Create project ID from directory name
  const projectId = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // Determine service from directory name
  const serviceMap = {
    'bathroom-remodeling': 'bathroom-remodeling',
    'built-ins': 'built-ins',
    'davis-bathroom-remodel': 'bathroom-remodeling',
    'fences': 'fences',
    'johnson-cedar-fence': 'fences',
    'martinez-pergola': 'pergolas',
    'outdoor-living': 'outdoor-living',
    'pergolas': 'pergolas',
    'repairs': 'repairs',
    'smith-built-ins': 'built-ins',
    'wilson-home-repairs': 'repairs',
    'test-project-corvallis': 'test-project'
  };

  const service = serviceMap[projectName] || 'custom';

  // Create media records for images
  const galleryMediaIds = [];
  let heroMediaId = null;

  for (const [index, imageFile] of imageFiles.entries()) {
    const imageId = `${projectId}-${index}`;
    const filePath = join(projectDir, imageFile);
    
    // Get file stats
    const stats = statSync(filePath);
    
    // Create media record
    const mediaRecord = {
      id: imageId,
      filename: imageFile,
      type: 'image',
      orientation: 'landscape', // Default
      dimensions: {
        width: 1920,
        height: 1080
      },
      variants: {
        original: `/images/projects/${projectName}/${imageFile}`,
        web: `/images/projects/${projectName}/${imageFile}`,
        webp: `/images/projects/${projectName}/${imageFile}`,
        thumbnail: `/images/projects/${projectName}/${imageFile}`
      },
      alt: `${projectName} - ${imageFile}`,
      service: service,
      city: 'Corvallis',
      county: 'Benton',
      state: 'Oregon',
      projectId: projectId,
      tags: [service],
      roles: index === 0 ? ['hero', 'gallery'] : ['gallery'],
      createdAt: stats.mtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
      fileSize: stats.size,
      lifecycleState: 'published',
      source: 'local',
      contentHash: 'placeholder-hash' // Will be computed by hash script
    };

    newMedia.push(mediaRecord);
    galleryMediaIds.push(imageId);

    if (index === 0) {
      heroMediaId = imageId;
    }
  }

  // Create project record
  const projectRecord = {
    id: projectId,
    title: projectName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    service: service,
    status: 'completed',
    location: {
      city: 'Corvallis',
      county: 'Benton',
      state: 'Oregon'
    },
    completionDate: new Date().toISOString().split('T')[0],
    media: {
      hero: heroMediaId,
      gallery: galleryMediaIds,
      galleryRevision: 0
    },
    story: {
      challenge: 'Project completed',
      solution: 'Professional carpentry work',
      outcome: 'Quality craftsmanship delivered'
    },
    estimate: {
      estimatedRange: { low: 2000, high: 10000 },
      services: [service],
      materials: ['custom'],
      timeline: '1-2 weeks'
    },
    tags: [service],
    featured: false,
    heroEligible: true,
    homepageEligible: false,
    slug: projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  newProjects.push(projectRecord);
  console.log(`  Created project: ${projectId} with ${galleryMediaIds.length} media records`);
}

// Update projects.json
projectsData.projects.push(...newProjects);
writeFileSync(projectsJsonPath, JSON.stringify(projectsData, null, 2));
console.log(`\n✓ Updated projects.v1.json with ${newProjects.length} new projects`);

// Update media.v1.main.json
mediaData.media.push(...newMedia);
writeFileSync(mediaJsonPath, JSON.stringify(mediaData, null, 2));
console.log(`✓ Updated media.v1.main.json with ${newMedia.length} new media records`);

console.log(`\nTotal projects: ${projectsData.projects.length}`);
console.log(`Total media: ${mediaData.media.length}`);
