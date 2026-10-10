import type { ReactNode } from 'react';
import { Container, Section } from '@/components/section';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`loading-skeleton rounded bg-current/10 ${className}`} />;
}

function LoadingRegion({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <div aria-busy="true" aria-label={label} className={className}>
    <p role="status" className="sr-only">{label}</p>
    <div aria-hidden="true" className="min-w-0 w-full">{children}</div>
  </div>;
}

function HeadingSkeleton() {
  return <div className="max-w-2xl space-y-5">
    <Skeleton className="h-4 w-36" />
    <Skeleton className="h-12 w-4/5 sm:h-14" />
    <Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-3/4" />
  </div>;
}

export function PublicPageLoading({ kind }: { kind: 'work' | 'project' | 'service' | 'reviews' }) {
  const label = { work: 'Loading our work', project: 'Loading project', service: 'Loading service', reviews: 'Loading reviews' }[kind];
  return <LoadingRegion label={label} className="bg-deep text-text-on-dark">
    {kind === 'project' ? <div className="bg-secondary text-secondary-foreground"><Container className="py-20"><HeadingSkeleton /></Container></div>
      : <Section className={kind === 'work' ? 'py-24 sm:py-24' : ''}><Container>
        {kind === 'reviews' ? <div className="mx-auto max-w-2xl space-y-6 text-center">
          <Skeleton className="mx-auto h-10 w-32" />
          <Skeleton className="mx-auto h-4 w-36" /><Skeleton className="mx-auto h-14 w-4/5" />
          <Skeleton className="h-6 w-full" /><Skeleton className="mx-auto h-12 w-48" />
          <Skeleton className="mx-auto h-5 w-3/4" />
        </div> : <><HeadingSkeleton />{kind === 'service' && <Skeleton className="mt-8 h-12 w-52 rounded-full" />}</>}
      </Container></Section>}
    <Section><Container>
      {kind !== 'reviews' && <HeadingSkeleton />}
      {kind === 'reviews' ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <div key={index} className="space-y-5 rounded-xl bg-white/5 p-7">
          <Skeleton className="h-5 w-28" /><Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-24 w-full" /><Skeleton className="h-5 w-1/2" />
        </div>)}
      </div> : kind === 'project' ? <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-52" />
      </div> : <div className={`mt-10 grid gap-6 ${kind === 'work' ? 'md:grid-cols-2' : ''}`}>
        {Array.from({ length: kind === 'work' ? 2 : 1 }, (_, index) => <Skeleton key={index} className="aspect-[16/9] w-full" />)}
      </div>}
    </Container></Section>
  </LoadingRegion>;
}

export function PhotoGridLoading({ label = 'Loading photos', list = false, columns = 'grid-cols-2 xl:grid-cols-3', fileCards = false, compact = true }: { label?: string; list?: boolean; columns?: string; fileCards?: boolean; compact?: boolean }) {
  return <LoadingRegion label={label} className="text-foreground">
    <div className={list ? 'space-y-2' : `grid gap-3 ${columns}`}>
      {Array.from({ length: 6 }, (_, index) => list
        ? <div key={index} className={`flex items-center gap-3 rounded-lg border border-border ${compact ? 'p-3' : 'p-4'}`}><Skeleton className={`${compact ? 'h-12 w-12' : 'h-16 w-16'} shrink-0`} /><div className="w-2/3"><Skeleton className="h-5" />{!compact && <Skeleton className="mt-1 h-4 w-1/2" />}</div></div>
        : fileCards ? <div key={index} className={`rounded-lg border border-border ${compact ? 'p-3' : 'p-4'}`}><Skeleton className="aspect-square w-full" /><Skeleton className="mt-2 h-5 w-4/5" /><Skeleton className="mt-1 h-4 w-1/2" /></div>
        : <Skeleton key={index} className="aspect-[4/3] w-full" />)}
    </div>
  </LoadingRegion>;
}

// No preview, source data, or enabled editing controls are rendered before authorization.
export function MediaWorkbenchLoading({ label = 'Loading website editor', navigation = false }: { label?: string; navigation?: boolean }) {
  return <LoadingRegion label={label} className="flex min-h-dvh min-w-0 bg-background text-foreground">
    <div className="flex min-h-dvh min-w-0 w-full">
      {navigation && <div className="w-16 shrink-0 border-r border-border bg-muted p-3 space-y-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>}
      <div className="min-w-0 flex-1">
        <div className="border-b border-border px-4 py-2"><Skeleton className="h-7 w-44" /></div>
        <div className="border-b border-border p-4"><Skeleton className="h-10 w-2/3 max-w-lg" /></div>
        <div className="grid min-h-[calc(100dvh-120px)] grid-cols-1 lg:grid-cols-2">
          <div className="min-h-[420px] border-r border-border p-6 bg-white"><Skeleton className="aspect-[16/9] w-full" /><Skeleton className="mt-8 h-10 w-2/3" /><Skeleton className="mt-5 h-5 w-3/4" /></div>
          <div className="p-4"><Skeleton className="mb-4 h-11" /><Skeleton className="mb-4 h-8" />
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="aspect-[4/3]" />)}</div>
          </div>
        </div>
      </div>
    </div>
  </LoadingRegion>;
}
