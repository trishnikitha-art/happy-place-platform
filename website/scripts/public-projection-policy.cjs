// Filter a derived graph; never rewrite the immutable source evidence.
const visible = item => !item.hidden && !item.archived && item.status !== 'archived' && (item.publicationState === undefined || item.publicationState === 'published');
const ids = project => ['hero','before','after','gallery','details','progress'].flatMap(key => typeof project.media?.[key] === 'string' ? [project.media[key]] : Array.isArray(project.media?.[key]) ? project.media[key] : []);
function publicGraph(graph, projects, media, services) {
  const owners = new Map();
  for (const record of media) {
    const linked = projects.filter(project => project.id === record.projectId || ids(project).includes(record.id));
    for (const key of [record.id, record.filename]) {
      if (!key) continue;
      owners.set(key, [...(owners.get(key) || []), ...linked]);
    }
  }
  const nodes = graph.nodes.filter(node => {
    if (node.type !== 'image') return true;
    const mediaId=node.id==='homepage-hero-canonical'?'homepage-hero':node.id;
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
