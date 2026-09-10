import { Hero } from "@/components/frontpage/Hero";
import { ServiceColumn } from "@/components/frontpage/ServiceColumn";
import { ExtractionColumn } from "@/components/frontpage/ExtractionColumn";
import { Workflow } from "@/components/frontpage/Workflow";
import { Footer } from "@/components/frontpage/Footer";
// import PrithvieXHome from "@/components/PrithvieXHome";

export default function Home() {
  return (
    
    <div className="-mx-1 min-h-screen bg-background text-foreground antialiased sm:mx-0">
        <Hero />
        <section id="services" className="relative py-24 border-t border-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
              <ServiceColumn />
              <div id="extraction">
                <ExtractionColumn />
              </div>
            </div>
          </div>
        </section>
        <Workflow />
  
      <Footer />
    </div>

    // <PrithvieXHome />
    
  );
}
