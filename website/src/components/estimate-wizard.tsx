"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Upload, Send } from "lucide-react";
import type { EstimateRequest, Service } from "@/types";
import { services } from "@/config/services";
import { counties } from "@/config/counties";
import { company } from "@/config/company";
import { estimateService } from "@/services/estimate";
import { analytics } from "@/services/analytics";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { preliminaryRange, formatRange } from "@/lib/planning-range";

type PhotoMeta = { name: string; size: number };

const STEPS = ["Service", "Photos", "Questions", "Property", "Contact", "Confirm"] as const;
const MAX_SERVICES = 3;

export function EstimateWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillService = searchParams.get("service") ?? "";

  const [step, setStep] = React.useState(0);
  const [selected, setSelected] = React.useState<string[]>(
    prefillService && services.some((s) => s.slug === prefillService) ? [prefillService] : [],
  );
  const [otherNeed, setOtherNeed] = React.useState("");
  const [answers, setAnswers] = React.useState<Record<string, string | boolean | number>>({});
  const [photos, setPhotos] = React.useState<PhotoMeta[]>([]);
  const [property, setProperty] = React.useState({ address: "", city: "", county: "", details: "" });
  const [customer, setCustomer] = React.useState({ name: "", email: "", phone: "" });
  const [submitted, setSubmitted] = React.useState(false);
  const tracked = React.useRef<Set<string>>(new Set());

  // Service questions are driven by the primary (first) selected service.
  const primarySlug = selected[0];
  const service: Service | undefined = services.find((s) => s.slug === primarySlug);
  const questions = service?.estimateQuestions ?? [];

  const setAnswer = (id: string, val: string | boolean | number) =>
    setAnswers((prev) => ({ ...prev, [id]: val }));

  const canNext = React.useMemo(() => {
    if (STEPS[step] === "Service") return selected.length > 0 || otherNeed.trim().length > 0;
    if (STEPS[step] === "Contact")
      return customer.name.trim() && customer.email.trim() && customer.phone.trim();
    if (STEPS[step] === "Property") return property.city.trim() && property.county;
    return true;
  }, [step, selected, otherNeed, customer, property]);

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
    const req = buildRequest();
    const result = await estimateService.submit(req);
    analytics.trackEstimateSubmitted(req.services.join(",") || "other", result.transport);
    setSubmitted(true);
  }

  if (submitted) {
    const plan = preliminaryRange(selected);
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Check className="h-8 w-8" />
        </div>
                <h2 className="mt-4 text-2xl font-bold text-text">Here&rsquo;s our understanding of your project</h2>
        <p className="mt-2 text-text-muted">
          Thanks for the details{property.city ? `, ${property.city}` : ""}. We&rsquo;ve summarized what you told us below.
        </p>
        {plan ? (
          <div className="mt-6 rounded-card border border-border bg-background/60 p-6 text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Preliminary Planning Range</p>
            <p className="mt-3 text-text-muted">
              Based on similar Oregon projects, most projects like this typically fall somewhere between
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-text">
              {formatRange(plan.low)} &ndash; {formatRange(plan.high)}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-subtle">{plan.note}</p>
          </div>
        ) : null}
        <p className="mt-6 text-text-muted">
          Your email app should have opened with the full summary. Just hit send and Taylor will be in
          touch within one business day. If it didn&rsquo;t open, email us at{" "}
          <a href={`mailto:${company.email}`} className="font-semibold text-accent">{company.email}</a>.
        </p>
        <button
          onClick={() => router.push("/")}
          className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Stepper */}
      <ol className="mb-8 flex flex-wrap gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={cn(
              "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
              i === step ? "bg-primary text-text" : i < step ? "bg-accent/10 text-accent" : "bg-surface-muted text-text-subtle"
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
                return (
                  <button
                    key={s.slug}
                    type="button"
                    aria-pressed={active}
                    disabled={atCap}
                    onClick={() => toggleService(s.slug)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : atCap
                          ? "cursor-not-allowed border-border opacity-40"
                          : "border-border hover:border-primary/60",
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-semibold text-text">{s.title}</span>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="block text-sm text-text-subtle">{s.summary}</span>
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
                className="mt-2 w-full rounded-lg border border-border bg-surface p-3 text-sm"
                placeholder="e.g. a custom mudroom bench, a sliding barn door, a sunroom…"
                value={otherNeed}
                onChange={(e) => setOtherNeed(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 2: Photos */}
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
                    ...files.map((f) => ({ name: f.name, size: f.size })),
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

        {/* STEP 3: Questions (primary-service-driven) */}
        {STEPS[step] === "Questions" && (
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
                  {q.type === "textarea" && (
                    <textarea
                      className="mt-1 w-full rounded-lg border border-border p-3"
                      rows={3}
                      placeholder={q.placeholder}
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                  )}
                  {q.type === "text" && (
                    <input
                      className="mt-1 w-full rounded-lg border border-border p-3"
                      placeholder={q.placeholder}
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                  )}
                  {q.type === "number" && (
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-border p-3"
                      placeholder={q.placeholder}
                      value={(answers[q.id] as number) ?? ""}
                      onChange={(e) => setAnswer(q.id, Number(e.target.value))}
                    />
                  )}
                  {q.type === "select" && (
                    <select
                      className="mt-1 w-full rounded-lg border border-border p-3"
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {q.options?.map((o) => (
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

        {/* STEP 4: Property */}
        {STEPS[step] === "Property" && (
          <div>
            <h2 className="text-xl font-bold text-text">Where is the work?</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text">Street address</label>
                <input
                  className="mt-1 w-full rounded-lg border border-border p-3"
                  placeholder="123 Main St (optional)"
                  value={property.address}
                  onChange={(e) => setProperty((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-text">City *</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-border p-3"
                    value={property.city}
                    onChange={(e) => setProperty((p) => ({ ...p, city: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text">County *</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-border p-3"
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
                  className="mt-1 w-full rounded-lg border border-border p-3"
                  rows={3}
                  placeholder="access, parking, gate code, HOA…"
                  value={property.details}
                  onChange={(e) => setProperty((p) => ({ ...p, details: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Contact */}
        {STEPS[step] === "Contact" && (
          <div>
            <h2 className="text-xl font-bold text-text">How do we reach you?</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text">Name *</label>
                <input
                  className="mt-1 w-full rounded-lg border border-border p-3"
                  value={customer.name}
                  onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-text">Email *</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-border p-3"
                    value={customer.email}
                    onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text">Phone *</label>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-lg border border-border p-3"
                    value={customer.phone}
                    onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Confirm */}
        {STEPS[step] === "Confirm" && (
          <div>
            <h2 className="text-xl font-bold text-text">Review &amp; send</h2>
            <dl className="mt-4 space-y-2 rounded-lg bg-surface-muted p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-text-subtle">Services</dt>
                <dd className="text-right font-semibold">
                  {selected.length ? selected.map((sl) => services.find((s) => s.slug === sl)?.title).join(", ") : "—"}
                </dd>
              </div>
              {otherNeed.trim() && (
                <div className="flex justify-between gap-4">
                  <dt className="text-text-subtle">Other need</dt>
                  <dd className="text-right font-semibold">{otherNeed.trim()}</dd>
                </div>
              )}
              <div className="flex justify-between"><dt className="text-text-subtle">Photos</dt><dd>{photos.length} attached in email</dd></div>
              <div className="flex justify-between"><dt className="text-text-subtle">Location</dt><dd>{property.city} ({property.county})</dd></div>
              <div className="flex justify-between"><dt className="text-text-subtle">Contact</dt><dd>{customer.name} · {customer.email}</dd></div>
            </dl>
            <p className="mt-3 text-sm text-text-subtle">
              We&apos;ll open your email app with everything filled in. Just press send.
            </p>
          </div>
        )}

        {/* Nav */}
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
              <Send className="h-4 w-4" /> Send estimate request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
