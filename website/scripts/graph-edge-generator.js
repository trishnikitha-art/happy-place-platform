#!/usr/bin/env node

/**
 * Graph Edge Generator — Add Constitutional Edges to Existing Graph
 * 
 * Takes existing canonical-media-graph.json and adds:
 * - Project nodes (from filename patterns)
 * - belongsTo edges (Image → Project)
 * - supports edges (Image → Service)
 * 
 * This is Phase 1: Complete the media pipeline
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function calculateHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function loadGraph(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function saveGraph(graph, filePath) {
  const content = JSON.stringify(graph, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');
}

function generateProjectId(filename) {
  const match = filename.match(/^(HP\d+|Featured)/);
  if (match) {
    return match[1];
  }
  return 'Featured';
}

function generateServiceName(job) {
  if (!job) return 'other';
  
  const jobMap = {
    'fencing': 'Fencing',
    'painting': 'Painting',
    'drywall': 'Drywall Repair',
    'siding': 'Siding',
    'door': 'Door Replacement',
    'flooring': 'Flooring',
    'subfloor': 'Subfloor Replacement',
    'window': 'Window Installation',
    'shed': 'Shed Construction',
    'other': 'Other Services'
  };
  
  return jobMap[job.toLowerCase()] || 'Other Services';
}

function generateProjectNodes(graph) {
  const projects = new Map();
  
  for (const node of graph.nodes) {
    if (node.type !== 'image') continue;
    
    const filename = node.data.original_filename;
    const projectId = generateProjectId(filename);
    const projectName = projectId === 'Featured' ? 'Featured Projects' : `Project ${projectId}`;
    
    if (!projects.has(projectId)) {
      projects.set(projectId, {
        id: `project-${projectId.toLowerCase()}`,
        type: 'project',
        data: {
          name: projectName,
          legacyProjectNumber: projectId,
          displayName: projectName
        },
        created_at: new Date().toISOString()
      });
    }
  }
  
  return Array.from(projects.values());
}

function generateServiceNodes(graph) {
  const services = new Map();
  
  for (const node of graph.nodes) {
    if (node.type !== 'image') continue;
    
    const job = node.data.job;
    const serviceName = generateServiceName(job);
    
    if (!services.has(serviceName)) {
      services.set(serviceName, {
        id: `service-${serviceName.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'service',
        data: {
          name: serviceName,
          displayName: serviceName
        },
        created_at: new Date().toISOString()
      });
    }
  }
  
  return Array.from(services.values());
}

function generateBelongsToEdges(graph, projectNodes) {
  const edges = [];
  const projectMap = new Map(projectNodes.map(p => [p.legacyProjectNumber || p.data.name, p.id]));
  
  for (const node of graph.nodes) {
    if (node.type !== 'image') continue;
    
    const filename = node.data.original_filename;
    const projectId = generateProjectId(filename);
    const projectIdKey = projectId === 'Featured' ? 'Featured Projects' : `Project ${projectId}`;
    
    const projectNodeId = projectMap.get(projectIdKey);
    
    if (projectNodeId) {
      edges.push({
        from: node.id,
        to: projectNodeId,
        kind: 'belongsTo',
        properties: {
          role: node.data.category || 'gallery'
        }
      });
    }
  }
  
  return edges;
}

function generateSupportsEdges(graph, serviceNodes) {
  const edges = [];
  const serviceMap = new Map(serviceNodes.map(s => [s.data.name, s.id]));
  
  for (const node of graph.nodes) {
    if (node.type !== 'image') continue;
    
    const job = node.data.job;
    const serviceName = generateServiceName(job);
    
    const serviceNodeId = serviceMap.get(serviceName);
    
    if (serviceNodeId) {
      edges.push({
        from: node.id,
        to: serviceNodeId,
        kind: 'supports',
        properties: {
          role: node.data.category || 'example'
        }
      });
    }
  }
  
  return edges;
}

function main() {
  console.log('Graph Edge Generator');
  console.log('='.repeat(50));
  
  const ROOT = path.resolve(__dirname, '..');
  const GRAPH_PATH = path.resolve(ROOT, 'metadata/canonical-media-graph.json');
  
  console.log('Loading existing graph...');
  const graph = loadGraph(GRAPH_PATH);
  console.log(`  Current state: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  
  // Generate missing nodes
  console.log('Generating project nodes...');
  const projectNodes = generateProjectNodes(graph);
  console.log(`  Created ${projectNodes.length} project nodes`);
  
  console.log('Generating service nodes...');
  const serviceNodes = generateServiceNodes(graph);
  console.log(`  Created ${serviceNodes.length} service nodes`);
  
  // Add nodes to graph
  graph.nodes = [...graph.nodes, ...projectNodes, ...serviceNodes];
  
  // Generate constitutional edges
  console.log('Generating belongsTo edges...');
  const belongsToEdges = generateBelongsToEdges(graph, projectNodes);
  console.log(`  Created ${belongsToEdges.length} belongsTo edges`);
  
  console.log('Generating supports edges...');
  const supportsEdges = generateSupportsEdges(graph, serviceNodes);
  console.log(`  Created ${supportsEdges.length} supports edges`);
  
  // Add edges to graph
  graph.edges = [...graph.edges, ...belongsToEdges, ...supportsEdges];
  
  // Update graph metadata
  graph.generatedAt = new Date().toISOString();
  graph.generatedHash = 'sha256:' + calculateHash(JSON.stringify(graph));
  
  // Save updated graph
  console.log('Saving updated graph...');
  saveGraph(graph, GRAPH_PATH);
  
  console.log('\n' + '='.repeat(50));
  console.log('Graph edge generation complete!');
  console.log(`New state: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  console.log(`File: ${GRAPH_PATH}`);
}

main();
