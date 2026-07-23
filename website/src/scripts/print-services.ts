import { getAllServices } from '../lib/registries';

const services = getAllServices();

console.log('=== Service Registry ===\n');
services.forEach(s => {
  console.log(`✓ ${s.name} (slug: ${s.slug})`);
});
console.log(`\nTotal services: ${services.length}`);

// Verify specific services
const serviceSlugs = services.map(s => s.slug);
console.log('\n=== Verification ===');
console.log(`✓ Bathroom Remodeling: ${serviceSlugs.includes('bathrooms') ? 'PRESENT' : 'MISSING'}`);
console.log(`✓ Built-ins: ${serviceSlugs.includes('built-ins') ? 'PRESENT' : 'MISSING'}`);
console.log(`✓ Decks: ${serviceSlugs.includes('decks') ? 'PRESENT' : 'MISSING'}`);
console.log(`✓ Fences: ${serviceSlugs.includes('fences') ? 'PRESENT' : 'MISSING'}`);
console.log(`✓ Flooring: ${serviceSlugs.includes('flooring') ? 'PRESENT' : 'MISSING'}`);
console.log(`✓ Painting: ${serviceSlugs.includes('painting') ? 'PRESENT' : 'MISSING'}`);
console.log(`✓ Pergolas: ${serviceSlugs.includes('pergolas') ? 'PRESENT' : 'MISSING'}`);
console.log(`✓ Repairs: ${serviceSlugs.includes('repairs') ? 'PRESENT' : 'MISSING'}`);
console.log(`✓ Outdoor Living: ${serviceSlugs.includes('outdoor-living') ? 'PRESENT' : 'MISSING'}`);
console.log(`✓ Pole Barns: ${serviceSlugs.includes('pole-barns') ? 'PRESENT' : 'MISSING'}`);
console.log(`✓ ADUs: ${serviceSlugs.includes('adus') ? 'PRESENT' : 'MISSING'}`);

// Verify no unwanted services
console.log('\n=== Negative Verification ===');
console.log(`✓ no Kitchen service: ${!serviceSlugs.includes('kitchens') ? 'CONFIRMED' : 'FOUND'}`);
console.log(`✓ no "Other" / Uncategorized service: ${!serviceSlugs.includes('other') ? 'CONFIRMED' : 'FOUND'}`);
console.log(`✓ no duplicate Bathroom service: ${serviceSlugs.filter(s => s.includes('bathroom')).length === 1 ? 'CONFIRMED' : 'FOUND DUPLICATE'}`);
console.log(`✓ no duplicate Pergola service: ${serviceSlugs.filter(s => s.includes('pergola')).length === 1 ? 'CONFIRMED' : 'FOUND DUPLICATE'}`);
