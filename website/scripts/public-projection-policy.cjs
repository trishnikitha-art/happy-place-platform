// Filter a derived graph; never rewrite the immutable source evidence.
const visible = item => !item.hidden && !item.archived && item.status !== 'archived' && (item.publicationState === undefined || item.publicationState === 'published');
// Recover explicit IDs even from malformed nested media links; never guess ownership from filenames.
function mediaIds(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(mediaIds);
  if (value && typeof value === 'object') return Object.values(value).flatMap(mediaIds);
  return [];
}
const ids = project => mediaIds(project.media);
function publicGraph(graph, projects, media, services) {
  const owners = new Map();
  const projectById = new Map(projects.map(project => [project.id, project]));
  const unresolved = { hidden: true };
  const addOwner = (key, project) => {
    if (typeof key !== 'string' || !key) return;
    owners.set(key, [...(owners.get(key) || []), project || unresolved]);
  };
  for (const project of projects) for (const id of ids(project)) addOwner(id, project);
  for (const record of media) {
    const linked = projects.filter(project => project.id === record.projectId || ids(project).includes(record.id));
    for (const key of [record.id, record.filename]) {
      if (!key) continue;
      owners.set(key, [...(owners.get(key) || []), ...linked]);
      if (record.projectId && !projectById.has(record.projectId)) addOwner(key, unresolved);
    }
  }
  // Historical filename-group nodes are not catalog ownership declarations.
  const graphProjects = new Map(graph.nodes.filter(node => node.type === 'project' &&
    !(node.data?.legacyProjectNumber !== undefined && !node.data?.projectId && !node.data?.project_id && !projectById.has(node.id))).map(node =>
    [node.id, projectById.get(node.data?.projectId || node.data?.project_id || node.id) || unresolved]));
  for (const edge of graph.edges) {
    if (edge.kind === 'belongsTo' && graphProjects.has(edge.to)) addOwner(edge.from, graphProjects.get(edge.to));
  }
  const nodes = graph.nodes.filter(node => {
    if (node.type !== 'image') return true;
    const mediaId=node.id==='homepage-hero-canonical'?'homepage-hero':node.id;
    const declaredOwner = node.data?.projectId || node.data?.project_id;
    if (declaredOwner) addOwner(mediaId, projectById.get(declaredOwner));
    const linked = [...(owners.get(mediaId) || []), ...(owners.get(node.data?.original_filename) || [])];
    return !linked.length || linked.some(visible);
  });
  const retained = new Set(nodes.map(node => node.id));
  return {...graph, publicationCatalog:{projects:projects.map(({id,hidden,publicationState,archived,status,order})=>({id,hidden,publicationState,archived,status,order})),services:services.map(({id,hidden,publicationState,archived,order})=>({id,hidden,publicationState,archived,order}))},nodes,edges:graph.edges.filter(edge=>retained.has(edge.from)&&retained.has(edge.to))};
}
function hiddenServiceNames(services) {
  const aliases={fences:['fencing','fence'],decks:['deck'],pergolas:['pergola'],painting:['exterior-painting']};
  return new Set(services.filter(item=>!visible(item)).flatMap(item=>[item.id,item.slug,item.name?.toLowerCase(),...(aliases[item.id]||[])]).filter(Boolean));
}
module.exports={publicGraph,hiddenServiceNames,visible};
