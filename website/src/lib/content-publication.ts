import projects from '@/config/projects.v1.json';
import media from '@/config/media.v1.json';
import { isPublicContent, type PublicationFields } from './content-contract';

function mediaIds(project: {media:unknown}):string[] {
  const m=project.media as Record<string,unknown>;
  return ['hero','before','after','gallery','details','progress'].flatMap(key=>typeof m[key]==='string'?[m[key] as string]:Array.isArray(m[key])?m[key] as string[]:[]);
}
/** Placement policy; asset records and anonymous object URLs are not deleted. */
export function isMediaPlacementVisible(id:string,projectId?:string):boolean {
  const ownerId=projectId??media.media.find(record=>record.id===id)?.projectId;
  const owners=projects.projects.filter(project=>project.id===ownerId || mediaIds(project).includes(id));
  return !owners.length || owners.some(project=>isPublicContent(project as PublicationFields));
}
