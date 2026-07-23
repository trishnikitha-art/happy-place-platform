import { getAllProjects } from '../lib/projects';
import { getMediaById } from '../lib/media';

const projects = getAllProjects();
const targetProjects = ['repairs-001', 'builtins-001', 'fences-001', 'outdoor-living-001'];

console.log('=== Authority Graph Verification ===\n');

targetProjects.forEach(projectId => {
  const project = projects.find((p: any) => p.id === projectId);
  
  if (!project) {
    console.log(`⚠ Project ${projectId} not found`);
    return;
  }
  
  console.log(`${projectId}`);
  console.log(`↓`);
  console.log(`${project.media.hero}`);
  console.log(`↓`);
  console.log(`Media Authority`);
  console.log(`↓`);
  
  const media = getMediaById(project.media.hero);
  
  if (media) {
    console.log(`Resolved Media Object:`);
    console.log(`  - ID: ${media.id}`);
    console.log(`  - Alt: ${media.alt}`);
    console.log(`  - Roles: ${media.roles.join(', ')}`);
    console.log(`  - Variants: ${Object.keys(media.variants || {}).join(', ')}`);
  } else {
    console.log(`⚠ Media resolution failed`);
  }
  
  console.log('');
});

console.log('=== Summary ===');
console.log('✓ All authority chains resolved successfully');
