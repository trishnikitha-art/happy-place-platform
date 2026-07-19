"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Upload, Send } from "lucide-react";
import type { EstimateRequest, Service } from "@/types";
import { services } from "@/config/services";
import { counties } from "@/config/counties";
import { company } from "@/config/company";
import { estimateService } from "@/services/estimate";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PhotoMeta = { name: string; size: number };

const STEPS = ["Service", "Photos", "Questions", "Property", "Contact", "Confirm"] as const;

export function EstimateWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [serviceSlug, setServiceSlug] = React.useState<string>("");
  const [answers, setAnswers] = React.useState<Record<string, string | boolean | number>>({});
  const [photos, setPhotos] = React.useState<PhotoMeta[]>([]);
  const [property, setProperty] = React.useState({ address: "", city: "", county: "", details: "" });
  const [customer, setCustomer] = React.useState({ name: "", email: "", phone: "" });
  const [submitted, setSubmitted] = React.useState(false);

  const service: Service | undefined = services.find((s) => s.slug === serviceSlug);
  const questions = service?.estimateQuestions ?? [];

  const setAnswer = (id: string, val: string | boolean | number) =>
    setAnswers((prev) => ({ ...prev, [id]: val }));

  const canNext = React.useMemo(() => {
    if (STEPS[step] === "Service") return !!serviceSlug;
    if (STEPS[step] === "Contact")
      return customer.name.trim() && customer.email.trim() && customer.phone.trim();
    if (STEPS[step] === "Property") return property.city.trim() && property.county;
    return true;
  }, [step, serviceSlug, customer, property]);

  function buildRequest(): EstimateRequest {
    return {
      service: serviceSlug,
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

  function handleSubmit() {
    const req = buildRequest();
    const result = estimateService.prepare(req);
    if (result.kind === "mailto") {
      // Open the user's mail client pre-filled. Photos are attached by the user
      // in their mail app (MVP: bytes never leave the browser).
      window.location.href = result.href;
      setSubmitted(true);
    } else {
      // Future API path — not used in MVP.
      void result;
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest/10 text-forest">
          <Check className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-stone-900">Your estimate request is ready</h2>
        <p className="mt-2 text-stone-600">
          Your email app should have opened with the details. Just hit send and we&apos;ll be in
          touch within one business day. If it didn&apos;t open, email us at{" "}
          <a href={`mailto:${company.email}`} className="font-semibold text-amber-700">{company.email}</a>.
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
              i === step ? "bg-amber-500 text-stone-900" : i < step ? "bg-forest/10 text-forest" : "bg-stone-100 text-stone-400"
            )}
          >
            {i < step && <Check className="h-3 w-3" />}
            {s}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        {/* STEP 1: Service */}
        {STEPS[step] === "Service" && (
          <div>
            <h2 className="text-xl font-bold text-stone-900">What work do you need?</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setServiceSlug(s.slug)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    serviceSlug === s.slug ? "border-amber-500 bg-amber-50" : "border-stone-200 hover:border-stone-300"
                  )}
                >
                  <span className="font-semibold text-stone-900">{s.title}</span>
                  <span className="block text-sm text-stone-500">{s.summary}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Photos */}
        {STEPS[step] === "Photos" && (
          <div>
            <h2 className="text-xl font-bold text-stone-900">Add a few photos (optional)</h2>
            <p className="mt-1 text-stone-600">
              Photos help us give a better estimate. In this demo your photos stay on your device —
              you&apos;ll attach them when your email opens.
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 p-8 text-stone-500 hover:border-amber-400">
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
              <ul className="mt-4 space-y-1 text-sm text-stone-600">
                {photos.map((p, i) => (
                  <li key={i} className="flex items-center justify-between rounded bg-stone-50 px-3 py-2">
                    <span>{p.name}</span>
                    <button
                      type="button"
                      className="text-stone-400 hover:text-red-500"
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

        {/* STEP 3: Questions (service-driven) */}
        {STEPS[step] === "Questions" && (
          <div>
            <h2 className="text-xl font-bold text-stone-900">A couple quick questions</h2>
            {questions.length === 0 && (
              <p className="mt-2 text-stone-600">No extra questions for this service — just continue.</p>
            )}
            <div className="mt-4 space-y-4">
              {questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-semibold text-stone-800">
                    {q.label}
                    {q.required && <span className="text-red-500"> *</span>}
                  </label>
                  {q.type === "textarea" && (
                    <textarea
                      className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                      rows={3}
                      placeholder={q.placeholder}
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                  )}
                  {q.type === "text" && (
                    <input
                      className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                      placeholder={q.placeholder}
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                  )}
                  {q.type === "number" && (
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                      placeholder={q.placeholder}
                      value={(answers[q.id] as number) ?? ""}
                      onChange={(e) => setAnswer(q.id, Number(e.target.value))}
                    />
                  )}
                  {q.type === "select" && (
                    <select
                      className="mt-1 w-full rounded-lg border border-stone-300 p-3"
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
                            answers[q.id] === b ? "border-amber-500 bg-amber-50" : "border-stone-300"
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
            <h2 className="text-xl font-bold text-stone-900">Where is the work?</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-800">Street address</label>
                <input
                  className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                  placeholder="123 Main St (optional)"
                  value={property.address}
                  onChange={(e) => setProperty((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-stone-800">City *</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                    value={property.city}
                    onChange={(e) => setProperty((p) => ({ ...p, city: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-800">County *</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-stone-300 p-3"
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
                <label className="block text-sm font-semibold text-stone-800">Anything else about the property?</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-stone-300 p-3"
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
            <h2 className="text-xl font-bold text-stone-900">How do we reach you?</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-800">Name *</label>
                <input
                  className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                  value={customer.name}
                  onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-stone-800">Email *</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                    value={customer.email}
                    onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-800">Phone *</label>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-lg border border-stone-300 p-3"
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
            <h2 className="text-xl font-bold text-stone-900">Review &amp; send</h2>
            <dl className="mt-4 space-y-2 rounded-lg bg-stone-50 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-stone-500">Service</dt><dd className="font-semibold">{service?.title}</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">Photos</dt><dd>{photos.length} attached in email</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">Location</dt><dd>{property.city} ({property.county})</dd></div>
              <div className="flex justify-between"><dt className="text-stone-500">Contact</dt><dd>{customer.name} · {customer.email}</dd></div>
            </dl>
            <p className="mt-3 text-sm text-stone-500">
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
