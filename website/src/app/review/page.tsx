"use client";

import { useState } from "react";
import { StarRating } from "@/components/star-rating";
import { SectionHeading, Container, Section } from "@/components/section";

interface ReviewFormData {
  name: string;
  city: string;
  service: string;
  rating: number;
  body: string;
  allowFirstName: boolean;
  allowContact: boolean;
}

export default function ReviewPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ReviewFormData>({
    name: '',
    city: '',
    service: '',
    rating: 5,
    body: '',
    allowFirstName: false,
    allowContact: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          city: formData.city,
          county: '', // Will be inferred by pipeline
          service: formData.service,
          rating: formData.rating,
          body: formData.body,
          provider: 'form',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit review');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Section className="bg-deep text-text-on-dark">
        <Container className="py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-green-500/20 p-4">
                <svg className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <h1 className="font-display text-4xl font-bold text-text-on-dark md:text-5xl">
              Thank you
            </h1>
            
            <p className="mt-4 text-lg text-text-on-dark/90">
              Thank you for trusting Taylor and Lanie with your project.
            </p>
            
            <p className="mt-2 text-lg text-text-on-dark/80">
              We read every review personally.
            </p>
            
            <p className="mt-2 text-lg text-text-on-dark/70">
              Your feedback helps future homeowners know what it's like to work with us.
            </p>

            <div className="mt-8 mb-6 flex justify-center">
              <StarRating rating={5} />
            </div>

            <div className="mt-8 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
              <p className="text-text-on-dark/90 mb-4">
                If you'd also like to support our small business, we'd truly appreciate a Google review.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://search.google.com/local/writereview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  Leave a Google Review
                </a>
              </div>
            </div>

            <div className="mt-8">
              <a
                href="/"
                className="text-text-on-dark/70 hover:text-text-on-dark transition-colors"
              >
                Return to homepage →
              </a>
            </div>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="bg-deep text-text-on-dark">
      <Container className="py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 flex justify-center">
            <StarRating rating={5} />
          </div>
          
          <h1 className="font-display text-4xl font-bold text-text-on-dark md:text-5xl">
            Tell us about your project
          </h1>
          
          <p className="mt-4 text-lg text-text-on-dark/90">
            We'd love to hear how it turned out.
          </p>
          
          <p className="mt-2 text-lg text-text-on-dark/80">
            What was it like working with us?
          </p>
        </div>

        <div className="mt-12 mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-text mb-2">
                  Your name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-border px-4 py-3 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-text mb-2">
                  City (optional)
                </label>
                <input
                  type="text"
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full rounded-lg border border-border px-4 py-3 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Corvallis"
                />
              </div>

              <div>
                <label htmlFor="service" className="block text-sm font-medium text-text mb-2">
                  What did we work on?
                </label>
                <select
                  id="service"
                  required
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="w-full rounded-lg border border-border px-4 py-3 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select a service</option>
                  <option value="deck">Deck</option>
                  <option value="pergola">Pergola</option>
                  <option value="fence">Fence</option>
                  <option value="painting">Painting</option>
                  <option value="bathroom">Bathroom</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="carpentry">Custom Carpentry</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  How would you rate your experience?
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className={`text-3xl transition-transform hover:scale-110 ${
                        star <= formData.rating ? 'text-primary' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="body" className="block text-sm font-medium text-text mb-2">
                  Tell us about your experience
                </label>
                <textarea
                  id="body"
                  required
                  rows={6}
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full rounded-lg border border-border px-4 py-3 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Share what you loved about working with us..."
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowFirstName}
                    onChange={(e) => setFormData({ ...formData, allowFirstName: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:border-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-muted">
                    I'm okay with you publishing my first name with this review
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowContact}
                    onChange={(e) => setFormData({ ...formData, allowContact: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:border-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-muted">
                    You can reach out if you need clarification about anything I mentioned
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Share your experience'}
              </button>
            </form>
          </div>
        </div>
      </Container>
    </Section>
  );
}
