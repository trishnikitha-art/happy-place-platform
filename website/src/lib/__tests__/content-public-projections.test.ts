import {isPublicContent} from '../content-contract';
const {publicGraph,hiddenServiceNames,visible}=require('../../../scripts/public-projection-policy.cjs');
const graph={nodes:[{id:'hidden-photo',type:'image',data:{original_filename:'hidden.jpg'}},{id:'shared-photo',type:'image',data:{original_filename:'shared.jpg'}},{id:'project-node',type:'project',data:{}}],edges:[{from:'hidden-photo',to:'project-node',kind:'belongsTo'},{from:'shared-photo',to:'project-node',kind:'belongsTo'}]};
it('removes hidden-owned images and dangling projection edges without destroying evidence',()=>{const before=structuredClone(graph);const result=publicGraph(graph,[{id:'hidden',hidden:true,media:{hero:'hidden-id',gallery:['shared-id']}},{id:'visible',media:{gallery:['shared-id']}}],[{id:'hidden-id',filename:'hidden.jpg',projectId:'hidden'},{id:'shared-id',filename:'shared.jpg'}],[]);expect(result.nodes.map((x:any)=>x.id)).toEqual(['shared-photo','project-node']);expect(result.edges).toHaveLength(1);expect(graph).toEqual(before);});
it('blocks hidden services and their legacy category aliases',()=>{const names=hiddenServiceNames([{id:'fences',hidden:true},{id:'decks',publicationState:'draft'},{id:'painting',name:'Painting'}]);expect(names.has('fencing')).toBe(true);expect(names.has('deck')).toBe(true);expect(names.has('painting')).toBe(false);});
it.each([{}, {hidden:true},{publicationState:'draft'},{archived:true},{status:'archived'},{hidden:false,publicationState:'published'}])('matches runtime policy for %j',item=>expect(visible(item)).toBe(isPublicContent(item as never)));
it('includes publication changes in projection input provenance',()=>{expect(publicGraph(graph,[{id:'a',media:{}}],[],[])).not.toEqual(publicGraph(graph,[{id:'a',hidden:true,media:{}}],[],[]));});
it.each([{hidden:true},{archived:true},{publicationState:'draft'}])('blocks explicit hidden ownership when project media links are absent (%j)',state=>{
  const input={nodes:[{id:'photo',type:'image',data:{projectId:'private'}}],edges:[]};
  expect(publicGraph(input,[{id:'private',...state}],[],[]).nodes).toEqual([]);
});
it('uses graph ownership edges when the media record and project media list are missing',()=>{
  const input={nodes:[{id:'photo',type:'image',data:{}},{id:'private',type:'project',data:{}}],
    edges:[{from:'photo',to:'private',kind:'belongsTo'}]};
  expect(publicGraph(input,[{id:'private',hidden:true}],[],[]).nodes.map((node:any)=>node.id)).toEqual(['private']);
});
it('blocks malformed nested hidden media references even without a media record',()=>{
  const input={nodes:[{id:'photo',type:'image',data:{}}],edges:[]};
  expect(publicGraph(input,[{id:'private',archived:true,media:{hero:{mediaId:'photo'}}}],[],[]).nodes).toEqual([]);
});
it('fails closed on explicitly declared ownership that cannot be resolved',()=>{
  const input={nodes:[{id:'photo',type:'image',data:{projectId:'missing'}}],edges:[]};
  expect(publicGraph(input,[],[],[]).nodes).toEqual([]);
});
it('preserves intentional general media with no ownership declaration',()=>{
  const input={nodes:[{id:'brand-logo',type:'image',data:{}}],edges:[]};
  expect(publicGraph(input,[],[],[]).nodes).toEqual(input.nodes);
});
it('does not turn historical filename groups into unknown catalog ownership',()=>{
  const input={nodes:[{id:'photo',type:'image',data:{}},
    {id:'project-hp001',type:'project',data:{legacyProjectNumber:'HP001'}}],
    edges:[{from:'photo',to:'project-hp001',kind:'belongsTo'}]};
  expect(publicGraph(input,[],[],[]).nodes).toHaveLength(2);
});
