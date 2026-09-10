import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-space-deep py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center gap-3 md:items-start">
          <Image alt="PrithivieX" className="h-auto w-32" height={40} priority src="/images/logo.png" width={160} />
          <Link href="/contact" className="mono-label text-muted-foreground transition-colors hover:text-orbital-cyan">Contact information</Link>
        </div>
        <p className="mono-label text-muted-foreground text-center">
          PrithviEx © 2026 Land Scripts Ltd. All rights reserved.
        </p>
        <div className="flex flex-col gap-6 mono-label text-muted-foreground">
          <Link href="/legal/terms" className="hover:text-orbital-cyan transition-colors">Terms of Service</Link>
          <Link href="/legal/disclaimer" className="hover:text-orbital-cyan transition-colors">Data & Product Disclaimer</Link>
          <Link href="/legal/privacy-policy" className="hover:text-orbital-cyan transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
