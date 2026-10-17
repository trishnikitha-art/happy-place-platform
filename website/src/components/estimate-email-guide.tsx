'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Copy, Mail } from 'lucide-react';
import { estimateService } from '@/services/estimate';
import { estimateGuideErrors, makeEstimateEmailRequest, type EstimateGuideValues } from '@/lib/estimate-email-guide';
import { analytics } from '@/services/analytics';

interface Props {
  services: { slug: string; name: string }[];
  initialService?: string;
  project?: { title: string; href: string };
  email: string;
  phone: string;
  phoneDisplay: string;
}
const steps = ['Your project', 'Your details', 'Review & email'];

export function EstimateEmailGuide({ services, initialService = '', project, email, phone, phoneDisplay }: Props) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<EstimateGuideValues>({ service: initialService, notes: '', city: '', name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copyState, setCopyState] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(0);
  useEffect(() => {
    if (step !== previousStep.current) heading.current?.focus({ preventScroll: true });
    previousStep.current = step;
  }, [step]);
  const update = (key: keyof EstimateGuideValues, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: '' }));
    setCopyState('');
  };
  function next(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = estimateGuideErrors(step, values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => document.getElementById('estimate-' + Object.keys(nextErrors)[0])?.focus());
      return;
    }
    if (step === 0) analytics.trackEstimateStarted(values.service || undefined);
    setStep(current => Math.min(2, current + 1));
  }
  const prepared = step === 2 ? estimateService.prepare(makeEstimateEmailRequest(values, project?.title), true) : null;
  const href = prepared?.kind === 'mailto' ? prepared.href : null;
  const summary = href ? new URL(href).searchParams.get('body') || '' : '';
  async function copy() {
    try { await navigator.clipboard.writeText(summary); setCopyState('Copied. Paste the details into your email.'); }
    catch { setCopyState('Copy is unavailable here. Select the project details below and copy them manually.'); }
  }
  function field(key: keyof EstimateGuideValues, label: string, type = 'text', optional = false) {
    return <div><label htmlFor={'estimate-' + key} className="mb-2 block text-sm font-medium">{label}{optional && <span className="ml-2 font-normal text-text-subtle">(optional)</span>}</label><input id={'estimate-' + key} className="craft-field" type={type} autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'address-level2'} value={values[key]} maxLength={key === 'email' ? 254 : 120} onChange={event => update(key, event.target.value)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? 'estimate-' + key + '-error' : undefined} required={!optional} />{errors[key] && <p id={'estimate-' + key + '-error'} className="mt-2 text-sm text-error">{errors[key]}</p>}</div>;
  }
  return <div className="border border-border-soft bg-background p-5 sm:p-9 lg:p-12">
    <ol aria-label="Estimate steps" className="mb-9 flex justify-between gap-3 border-b border-border-soft pb-6">
      {steps.map((label, index) => <li key={label} className="flex flex-1 flex-col gap-2 text-[10px] leading-snug sm:text-xs" aria-current={step === index ? 'step' : undefined}><span className={'craft-step ' + (index <= step ? 'bg-primary text-white' : 'text-text-subtle')}>{index < step ? <Check size={14} aria-hidden="true" /> : index + 1}</span><span className={index === step ? 'font-semibold text-primary' : 'text-text-subtle'}>{label}</span></li>)}
    </ol>
    <h2 ref={heading} tabIndex={-1} className="font-display text-3xl leading-tight text-primary outline-none sm:text-4xl">{step === 0 ? 'What would make home feel better?' : step === 1 ? 'How can we reach you?' : 'Your email draft is ready.'}</h2>
    {project && <p className="mt-4 text-sm text-text-muted">Inspired by <Link className="underline underline-offset-4" href={project.href}>{project.title}</Link>. You can describe a different idea below.</p>}
    {step < 2 ? <form onSubmit={next} noValidate className="mt-7 space-y-6">
      {step === 0 ? <>
        <div><label htmlFor="estimate-service" className="mb-2 block text-sm font-medium">What kind of help do you need?</label><select id="estimate-service" className="craft-field" value={values.service} onChange={event => update('service', event.target.value)}><option value="">I’d like help choosing</option>{services.map(service => <option key={service.slug} value={service.slug}>{service.name}</option>)}</select></div>
        <div><label htmlFor="estimate-notes" className="mb-2 block text-sm font-medium">Tell us about the project</label><textarea id="estimate-notes" className="craft-field min-h-36 resize-y" rows={5} maxLength={1200} value={values.notes} placeholder="What would you like to repair, restore or improve?" onChange={event => update('notes', event.target.value)} aria-invalid={!!errors.notes} aria-describedby={'estimate-notes-help' + (errors.notes ? ' estimate-notes-error' : '')} required /><p id="estimate-notes-help" className="mt-2 text-xs leading-relaxed text-text-subtle">A short introduction is enough. You can attach photographs in your email app.</p>{errors.notes && <p id="estimate-notes-error" className="mt-2 text-sm text-error">{errors.notes}</p>}</div>
        {field('city', 'Project city or town')}
      </> : <>{field('name', 'Your name')}{field('email', 'Email address', 'email')}{field('phone', 'Phone number', 'tel', true)}<p className="text-xs leading-relaxed text-text-subtle">These details are for your project conversation. Newsletter signup is always separate. <Link href="/privacy" className="underline underline-offset-4">Privacy</Link></p></>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-6">{step > 0 ? <button type="button" className="craft-link" onClick={() => { setErrors({}); setStep(0); }}><ArrowLeft size={15} aria-hidden="true" /> Back</button> : <span className="max-w-48 text-xs leading-relaxed text-text-subtle">Prepare an email, then review and send it yourself.</span>}<button type="submit" className="craft-button">{step === 0 ? 'Your details' : 'Review the email'} <ArrowRight size={16} aria-hidden="true" /></button></div>
    </form> : <div className="mt-6">
      <p className="text-sm leading-relaxed text-text-muted">The next step opens your email app. Review the draft, add any photos, and press Send there. Your request has not been sent from this website.</p>
      <div className="mt-6 flex flex-wrap gap-3">{href && <a href={href} className="craft-button"><Mail size={17} aria-hidden="true" /> Open email draft</a>}<button type="button" onClick={copy} className="craft-button craft-button--outline"><Copy size={15} aria-hidden="true" /> Copy details</button></div>
      <p role="status" className="mt-3 text-sm">{copyState}</p>
      <p className="mt-4 text-xs leading-relaxed text-text-subtle">No email app? Copy the details and email <a className="underline underline-offset-4" href={'mailto:' + email}>{email}</a>, or call <a className="underline underline-offset-4" href={'tel:' + phone}>{phoneDisplay}</a>.</p>
      <details className="mt-6 border-y border-border-soft py-3"><summary className="cursor-pointer py-2 text-sm font-semibold">Review your project details</summary><pre className="mt-3 whitespace-pre-wrap break-words font-sans text-xs leading-relaxed">{summary}</pre></details>
      <button type="button" className="craft-link mt-4" onClick={() => setStep(0)}><ArrowLeft size={15} aria-hidden="true" /> Edit the project</button>
      <div className="mt-8 border-t border-border-soft pt-6"><p className="text-sm font-medium">Still gathering ideas?</p><Link href="/newsletter?source=estimate" className="craft-link text-primary">Explore the Happy Place email list <ArrowRight size={15} aria-hidden="true" /></Link><p className="mt-1 text-xs text-text-subtle">Optional, with its own signup. Preparing an estimate does not subscribe you.</p></div>
    </div>}
  </div>;
}
