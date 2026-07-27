"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Upload, Send } from "lucide-react";
import type { EstimateRequest, Service, EstimateQuestion } from "@/types";
import { getAllServices, getAllCities } from "@/lib/registries";
import { getCompany } from "@/lib/company";
import { estimateService } from "@/services/estimate";
import { analytics } from "@/services/analytics";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  saveWizardState, 
  loadWizardState, 
  clearWizardState, 
  hasDraft, 
  createAutosave,
  validateSubmissionIntegrity,
  type WizardState 
} from "@/lib/wizard-persistence";
import { preliminaryRange, formatRange } from "@/lib/planning-range";

type PhotoMeta = { name: string; size: number; uploadedAt?: number; data?: string; file?: File };

const ALL_STEPS = ["Service", "Tell us about your project", "Photos", "Project Details", "Property", "Contact", "Thank You"] as const;
const MAX_SERVICES = 3;
const PROJECT_TYPES = ["Build something new", "Restore / Repair existing", "Paint / Stain / Refinish existing", "I'm not sure yet"] as const;

export function EstimateWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillService = searchParams.get("service") ?? "";
  const stepParam = searchParams.get("step");

  // Load services and cities from adapters
  const services = getAllServices();
  const cities = getAllCities();
  // Derive counties from cities (group by county)
  const counties = React.useMemo(() => {
    const countyMap = new Map<string, Set<string>>();
    cities.forEach(city => {
      if (!countyMap.has(city.county)) {
        countyMap.set(city.county, new Set());
      }
      countyMap.get(city.county)!.add(city.name);
    });
    return Array.from(countyMap.entries()).map(([name, cities]) => ({
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      cities: Array.from(cities)
    }));
  }, [cities]);

  // Check for existing draft immediately during initialization
  // This ensures state is initialized with draft data if available
  const initialDraft = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("estimate-wizard-draft");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (parsed.updatedAt > weekAgo && !parsed.submitted) {
        return parsed as WizardState;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Track if this is a restored session (page refresh or browser reopen)
  // Only show recovery dialog after a refresh/reopen, not on initial navigation
  const isRestoredSession = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    const hasVisited = sessionStorage.getItem("estimate-wizard-visited");
    if (hasVisited) {
      return true;
    }
    sessionStorage.setItem("estimate-wizard-visited", "true");
    return false;
  }, []);

  const [showDraftRecovery, setShowDraftRecovery] = React.useState(false);
  const [draftState, setDraftState] = React.useState<WizardState | null>(initialDraft);

  const [step, setStep] = React.useState(() => {
    // If draft exists, use its step
    if (initialDraft) return initialDraft.step;
    // Otherwise use URL param or default
    const initialStep = stepParam ? ALL_STEPS.indexOf(stepParam as any) : 0;
    return initialStep >= 0 ? initialStep : 0;
  });
  const [selected, setSelected] = React.useState<string[]>(() => {
    // If draft exists, use its selected services
    if (initialDraft) return initialDraft.selected;
    // Otherwise use prefill or empty
    return prefillService && services.some((s) => s.slug === prefillService) ? [prefillService] : [];
  });
  const [projectType, setProjectType] = React.useState(() => initialDraft?.projectType ?? "");
  const [otherNeed, setOtherNeed] = React.useState(() => initialDraft?.otherNeed ?? "");
  const [answers, setAnswers] = React.useState<Record<string, string | boolean | number>>(() => initialDraft?.answers ?? {});
  const [photos, setPhotos] = React.useState<PhotoMeta[]>(() => initialDraft?.photos ?? []);
  const [property, setProperty] = React.useState(() => initialDraft?.property ?? { address: "", city: "", county: "", details: "" });
  const [customer, setCustomer] = React.useState(() => initialDraft?.customer ?? { name: "", email: "", phone: "" });
  const [submitted, setSubmitted] = React.useState(() => initialDraft?.submitted ?? false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccessPulse, setShowSuccessPulse] = React.useState(false);
  const [showProgressShimmer, setShowProgressShimmer] = React.useState(false);
  const tracked = React.useRef<Set<string>>(new Set());
  const wizardRef = React.useRef<HTMLDivElement>(null);

  // Get current wizard state for persistence
  const getCurrentState = React.useCallback((): WizardState => ({
    step,
    selected,
    projectType,
    otherNeed,
    answers,
    photos,
    property,
    customer,
    submitted,
    updatedAt: Date.now(),
  }), [step, selected, projectType, otherNeed, answers, photos, property, customer, submitted]);

  // Create autosave function
  const autosave = React.useMemo(() => createAutosave(getCurrentState), [getCurrentState]);

  // Restore draft if user chooses to continue
  // State is already initialized with draft data, just hide the modal
  const restoreDraft = () => {
    setShowDraftRecovery(false);
    setDraftState(null);
  };

  // Start fresh if user chooses to start over
  const startFresh = () => {
    clearWizardState();
    setShowDraftRecovery(false);
    setDraftState(null);
    // Reset all state to initial values and go to Service step
    setStep(0);
    setSelected([]);
    setProjectType("");
    setOtherNeed("");
    setAnswers({});
    setPhotos([]);
    setProperty({ address: "", city: "", county: "", details: "" });
    setCustomer({ name: "", email: "", phone: "" });
    setSubmitted(false);
  };

  // Sync step with URL
  React.useEffect(() => {
    const currentStep = STEPS[step];
    const url = new URL(window.location.href);
    url.searchParams.set("step", currentStep);
    router.replace(url.toString(), { scroll: false });
  }, [step, router]);

  // Scroll wizard into view on step change
  React.useEffect(() => {
    wizardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [step]);

  // Show recovery dialog only after page refresh/reopen AND when user reaches Property step or further
  React.useEffect(() => {
    const propertyStepIndex = ALL_STEPS.indexOf("Property");

    // Only show if:
    // 1. Draft exists
    // 2. This is a restored session (refresh/reopen)
    // 3. User is at Property step or further
    if (initialDraft && isRestoredSession && step >= propertyStepIndex) {
      setShowDraftRecovery(true);
    }
  }, [step, initialDraft, isRestoredSession]);

  // Service questions are driven by the primary (first) selected service.
  const primarySlug = selected[0];
  const service = services.find((s) => s.slug === primarySlug);
  const questions = service?.estimateQuestions ?? [];

  // Dynamic steps: skip intent step for services where intent is already clear
  const STEPS = React.useMemo(() => {
    if (service?.skipsIntentStep) {
      return ALL_STEPS.filter((s) => s !== "Tell us about your project");
    }
    return ALL_STEPS;
  }, [service]);

  // Adjust step when STEPS array changes (e.g., when skipping intent step)
  React.useEffect(() => {
    if (step >= STEPS.length) {
      setStep(STEPS.length - 1);
    }
  }, [STEPS, step]);

  // Auto-set projectType for services that skip the intent step
  React.useEffect(() => {
    if (service?.skipsIntentStep && service?.defaultProjectIntent) {
      setProjectType(service.defaultProjectIntent);
    }
  }, [service]);

  // Autosave on any state change
  React.useEffect(() => {
    autosave();
  }, [step, selected, projectType, otherNeed, answers, photos, property, customer, submitted]);

  // Trigger progress bar shimmer on Thank You step (one-time)
  React.useEffect(() => {
    if (STEPS[step] === "Thank You" && !showProgressShimmer) {
      setShowProgressShimmer(true);
    }
  }, [step, STEPS, showProgressShimmer]);

  const setAnswer = (id: string, val: string | boolean | number) =>
    setAnswers((prev) => ({ ...prev, [id]: val }));

  const canNext = React.useMemo(() => {
    if (STEPS[step] === "Service") return selected.length > 0 || otherNeed.trim().length > 0;
    if (STEPS[step] === "Tell us about your project") return projectType.trim().length > 0;
    if (STEPS[step] === "Contact")
      return customer.name.trim() && customer.email.trim() && customer.phone.trim();
    if (STEPS[step] === "Property") return property.city.trim() && property.county;
    return true;
  }, [step, selected, otherNeed, projectType, customer, property]);

  function buildRequest(): EstimateRequest {
    return {
      services: selected,
      otherNeed: otherNeed.trim() || undefined,
      customer: { name: customer.name, email: customer.email, phone: customer.phone },
      property: {
        address: property.address,
        city: property.city,
        county: property.county,
        details: property.details,
      },
      answers,
      projectIntent: projectType || undefined,
      photos,
      notes: "",
      submittedAt: new Date().toISOString(),
    };
  }

  function toggleService(slug: string) {
    setSelected((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= MAX_SERVICES) return prev; // cap at 3
      if (!tracked.current.has(slug)) {
        tracked.current.add(slug);
        analytics.trackEstimateStarted(slug);
      }
      return [...prev, slug];
    });
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    const currentState = getCurrentState();
    const persistedState = loadWizardState();
    
    // Validate submission integrity
    const validation = validateSubmissionIntegrity(currentState, persistedState);
    if (!validation.valid) {
      console.error("Submission integrity validation failed:", validation.issues);
      alert("There was a problem with your submission. Please try refreshing the page and completing the wizard again.");
      setIsSubmitting(false);
      return;
    }

    const req = buildRequest();
    const result = await estimateService.submit(req);
    analytics.trackEstimateSubmitted(req.services.join(",") || "other", result.transport);
    
    // Clear draft after successful submission
    clearWizardState();
    
    // Show success pulse animation
    setShowSuccessPulse(true);
    setTimeout(() => setShowSuccessPulse(false), 1000);
    
    setIsSubmitting(false);
    setStep(STEPS.length - 1); // Advance to Thank You step
  }

  return (
    <div ref={wizardRef} style={{ scrollMarginTop: "90px" }}>
      {/* Draft Recovery Modal */}
      {showDraftRecovery && (
        <div className="mb-6 rounded-xl border border-primary/50 bg-primary/5 p-6">
          <h3 className="text-lg font-semibold text-text">We found an unfinished project</h3>
          <p className="mt-2 text-sm text-text-muted/90">
            Would you like to continue where you left off, or start fresh?
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={restoreDraft}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={startFresh}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-surface-muted"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Stepper */}
      <ol className="mb-8 relative" aria-label="Progress">
        {/* Progress line */}
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-surface-muted -translate-y-1/2 transition-all duration-500 ease-out"
          style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
        />
        <div 
          className={cn(
            "absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-500 ease-out",
            showProgressShimmer && "animate-shimmer-fast"
          )}
          style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
        />
        
        <div className="flex flex-wrap gap-2 relative">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300 ease-out",
                i === step 
                  ? "bg-primary text-white scale-105 shadow-md" 
                  : i < step 
                  ? "bg-accent/10 text-accent" 
                  : "bg-surface-muted text-text"
              )}
            >
              {i < step && <Check className="h-3 w-3" />}
              {s}
            </li>
          ))}
        </div>
      </ol>

      <div className={cn(
        "rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8 transition-all duration-300 ease-out",
        showSuccessPulse ? "ring-4 ring-accent/50 scale-[1.02]" : ""
      )}>
        {/* STEP 1: Service (multi-select, up to 3) */}
        {STEPS[step] === "Service" && (
          <div>
            <h2 className="text-xl font-bold text-text">Tell us what you're thinking about. We'll guide you through the rest.</h2>
            <p className="mt-1 text-sm text-text-muted">
              Pick up to {MAX_SERVICES} — or tell us what you need below.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {services.map((s) => {
                const active = selected.includes(s.slug);
                const atCap = selected.length >= MAX_SERVICES && !active;
                const isTopService = s.slug === "painting" || s.slug === "repairs";
                return (
                  <button
                    key={s.slug}
                    type="button"
                    aria-pressed={active}
                    disabled={atCap}
                    onClick={() => toggleService(s.slug)}
                    className={cn(
                      "relative rounded-xl border p-4 text-left transition-all",
                      active
                        ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/50 ring-offset-2"
                        : atCap
                        ? "border-border bg-surface-muted opacity-50 cursor-not-allowed"
                        : "border-border bg-surface hover:border-primary/60",
                      isTopService && !active && "border-primary bg-surface"
                    )}
                  >
                    {active && (
                      <span className="absolute inset-0 rounded-xl animate-shimmer-fast" style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(231,173,99,0.3) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                        mixBlendMode: 'overlay',
                      }} />
                    )}
                    <span className="relative z-10 flex items-center justify-between">
                      <span className="font-semibold text-text">{s.name}</span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="relative z-10 block text-sm text-text-subtle">{s.description}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-border bg-surface-muted/40 p-4">
              <label htmlFor="otherNeed" className="block text-sm font-semibold text-text">
                Don&rsquo;t see what you need?
              </label>
              <p className="mt-1 text-xs text-text-muted">
                Tell us about your project — we&rsquo;ll figure out the rest.
              </p>
              <textarea
                id="otherNeed"
                rows={3}
                className="mt-2 w-full rounded-lg border border-border bg-white p-3 text-sm text-black"
                placeholder="e.g. a custom mudroom bench, a sliding barn door, a sunroom…"
                value={otherNeed}
                onChange={(e) => setOtherNeed(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 2: Tell us about your project */}
        {STEPS[step] === "Tell us about your project" && (
          <div>
            <h2 className="text-xl font-bold text-text">What's on your mind?</h2>
            {service && (
              <p className="mt-1 text-sm text-text-muted">
                It doesn't have to be perfect. A few details are enough for us to understand what you're planning.
              </p>
            )}
            {!service && (
              <p className="mt-1 text-sm text-text-muted">
                It doesn't have to be perfect. A few details are enough for us to understand what you're planning.
              </p>
            )}
            <div className="mt-4 space-y-3">
              {PROJECT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProjectType(type)}
                  className={cn(
                    "relative w-full rounded-xl border p-4 text-left transition-colors",
                    projectType === type
                      ? "border-primary bg-primary/10 ring-2 ring-primary/50 ring-offset-2"
                      : "border-border hover:border-primary/60"
                  )}
                >
                  {projectType === type && (
                    <span className="absolute inset-0 rounded-xl animate-shimmer-fast" style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(231,173,99,0.3) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      mixBlendMode: 'overlay',
                    }} />
                  )}
                  <span className="relative z-10 flex items-center justify-between">
                    <span className="font-semibold text-text">{type}</span>
                    {projectType === type && <Check className="h-4 w-4 text-primary" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Photos */}
        {STEPS[step] === "Photos" && (
          <div>
            <h2 className="text-xl font-bold text-text">Have a photo? It helps us see what you're seeing.</h2>
            <p className="mt-1 text-text-muted">
              Optional, but helpful for understanding the space.
            </p>
            
            {/* Desktop file upload */}
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-text hover:border-primary">
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">Upload photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  console.log(`[Client] Desktop file upload: ${files.length} files selected`);
                  const newPhotos: PhotoMeta[] = [];
                  
                  for (const file of files) {
                    const reader = new FileReader();
                    const dataUrl = await new Promise<string>((resolve) => {
                      reader.onload = () => resolve(reader.result as string);
                      reader.readAsDataURL(file);
                    });
                    console.log(`[Client] Processed file: ${file.name}, size: ${file.size}, base64 length: ${dataUrl.length}`);
                    newPhotos.push({
                      name: file.name,
                      size: file.size,
                      uploadedAt: Date.now(),
                      data: dataUrl,
                      file,
                    });
                  }
                  
                  setPhotos((prev) => [...prev, ...newPhotos]);
                  console.log(`[Client] Total photos after upload: ${newPhotos.length + (photos.length)} files`);
                }}
              />
            </label>
            
            {/* Mobile camera capture */}
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-text hover:border-primary">
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">Take a photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  console.log(`[Client] Mobile camera capture: ${files.length} photos taken`);
                  const newPhotos: PhotoMeta[] = [];
                  
                  for (const file of files) {
                    const reader = new FileReader();
                    const dataUrl = await new Promise<string>((resolve) => {
                      reader.onload = () => resolve(reader.result as string);
                      reader.readAsDataURL(file);
                    });
                    console.log(`[Client] Processed photo: ${file.name}, size: ${file.size}, base64 length: ${dataUrl.length}`);
                    newPhotos.push({
                      name: file.name,
                      size: file.size,
                      uploadedAt: Date.now(),
                      data: dataUrl,
                      file,
                    });
                  }
                  
                  setPhotos((prev) => [...prev, ...newPhotos]);
                  console.log(`[Client] Total photos after capture: ${newPhotos.length + (photos.length)} files`);
                }}
              />
            </label>
            
            {photos.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm text-text-muted">
                {photos.map((p, i) => (
                  <li key={i} className="flex items-center justify-between rounded bg-surface-muted px-3 py-2">
                    <span>{p.name}</span>
                    <button
                      type="button"
                      className="text-text-subtle hover:text-red-500"
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* STEP 4: Project Details */}
        {STEPS[step] === "Project Details" && (
          <div>
            <h2 className="text-xl font-bold text-text">A couple quick questions</h2>
            <div className="mt-4 space-y-4">
              {questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-semibold text-text">
                    {q.label}
                    {q.required && <span className="text-red-500"> *</span>}
                  </label>
                  {q.help && <p className="mt-1 text-xs text-text-muted">{q.help}</p>}
                  {q.type === "textarea" && (
                    <textarea
                      className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-black"
                      rows={3}
                      placeholder={q.placeholder}
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                  )}
                  {q.type === "text" && (
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-black"
                      placeholder={q.placeholder}
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                  )}
                  {q.type === "number" && (
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-black"
                      placeholder={q.placeholder}
                      value={(answers[q.id] as number) ?? ""}
                      onChange={(e) => setAnswer(q.id, Number(e.target.value))}
                    />
                  )}
                  {q.type === "select" && (
                    <select
                      className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-black"
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {q.options?.map((o: string) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  )}
                  {q.type === "boolean" && (
                    <div className="mt-1 flex gap-3">
                      {[true, false].map((b) => (
                        <button
                          key={String(b)}
                          type="button"
                          onClick={() => setAnswer(q.id, b)}
                          className={cn(
                            "rounded-lg border px-4 py-2 text-sm",
                            answers[q.id] === b ? "border-primary bg-primary/10" : "border-border"
                          )}
                        >
                          {b ? "Yes" : "No"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Property */}
        {STEPS[step] === "Property" && (
          <div>
            <h2 className="text-xl font-bold text-text">Where is the work?</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text">Street address</label>
                <input
                  className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-black"
                  placeholder="123 Main St (optional)"
                  value={property.address}
                  onChange={(e) => setProperty((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-text">City *</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-black"
                    value={property.city}
                    onChange={(e) => setProperty((p) => ({ ...p, city: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text">County *</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-black"
                    value={property.county}
                    onChange={(e) => setProperty((p) => ({ ...p, county: e.target.value }))}
                  >
                    <option value="">Select…</option>
                    {counties.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text">Anything else about the property?</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-black"
                  rows={3}
                  placeholder="access, parking, gate code, HOA…"
                  value={property.details}
                  onChange={(e) => setProperty((p) => ({ ...p, details: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Contact */}
        {STEPS[step] === "Contact" && (
          <div>
            <h2 className="text-xl font-bold text-text">How do we reach you?</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text">Name *</label>
                <input
                  className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-black"
                  value={customer.name}
                  onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-text">Email *</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-black"
                    value={customer.email}
                    onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text">Phone *</label>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-lg border border-border bg-white p-3 text-black"
                    value={customer.phone}
                    onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Thank You */}
        {STEPS[step] === "Thank You" && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-primary">Here's what we heard</h2>
            <p className="mt-3 text-text">
              If anything looks off, now's the perfect time to fix it.
            </p>

            {/* Preliminary Planning Range */}
            {(() => {
              const result = preliminaryRange(selected, answers);
              if (result.low > 0 || result.high > 0) {
                return (
                  <div className="mt-8 rounded-lg bg-surface-muted p-6 text-left">
                    <h3 className="font-semibold text-primary">Preliminary Planning Range</h3>
                    <div className="mt-4">
                      <p className="text-2xl font-bold text-primary">
                        {formatRange(result.low)} – {formatRange(result.high)}
                      </p>
                      <p className="mt-2 text-sm text-text-muted">{result.note}</p>
                    </div>
                    
                    {/* Per-service breakdown */}
                    {result.breakdown && result.breakdown.length > 1 && (
                      <div className="mt-6 border-t border-border pt-4">
                        <h4 className="text-sm font-semibold text-primary">How this range breaks down</h4>
                        <div className="mt-3 space-y-2">
                          {result.breakdown.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-text-muted">
                                {item.label}
                                {item.scopeUsed && (
                                  <span className="ml-2 text-xs text-text-subtle">({item.scopeUsed})</span>
                                )}
                              </span>
                              <span className="font-medium text-primary">
                                {formatRange(item.low)} – {formatRange(item.high)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            <div className="mt-8 rounded-lg bg-surface-muted p-6 text-left">
              <h3 className="font-semibold text-primary">Everything looks good. We'll package everything up for Taylor—you just hit Send.</h3>
            </div>
          </div>
        )}

        {/* Nav */}
        {STEPS[step] !== "Thank You" && (
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className={cn(buttonVariants({ variant: "ghost" }), "disabled:opacity-0")}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className={cn(buttonVariants({ variant: "primary" }), "!disabled:opacity-40")}
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className={cn(buttonVariants({ variant: "primary" }))}
              >
                <Send className="h-4 w-4" /> Send My Estimate Request
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
