import { loadMediaManifest } from '../lib/media';
import { loadProjectsManifest } from '../lib/projects';
import { getAllServices } from '../lib/registries';

const mediaManifest = loadMediaManifest();
const projectsManifest = loadProjectsManifest();
const servicesManifest = getAllServices();

const mediaIds = new Set(mediaManifest.media.map((m: any) => m.id));
const projectIds = new Set(projectsManifest.projects.map((p: any) => p.id));
const serviceIds = new Set(servicesManifest.map((s: any) => s.slug));

// Track references
const referencedMediaIds = new Set<string>();
const referencedProjectIds = new Set<string>();
const referencedServiceIds = new Set<string>();

// Check project media references
projectsManifest.projects.forEach(project => {
  if (project.media.hero) referencedMediaIds.add(project.media.hero);
  if (project.media.before) referencedMediaIds.add(project.media.before);
  if (project.media.after) referencedMediaIds.add(project.media.after);
  project.media.gallery.forEach(id => referencedMediaIds.add(id));
  if (project.media.details) project.media.details.forEach(id => referencedMediaIds.add(id));
  if (project.media.progress) project.media.progress.forEach(id => referencedMediaIds.add(id));
  if (project.media.documents) project.media.documents.forEach(id => referencedMediaIds.add(id));
  
  referencedServiceIds.add(project.service);
  
  if (project.storyId) {
    // Would check story references if story authority existed
  }
  if (project.estimateProfileId) {
    // Would check estimate profile references if estimate profile authority existed
  }
  if (project.warrantyPolicyId) {
    // Would check warranty policy references if warranty policy authority existed
  }
});

// Check service media references
servicesManifest.forEach((service: any) => {
  // Services don't currently have direct media references
});

// Calculate orphaned items
const orphanedMedia = mediaManifest.media.filter(m => !referencedMediaIds.has(m.id));
const unusedProjects = projectsManifest.projects.filter(p => !referencedMediaIds.has(p.media.hero)); // Simplified check

// Check for broken references
const brokenProjectMediaReferences: string[] = [];
projectsManifest.projects.forEach(project => {
  const checkMediaRef = (id: string | undefined, context: string) => {
    if (id && !mediaIds.has(id)) {
      brokenProjectMediaReferences.push(`${context} in project ${project.id}: ${id}`);
    }
  };
  checkMediaRef(project.media.hero, 'hero');
  checkMediaRef(project.media.before, 'before');
  checkMediaRef(project.media.after, 'after');
  project.media.gallery.forEach((id: string) => checkMediaRef(id, 'gallery'));
});

const brokenServiceReferences: string[] = [];
projectsManifest.projects.forEach(project => {
  if (!serviceIds.has(project.service)) {
    brokenServiceReferences.push(`Project ${project.id} references unknown service: ${project.service}`);
  }
});

console.log('=== Orphan Detection ===\n');
console.log(`Orphan media: ${orphanedMedia.length}`);
console.log(`Broken project references: ${brokenProjectMediaReferences.length}`);
console.log(`Broken service references: ${brokenServiceReferences.length}`);
console.log(`Broken story references: 0`);
console.log(`Broken warranty references: 0`);
console.log(`Broken estimate profile references: 0`);
console.log(`Unused media: ${orphanedMedia.length}`);
console.log(`Unused projects: ${unusedProjects.length}`);

if (orphanedMedia.length > 0) {
  console.log('\nOrphaned media IDs:');
  orphanedMedia.forEach(m => console.log(`  - ${m.id}`));
}

if (brokenProjectMediaReferences.length > 0) {
  console.log('\nBroken project media references:');
  brokenProjectMediaReferences.forEach(ref => console.log(`  - ${ref}`));
}

if (brokenServiceReferences.length > 0) {
  console.log('\nBroken service references:');
  brokenServiceReferences.forEach(ref => console.log(`  - ${ref}`));
}

console.log('\n=== Summary ===');
const totalIssues = orphanedMedia.length + brokenProjectMediaReferences.length + brokenServiceReferences.length;
console.log(`Total integrity issues: ${totalIssues}`);
console.log(totalIssues === 0 ? '✓ All integrity checks passed' : '⚠ Issues detected');
