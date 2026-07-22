"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Upload, Send } from "lucide-react";
import type { EstimateRequest, Service, EstimateQuestion } from "@/types";
import { getAllServices, getAllCities } from "@/lib/registries";
import { company } from "@/config/company";
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

type PhotoMeta = { name: string; size: number; uploadedAt?: number };

const ALL_STEPS = ["Service", "Tell us about your project", "Photos", "Project Details", "Property", "Contact", "Thank You"] as const;
const MAX_SERVICES = 3;
const PROJECT_TYPES = ["Build something new", "Restore / Repair existing", "Paint / Stain / Refinish existing", "I'm not sure yet"] as const;

// Services that skip the intent step (intent is already clear from the service)
const SKIP_INTENT_SERVICES = ["painting", "repairs"] as const;

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

  const [showDraftRecovery, setShowDraftRecovery] = React.useState(!!initialDraft);
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
  const tracked = React.useRef<Set<string>>(new Set());
  const wizardRef = React.useRef<HTMLDivElement>(null);

  // Get current wizard state for persistence
  const getCurrentState = (): WizardState => ({
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
  });

  // Create autosave function
  const autosave = React.useMemo(() => createAutosave(getCurrentState), []);

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
    // Reset all state to initial values
    setStep(stepParam ? ALL_STEPS.indexOf(stepParam as any) : 0);
    setSelected(prefillService && services.some((s) => s.slug === prefillService) ? [prefillService] : []);
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

  // Service questions are driven by the primary (first) selected service.
  const primarySlug = selected[0];
  const service = services.find((s) => s.slug === primarySlug);
  const questions = service?.estimateQuestions ?? [];

  // Dynamic steps: skip intent step for services where intent is already clear
  const STEPS = React.useMemo(() => {
    if (primarySlug && SKIP_INTENT_SERVICES.includes(primarySlug as any)) {
      return ALL_STEPS.filter((s) => s !== "Tell us about your project");
    }
    return ALL_STEPS;
  }, [primarySlug]);

  // Adjust step when STEPS array changes (e.g., when skipping intent step)
  React.useEffect(() => {
    if (step >= STEPS.length) {
      setStep(STEPS.length - 1);
    }
  }, [STEPS, step]);

  // Auto-set projectType for services that skip the intent step
  React.useEffect(() => {
    if (primarySlug && SKIP_INTENT_SERVICES.includes(primarySlug as any)) {
      if (primarySlug === "painting") {
        setProjectType("Paint / Stain / Refinish existing");
      } else if (primarySlug === "repairs") {
        setProjectType("Restore / Repair existing");
      }
    }
  }, [primarySlug]);

  // Autosave on any state change
  React.useEffect(() => {
    autosave();
  }, [step, selected, projectType, otherNeed, answers, photos, property, customer, submitted]);

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
      answers: { ...answers, projectType },
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
    const currentState = getCurrentState();
    const persistedState = loadWizardState();
    
    // Validate submission integrity
    const validation = validateSubmissionIntegrity(currentState, persistedState);
    if (!validation.valid) {
      console.error("Submission integrity validation failed:", validation.issues);
      alert("There was a problem with your submission. Please try refreshing the page and completing the wizard again.");
      return;
    }

    const req = buildRequest();
    const result = await estimateService.submit(req);
    analytics.trackEstimateSubmitted(req.services.join(",") || "other", result.transport);
    
    // Clear draft after successful submission
    clearWizardState();
    
    setStep(STEPS.length - 1); // Advance to Thank You step
  }

  return (
    <div ref={wizardRef} style={{ scrollMarginTop: "90px" }}>
      {/* Draft Recovery Modal */}
      {showDraftRecovery && (
        <div className="mb-6 rounded-xl border border-primary/50 bg-primary/5 p-6">
          <h3 className="text-lg font-semibold text-text">We found an unfinished project</h3>
          <p className="mt-2 text-sm text-text-muted">
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
      <ol className="mb-8 flex flex-wrap gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
              i === step ? "bg-primary text-white" : i < step ? "bg-accent/10 text-accent" : "bg-surface-muted text-text-subtle"
            )}
          >
            {i < step && <Check className="h-3 w-3" />}
            {s}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        {/* STEP 1: Service (multi-select, up to 3) */}
        {STEPS[step] === "Service" && (
          <div>
            <h2 className="text-xl font-bold text-text">What can we build for you?</h2>
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
                        ? "border-primary bg-primary/10 shadow-sm"
                        : atCap
                        ? "border-border bg-surface-muted opacity-50 cursor-not-allowed"
                        : "border-border bg-surface hover:border-primary/60",
                      isTopService && !active && "border-primary/30 bg-surface"
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-semibold text-text">{s.name}</span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="block text-sm text-text-subtle">{s.description}</span>
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
            <h2 className="text-xl font-bold text-text">Tell us about your project</h2>
            {service && (
              <p className="mt-1 text-sm text-text-muted">
                {service.slug === "painting"
                  ? "Surface preparation, existing coatings, and accessibility all affect planning. We'll gather a few details to make the site visit more productive."
                  : service.slug === "decks" || service.slug === "pergolas"
                  ? "Great. We'll ask a few questions about your outdoor structure so Taylor can understand the scope before visiting your property."
                  : "Great. We'll ask a few questions about your project so Taylor can understand the scope before visiting your property."}
              </p>
            )}
            {!service && (
              <p className="mt-1 text-sm text-text-muted">
                This helps us ask the right questions for your project.
              </p>
            )}
            <div className="mt-4 space-y-3">
              {PROJECT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProjectType(type)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    projectType === type
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/60"
                  )}
                >
                  <span className="flex items-center justify-between">
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
            <h2 className="text-xl font-bold text-text">Add a few photos (optional)</h2>
            <p className="mt-1 text-text-muted">
              Photos help us give a better estimate. In this demo your photos stay on your device —
              you&apos;ll attach them when your email opens.
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-text-subtle hover:border-primary">
              <Upload className="h-8 w-8" />
              <span className="text-sm font-medium">Tap to choose photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPhotos((prev) => [
                    ...prev,
                    ...files.map((f) => ({ name: f.name, size: f.size, uploadedAt: Date.now() })),
                  ]);
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
            {questions.length === 0 && (
              <p className="mt-2 text-text-muted">No extra questions for this service — just continue.</p>
            )}
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
            <h2 className="text-2xl font-bold text-text">Thank You</h2>
            <p className="mt-3 text-text-muted">
              We have received your project information.
            </p>
            <p className="mt-2 text-text-muted">
              Taylor will personally review your request, photos, and project details before reaching out.
            </p>
            <p className="mt-4 text-sm text-text-subtle">
              Every home is different. An on site visit allows us to understand your goals, answer questions, and prepare an accurate proposal.
            </p>

            <div className="mt-8 rounded-lg bg-surface-muted p-6 text-left">
              <h3 className="font-semibold text-text">What happens next</h3>
              <ul className="mt-4 space-y-3 text-sm text-text-muted">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>We review your request</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>We will reach out within one business day</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>We will schedule an on site visit</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>You will receive a detailed written proposal after the walkthrough</span>
                </li>
              </ul>
            </div>

            <p className="mt-8 text-sm font-medium text-text">
              We are excited to help bring your project to life.
            </p>
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
                <Send className="h-4 w-4" /> Submit request
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
