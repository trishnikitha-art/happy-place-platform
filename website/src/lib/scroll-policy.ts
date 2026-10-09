export function usesNativeScroll(pathname: string, search = ''): boolean {
  return ['/workbench','/our-work','/services','/projects'].some(root => pathname === root || pathname.startsWith(root+'/')) || new URLSearchParams(search).get('workbench') === 'true';
}
export function previewHref(href: string, origin: string): string | null {
  let url:URL;try {url=new URL(href,origin);} catch {return null;}
  if(url.origin!==origin || !['/','/about','/reviews','/estimate','/services','/our-work','/projects'].some(root=>url.pathname===root || (root!=='/' && url.pathname.startsWith(root+'/')))) return null;
  return `/workbench/preview${url.pathname==='/'?'':url.pathname}?workbench=true${url.hash}`;
}
