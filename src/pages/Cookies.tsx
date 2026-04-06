import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageWrapper from "@/components/PageWrapper";
import SEOHead from "@/components/SEOHead";

const Cookies = () => (
  <PageWrapper>
    <SEOHead title="Cookie Policy — MEEET STATE" description="Cookie Policy for MEEET STATE platform." path="/cookies" />
    <Navbar />
    <main className="pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold font-display text-foreground">Cookie Policy</h1>
        <p className="text-xs text-muted-foreground">Last updated: April 6, 2026</p>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>This Cookie Policy explains how MEEET STATE uses cookies and similar technologies.</p>
          <h2 className="text-lg font-semibold text-foreground">1. What Are Cookies</h2>
          <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and improve your experience.</p>
          <h2 className="text-lg font-semibold text-foreground">2. Cookies We Use</h2>
          <p><strong>Essential cookies:</strong> Required for platform functionality, authentication, and security.</p>
          <p><strong>Analytics cookies:</strong> Help us understand how users interact with the platform to improve our services.</p>
          <p><strong>Preference cookies:</strong> Remember your settings such as language and theme preferences.</p>
          <h2 className="text-lg font-semibold text-foreground">3. Managing Cookies</h2>
          <p>You can control cookies through your browser settings. Disabling essential cookies may affect platform functionality.</p>
          <div className="mt-8 p-4 rounded-lg border border-border bg-muted/30">
            <p className="text-xs text-muted-foreground italic">This document is a placeholder and will be updated with a comprehensive cookie policy. For questions, contact the MEEET STATE team.</p>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </PageWrapper>
);

export default Cookies;
