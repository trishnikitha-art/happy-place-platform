import { archiveKey, archiveSnapshot, moveArchive } from '../archive-order';
import { applyContentMutation, contentSnapshot, decodeContentMutation, type ContentCatalog, type ContentMutation } from '../content-contract';

const catalog = (): ContentCatalog => ({projects:[
  {id:'fence',media:{gallery:['a','hidden']},provenance:{source:'Drive'}},
  {id:'deck',media:{gallery:['b','c']},story:{challenge:'Keep the story'}}
]});
function change(data:ContentCatalog):ContentMutation {
  const previous=archiveSnapshot(data),rows=contentSnapshot(data,'projects');
  return {schema:'content.v1',collection:'projects',expectedRevision:0,previous:rows,next:rows,
    archive:{previous,next:moveArchive(previous,archiveKey('deck','c'),archiveKey('fence','a'))}};
}
it('moves the final photo across projects to the first position and shifts others without changing ownership',()=>{
  const data=catalog(),original=structuredClone(data.projects),mutation=change(data);
  applyContentMutation(data,mutation);
  expect(archiveSnapshot(data)).toEqual(['deck::c','fence::a','fence::hidden','deck::b'].map(id=>'our-work-gallery::'+id));
  expect(data.projects!.map(({hidden,order,...project})=>project)).toEqual(original);
  expect(data.editorialRevision).toBe(1);
});
it('rejects injected, missing, duplicate and foreign project references',()=>{
  for(const next of [['evil'],[archiveKey('deck','c')],Array(4).fill(archiveKey('deck','c'))]) {
    const data=catalog(),mutation=change(data);mutation.archive!.next=next;
    expect(()=>decodeContentMutation(mutation)).toThrow('INVALID_ARCHIVE_ORDER');
  }
});
it('fails closed when membership or the previous archive changes, without partially changing content',()=>{
  const data=catalog(),mutation=change(data);
  (data.projects![1].media as {gallery:string[]}).gallery.push('new');
  const original=structuredClone(data);expect(()=>applyContentMutation(data,mutation)).toThrow('ARCHIVE_REVISION_CONFLICT');expect(data).toEqual(original);
});
it('retains hidden refs and appends newly assigned photos without promoting them',()=>{
  const data=catalog();data.archiveOrder=change(data).archive!.next;
  (data.projects![0].media as {gallery:string[]}).gallery.push('new');
  expect(archiveSnapshot(data).at(-1)).toBe(archiveKey('fence','new'));
  expect(archiveSnapshot(data)).toContain(archiveKey('fence','hidden'));
});
it('accumulates arbitrarily distant moves and can restore its baseline before staging',()=>{
  const base=archiveSnapshot(catalog());const first=moveArchive(base,base[3],base[0]);
  expect(moveArchive(first,base[3],base[2])).toEqual(base);
  expect(()=>moveArchive(base,'foreign',base[0])).toThrow('no longer');
});
