'use client';
import { useEffect,useRef,useState,type ReactNode } from 'react';
export interface ItemAction { label:string;run:()=>void;disabled?:boolean }
export function ItemMenu({name,actions,children,disabled=false}:{name:string;actions:ItemAction[];children:ReactNode;disabled?:boolean}) {
  const [point,setPoint]=useState<{x:number;y:number}|null>(null);
  const menu=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=> {
    if(!point) return;
    (menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')??menu.current)?.focus();
    const dismiss=(event:PointerEvent)=>{if(!menu.current?.contains(event.target as Node)) setPoint(null);};
    const close=()=>setPoint(null);
    document.addEventListener('pointerdown',dismiss);window.addEventListener('resize',close);window.addEventListener('scroll',close,true);
    return ()=>{document.removeEventListener('pointerdown',dismiss);window.removeEventListener('resize',close);window.removeEventListener('scroll',close,true);};
  },[point]);
  function open(x:number,y:number) {if(!disabled) setPoint({x:Math.max(8,Math.min(x,document.documentElement.clientWidth-248)),y:Math.max(8,Math.min(y,document.documentElement.clientHeight-(actions.length*48+16)))});}
  function close() {setPoint(null);trigger.current?.focus();}
  return <div onContextMenu={event=>{if(!disabled){event.preventDefault();open(event.clientX,event.clientY);}}}>
    <div className="flex items-center gap-3"><div className="min-w-0 flex-1">{children}</div><button ref={trigger} type="button" aria-label={`Actions for ${name}`} aria-haspopup="menu" aria-expanded={!!point} disabled={disabled} className="min-h-11 min-w-11 rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40" onClick={event=>{const rect=event.currentTarget.getBoundingClientRect();if(point) close();else open(rect.left,rect.bottom);}}>•••</button></div>
    {point && <div ref={menu} role="menu" tabIndex={-1} aria-label={`Actions for ${name}`} className="fixed z-[150] w-60 max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-background p-1 shadow-2xl" data-lenis-prevent style={{left:point.x,top:point.y}} onKeyDown={event=>{
      if(event.key==='Escape' || event.key==='Tab') {if(event.key==='Escape')event.preventDefault();close();return;}
      const buttons=[...menu.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
      if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {event.preventDefault();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}
    }}>{actions.map(action=><button key={action.label} role="menuitem" type="button" disabled={action.disabled} className="block min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-primary/10 focus:bg-primary/10 focus:outline-2 focus:outline-primary disabled:opacity-40" onClick={()=>{close();action.run();}}>{action.label}</button>)}</div>}
  </div>;
}
