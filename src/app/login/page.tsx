import { Suspense } from "react";
import { LoginScreen } from "@/components/auth-forms";

// LoginScreen reads ?next= with useSearchParams, which needs a Suspense
// boundary on a statically prerendered page.
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
          Loading...
        </main>
      }
    >
      <LoginScreen />
    </Suspense>
  );
}
