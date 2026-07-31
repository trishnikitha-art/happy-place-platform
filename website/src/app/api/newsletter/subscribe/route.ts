import { NextRequest, NextResponse } from "next/server";
import { createSubscriber, applyWebsiteSubscriberTag, applyHomepageSignupTag, enrollInWelcomeSequence } from "@/lib/kit";
import { logEvent } from "@/lib/events";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, source } = body;

    // Extract acquisition metadata
    const referrer = request.headers.get("referer") || undefined;
    const userAgent = request.headers.get("user-agent") || "";
    const deviceClass = userAgent.includes("Mobile") ? "mobile" : userAgent.includes("Tablet") ? "tablet" : "desktop";
    const landingPage = request.url;

    // Extract UTM parameters from URL
    const url = new URL(request.url);
    const utmSource = url.searchParams.get("utm_source") || undefined;
    const utmMedium = url.searchParams.get("utm_medium") || undefined;
    const utmCampaign = url.searchParams.get("utm_campaign") || undefined;
    const utmContent = url.searchParams.get("utm_content") || undefined;
    const utmTerm = url.searchParams.get("utm_term") || undefined;

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Create subscriber in Kit
    const result = await createSubscriber({
      email_address: email,
      first_name: firstName || undefined,
      fields: {
        acquisition_source: source || "website",
        signup_date: new Date().toISOString(),
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || "Failed to subscribe" },
        { status: 500 }
      );
    }

    // Automatically apply tags
    const subscriberId = result.subscriber.id;
    if (subscriberId) {
      // Apply "Website Subscriber" tag
      await applyWebsiteSubscriberTag(subscriberId);

      // Apply source-specific tag
      if (source === "homepage") {
        await applyHomepageSignupTag(subscriberId);
      }

      // Enroll in welcome sequence
      await enrollInWelcomeSequence(subscriberId);

      // Log HPP event
      logEvent("NewsletterSignup", {
        email,
        firstName,
        subscriberId,
        tags: ["Website Subscriber", source === "homepage" ? "Homepage Signup" : null].filter(Boolean),
      }, {
        acquisitionSource: source || "website",
        landingPage,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        deviceClass,
      });
    }

    return NextResponse.json({
      success: true,
      subscriber: result.subscriber,
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
