"use client";

import { useState, useSyncExternalStore } from "react";

const CONSENT_STORAGE_KEY = "prithiviex-cookie-consent";
const CONSENT_CHANGE_EVENT = "prithiviex-consent-change";

type ConsentChoice = "accepted" | "rejected";

function subscribeToConsent(callback: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
}

function hasAcceptedConsent() {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function CookieConsentBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const isAccepted = useSyncExternalStore(
    subscribeToConsent,
    hasAcceptedConsent,
    () => false,
  );

  function saveConsent(choice: ConsentChoice) {
    const analyticsConsent = choice === "accepted" ? "granted" : "denied";

    window.gtag?.("consent", "update", {
      analytics_storage: analyticsConsent,
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });

    try {
      if (choice === "accepted") {
        localStorage.setItem(CONSENT_STORAGE_KEY, choice);
      } else {
        localStorage.removeItem(CONSENT_STORAGE_KEY);
      }
      window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
    } catch {
      // The current page still respects the choice when storage is unavailable.
    }

    setIsDismissed(true);
  }

  if (isAccepted || isDismissed) {
    return null;
  }

  return (
    <section
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:flex sm:items-center sm:gap-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex-1">
        <h2 className="text-base font-semibold">Analytics cookies</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          We use Google Analytics to understand how visitors use PrithivieX.
          If you reject analytics cookies, Google Analytics receives only limited,
          cookieless measurements and does not set analytics cookies.
        </p>
      </div>
      <div className="mt-4 flex shrink-0 gap-3 sm:mt-0">
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          onClick={() => saveConsent("rejected")}
          type="button"
        >
          Reject
        </button>
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          onClick={() => saveConsent("accepted")}
          type="button"
        >
          Accept
        </button>
      </div>
    </section>
  );
}
