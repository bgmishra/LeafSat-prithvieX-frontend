import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-950">LeafSat is invitation only</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          There is no open sign-up. Your company is invited by a LeafSat administrator, and your
          company&apos;s client super admin invites your engineers and field supervisors. Every
          invitation arrives as a single-use link by email.
        </p>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Already have an invitation? Open the link from your email to finish setting up your
          account.
        </p>
        <Link
          className="mt-6 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
          href="/login"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
