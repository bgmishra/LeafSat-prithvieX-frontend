"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Mail, MapPin, Phone, Satellite, Send } from "lucide-react";
import { apiRequest, getErrorMessage } from "@/api/client";

const contactInfo = [
  { icon: MapPin, label: "Address", value: "Unit 82a JAMES CARTER ROAD - MILDENHALL BURY ST. EDMUNDS , IP287DE", href: "https://maps.google.com/?q=Robert-Bosch-Str.+7,+64293+Darmstadt,+Germany" },
  { icon: Phone, label: "Phone", value: "+49 6151 3943470", href: "tel: +44 7576528675" },
  { icon: Mail, label: "Email", value: "info@landscripts.com", href: "mailto:info@landscripts.com" },
];

type FormState = { name: string; email: string; organization: string; phone: string; message: string };
const emptyForm: FormState = { name: "", email: "", organization: "", phone: "", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  function update(key: keyof FormState) { return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value })); }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSubmitting(true); setError(""); try { await apiRequest("/api/v1/contact/", { method: "POST", body: JSON.stringify(form) }); setSubmitted(true); setForm(emptyForm); } catch (caught) { setError(getErrorMessage(caught)); } finally { setSubmitting(false); } }

  return <div className="min-h-screen bg-white text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6"><Link className="flex items-center gap-2.5 font-bold tracking-tight" href="/"><span className="grid size-8 place-items-center rounded-md bg-gradient-to-br from-teal-600 to-cyan-800 text-white shadow"><Satellite className="size-4" /></span><span className="text-teal-700"></span></Link><Link className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-950" href="/"><ArrowLeft className="size-4" />Back to home</Link></div></header>
    <main className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <section className="relative flex flex-col justify-between overflow-hidden bg-teal-50 px-8 py-12 lg:px-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(circle_at_20%_20%,rgba(45,212,191,.35),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(14,116,144,.18),transparent_40%)]" />
        <div className="relative">
          <h1 className="text-5xl font-bold tracking-tight text-teal-900 lg:text-6xl">Information</h1>
          <p className="mt-4 max-w-sm text-lg leading-relaxed text-teal-950/80">Reach out for demos, enterprise pilots, or support. We typically respond within one business day.</p>
        </div>
        <div className="relative mt-14">
          <h2 className="text-3xl font-semibold text-teal-950">PrithviEx</h2>
          <div className="mt-10 space-y-6">{contactInfo.map(({ icon: Icon, label, value, href }) =>
            <a className="group flex items-start gap-5 text-teal-950 transition hover:text-teal-800" href={href} key={label} rel={label === "Address" ? "noreferrer" : undefined} target={label === "Address" ? "_blank" : undefined}>
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-teal-700 text-white shadow-sm transition group-hover:scale-105"><Icon className="size-5" /></span>
              <span className="pt-1">
                <span className="block text-xs font-semibold uppercase tracking-wider text-teal-950/60">{label}</span>
                <span className="mt-1 block text-sm font-medium">{value}</span></span></a>)}
          </div>
        </div>
        <p className="relative mt-12 text-xs text-teal-950/60">© {new Date().getFullYear()} PrithviEx</p>
      </section>
      <section className="flex items-center px-8 py-12 lg:px-16 lg:py-20">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-sm leading-relaxed text-slate-600">
            <strong className="text-slate-950">We are excited to hear from you.</strong>
            For technical reasons, we ask you kindly to formulate your request in English. Thank you.</p>
          {submitted ? <div className="mt-10 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
            <strong>Message received.</strong>
            <p className="mt-1 text-sm">Thank you for contacting PrithivieX. Our team will respond as soon as possible.</p>
            <button className="mt-4 text-sm font-semibold underline" onClick={() => setSubmitted(false)} type="button">Send another message</button>
          </div> :
            <form className="mt-10 space-y-6" onSubmit={submit}>
              <Field label="Name" required><input className="contact-input" onChange={update("name")} placeholder="Your full name" required value={form.name} />
              </Field>
              <Field label="Email" required>
                <input className="contact-input" onChange={update("email")} placeholder="you@organization.com" required type="email" value={form.email} /></Field>
                <Field label="Name of your organization" required>
                  <input className="contact-input" onChange={update("organization")} placeholder="Company or institution" required value={form.organization} /></Field>
                  <Field label="Phone (please include country code)" optional>
                    <input className="contact-input" onChange={update("phone")} placeholder="+49 123 4567890" type="tel" value={form.phone} /></Field>
                    <Field label="How can we help?" required><textarea className="contact-input min-h-32 resize-y py-3" onChange={update("message")} placeholder="Describe what you would like us to help you with." required rows={5} value={form.message} /></Field>{error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}<button className="contact-submit flex h-12 w-full items-center justify-center gap-2 rounded-lg !border !border-teal-600/15 !bg-gradient-to-r !from-teal-200 !to-emerald-200 text-sm font-bold !text-slate-900 shadow-[0_5px_14px_rgba(20,184,166,.18)] transition duration-200 hover:-translate-y-0.5 hover:!from-teal-100 hover:!to-emerald-100 hover:shadow-[0_8px_18px_rgba(20,184,166,.24)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200/70 active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60" disabled={submitting} type="submit"><Send className="size-4" />{submitting ? "Sending..." : "Submit"}</button></form>}</div></section>
    </main><style jsx>{`.contact-input{width:100%;height:48px;border:1px solid #cbd5e1;border-radius:8px;padding:0 14px;background:#fff;font-size:14px;color:#0f172a;transition:border-color .15s,box-shadow .15s}.contact-input:focus{outline:none;border-color:#0f766e;box-shadow:0 0 0 3px rgba(13,148,136,.14)}textarea.contact-input{height:auto}.contact-submit{background:linear-gradient(90deg,#99f6e4,#bbf7d0)!important;border:1px solid rgba(13,148,136,.14)!important;box-shadow:0 8px 20px rgba(13,148,136,.24),0 2px 5px rgba(15,23,42,.08)!important}.contact-submit:hover{box-shadow:0 12px 26px rgba(13,148,136,.30),0 3px 7px rgba(15,23,42,.10)!important}`}</style>
  </div>;
}

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) { return <label className="block"><span className="text-sm font-medium text-slate-800">{label}{required ? <span className="ml-1 text-teal-700">*</span> : null}{optional ? <span className="ml-1 font-normal text-slate-500">(optional)</span> : null}</span><span className="mt-2 block">{children}</span></label>; }
