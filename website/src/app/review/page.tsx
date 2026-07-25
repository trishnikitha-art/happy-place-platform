"use client";

import { useState } from "react";
import { StarRating } from "@/components/star-rating";
import { SectionHeading, Container, Section } from "@/components/section";

export default function ReviewPage() {
  const [showGoogleOption, setShowGoogleOption] = useState(false);

  const handleFormSubmit = () => {
    // After successful form submission, show Google Review option
    setShowGoogleOption(true);
  };

  return (
    <Section className="bg-deep text-text-on-dark">
      <Container className="py-16 md:py-24">
        {!showGoogleOption ? (
          <>
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-6 flex justify-center">
                <StarRating rating={5} />
              </div>
              
              <h1 className="font-display text-4xl font-bold text-text-on-dark md:text-5xl">
                How did we do?
              </h1>
              
              <p className="mt-4 text-lg text-text-on-dark/90">
                Your feedback helps us improve and serves other homeowners in the Willamette Valley.
              </p>
            </div>

            <div className="mt-12 mx-auto max-w-3xl">
              <div className="rounded-2xl bg-white p-8 shadow-lg">
                <div className="mb-6 text-center">
                  <h2 className="font-display text-2xl font-bold text-text">
                    Share Your Experience
                  </h2>
                  <p className="mt-2 text-text-muted">
                    Please take a moment to tell us about your project.
                  </p>
                </div>

                {/* Google Form Embed */}
                <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-border">
                  <iframe
                    src="https://docs.google.com/forms/d/e/1FAIpQLSdXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/viewform?embedded=true"
                    className="h-full w-full"
                    frameBorder="0"
                    marginHeight={0}
                    marginWidth={0}
                    title="Happy Place Carpentry Review Form"
                    onLoad={handleFormSubmit}
                  >
                    Loading review form...
                  </iframe>
                </div>

                <p className="mt-6 text-center text-sm text-text-muted">
                  Can't see the form?{' '}
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLSdXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/viewform"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Open in new tab →
                  </a>
                </p>
              </div>
            </div>

            <div className="mt-16 text-center">
              <p className="text-text-on-dark/70">
                Prefer to leave a review on Google?{' '}
                <a
                  href="https://search.google.com/local/writereview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Review us on Google →
                </a>
              </p>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-green-500/20 p-4">
                <svg className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <h1 className="font-display text-4xl font-bold text-text-on-dark md:text-5xl">
              Thank you!
            </h1>
            
            <p className="mt-4 text-lg text-text-on-dark/90">
              We appreciate you taking the time to share your experience.
            </p>

            <div className="mt-8 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
              <p className="text-text-on-dark/90 mb-4">
                Would you also like to leave this review on Google?
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
                  Review on Google
                </a>
                <button
                  onClick={() => setShowGoogleOption(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-text-on-dark/20 bg-text-on-dark/6 px-6 py-3 font-semibold text-text-on-dark transition-all duration-250 hover:bg-text-on-dark/12"
                >
                  No thanks
                </button>
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
        )}
      </Container>
    </Section>
  );
}
