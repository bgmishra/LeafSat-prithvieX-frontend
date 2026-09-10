"use client";

import { useEffect, useRef, useState } from "react";
import { CreditCard, HelpCircle, LoaderCircle, Lock, Wallet, X } from "lucide-react";
import { loadStripe, Stripe, StripeCardCvcElement, StripeCardExpiryElement, StripeCardNumberElement } from "@stripe/stripe-js";
import { apiRequest } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
const paymentIntentPath = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_INTENT_PATH || "/api/v1/payments/processing-intent/";
const countryOptions = [
  { code: "NP", name: "Nepal" },
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
];

type StripePaymentPanelProps = {
  onCancel: () => void;
  onPaymentSuccess: () => Promise<void>;
  orderName: string;
  processing: boolean;
  serviceName?: string;
  total: number;
};

export function StripePaymentPanel({
  onCancel,
  onPaymentSuccess,
  orderName,
  processing,
  serviceName,
  total,
}: StripePaymentPanelProps) {
  const cardNumberMountRef = useRef<HTMLDivElement | null>(null);
  const cardExpiryMountRef = useRef<HTMLDivElement | null>(null);
  const cardCvcMountRef = useRef<HTMLDivElement | null>(null);
  const cardNumberElementRef = useRef<StripeCardNumberElement | null>(null);
  const cardExpiryElementRef = useRef<StripeCardExpiryElement | null>(null);
  const cardCvcElementRef = useRef<StripeCardCvcElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("NP");
  const [cardError, setCardError] = useState("");
  const [stripeError, setStripeError] = useState(stripePromise ? "" : "Stripe publishable key is missing.");
  const [readyFields, setReadyFields] = useState({ cvc: false, expiry: false, number: false });
  const [paying, setPaying] = useState(false);
  const isBusy = processing || paying;
  const cardReady = readyFields.cvc && readyFields.expiry && readyFields.number;

  useEffect(() => {
    let active = true;

    if (!stripePromise) {
      return;
    }

    stripePromise
      .then((stripe) => {
        if (!active || !stripe || !cardNumberMountRef.current || !cardExpiryMountRef.current || !cardCvcMountRef.current) {
          return;
        }

        const elements = stripe.elements();
        const elementOptions = {
          style: {
            base: {
              color: "#111827",
              fontFamily: "inherit",
              fontSize: "18px",
              fontSmoothing: "antialiased",
              "::placeholder": {
                color: "#111827",
              },
            },
            invalid: {
              color: "#dc2626",
            },
          },
        };
        const cardNumber = elements.create("cardNumber", {
          ...elementOptions,
          showIcon: true,
        });
        const cardExpiry = elements.create("cardExpiry", elementOptions);
        const cardCvc = elements.create("cardCvc", elementOptions);

        cardNumber.mount(cardNumberMountRef.current);
        cardExpiry.mount(cardExpiryMountRef.current);
        cardCvc.mount(cardCvcMountRef.current);

        const handleChange = (event: { error?: { message?: string } }) => {
          setCardError(event.error?.message || "");
        };
        cardNumber.on("change", handleChange);
        cardExpiry.on("change", handleChange);
        cardCvc.on("change", handleChange);
        cardNumber.on("ready", () => setReadyFields((fields) => ({ ...fields, number: true })));
        cardExpiry.on("ready", () => setReadyFields((fields) => ({ ...fields, expiry: true })));
        cardCvc.on("ready", () => setReadyFields((fields) => ({ ...fields, cvc: true })));

        stripeRef.current = stripe;
        cardNumberElementRef.current = cardNumber;
        cardExpiryElementRef.current = cardExpiry;
        cardCvcElementRef.current = cardCvc;
      })
      .catch(() => {
        if (active) {
          setStripeError("Unable to load Stripe.");
        }
      });

    return () => {
      active = false;
      cardNumberElementRef.current?.destroy();
      cardExpiryElementRef.current?.destroy();
      cardCvcElementRef.current?.destroy();
      cardNumberElementRef.current = null;
      cardExpiryElementRef.current = null;
      cardCvcElementRef.current = null;
      stripeRef.current = null;
      setReadyFields({ cvc: false, expiry: false, number: false });
    };
  }, []);

  async function createPaymentIntent() {
    const data = await apiRequest<{ clientSecret?: string; client_secret?: string }>(paymentIntentPath, {
      auth: true,
      body: JSON.stringify({
        amount: total,
        orderName,
        serviceName,
      }),
      method: "POST",
    });
    const clientSecret = data.clientSecret || data.client_secret;

    if (!clientSecret) {
      throw new Error("Stripe payment did not return a client secret.");
    }

    return clientSecret;
  }

  async function handlePay() {
    const stripe = stripeRef.current;
    const cardNumber = cardNumberElementRef.current;

    if (!stripe || !cardNumber) {
      setStripeError("Stripe card details are not ready yet.");
      return;
    }

    setPaying(true);
    setStripeError("");
    setCardError("");

    try {
      const clientSecret = await createPaymentIntent();
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: {
            name: fullName.trim() || orderName || undefined,
            address: {
              country,
            },
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Payment could not be completed.");
      }

      if (result.paymentIntent?.status !== "succeeded") {
        throw new Error("Payment is not complete yet. Please try again.");
      }

      await onPaymentSuccess();
    } catch (caught) {
      setStripeError(caught instanceof Error ? caught.message : "Payment could not be completed.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-black uppercase text-slate-950">Payment method</h2>
        <HelpCircle className="size-5 text-slate-500" />
      </div>

      <div className="mt-7">
        <h3 className="text-base font-black text-slate-950">Select Payment Method</h3>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button className="rounded-xl border border-slate-200 p-5 text-center text-slate-500" disabled type="button">
            <Wallet className="mx-auto size-7" />
            <span className="mt-3 block font-black text-slate-950">User Balance</span>
            <span className="mt-1 block text-xs">Available: $1.50</span>
            <span className="mt-2 block text-xs">Insufficient for full payment</span>
          </button>
          <button className="rounded-xl border-2 border-slate-950 bg-slate-50 p-5 text-center" type="button">
            <CreditCard className="mx-auto size-7 text-slate-950" />
            <span className="mt-3 block font-black text-slate-950">Card <span className="font-semibold">(Active)</span></span>
            <span className="mt-1 block text-xs text-slate-600">Visa, Mastercard, Amex</span>
            <span className="mt-2 block text-xs text-slate-500">Secure card payment</span>
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">Add a card</h3>
          <button className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-950" disabled={isBusy} onClick={onCancel} type="button">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-5 space-y-3">
          <label className="block rounded-xl bg-slate-100 px-4 py-3">
            <span className="block text-xs text-slate-600">Card number</span>
            <div className="mt-1 min-h-7">
              <div ref={cardNumberMountRef} />
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block rounded-xl bg-slate-100 px-4 py-3">
              <span className="block text-xs text-slate-600">Expiration</span>
              <div className="mt-1 min-h-7">
                <div ref={cardExpiryMountRef} />
              </div>
            </label>
            <label className="block rounded-xl bg-slate-100 px-4 py-3">
              <span className="block text-xs text-slate-600">CVC</span>
              <div className="mt-1 min-h-7">
                <div ref={cardCvcMountRef} />
              </div>
            </label>
          </div>

          <label className="block rounded-xl bg-slate-100 px-4 py-3">
            <span className="block text-xs text-slate-600">Country or region</span>
            <select
              className="mt-1 h-7 w-full appearance-none bg-transparent text-lg text-slate-950 outline-none"
              onChange={(event) => setCountry(event.target.value)}
              value={country}
            >
              {countryOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Full name</span>
            <Input
              className="h-14 rounded-xl border-slate-300 bg-slate-100 px-4 text-lg shadow-none focus-visible:border-slate-950 focus-visible:ring-0"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name"
              value={fullName}
            />
          </label>

          <p className="text-center text-xs leading-relaxed text-slate-500">
            By continuing, you agree to create a Link account subject to the Terms and Privacy Policy.
          </p>

          {cardError ? <p className="text-sm font-medium text-red-600">{cardError}</p> : null}
          {stripeError ? <Alert variant="destructive">{stripeError}</Alert> : null}

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-black text-slate-950">
            <span>Total amount to pay</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <Button className="h-12 w-full bg-slate-950 font-black text-white hover:bg-slate-800" disabled={isBusy || !cardReady} onClick={handlePay} type="button">
            {isBusy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Lock className="mr-2 size-4" />}
            {isBusy ? "Processing..." : `Pay $${total.toFixed(2)}`}
          </Button>
          <Button className="h-10 w-full" disabled={isBusy} onClick={onCancel} type="button" variant="ghost">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
