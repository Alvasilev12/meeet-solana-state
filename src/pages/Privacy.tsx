import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageWrapper from "@/components/PageWrapper";
import SEOHead from "@/components/SEOHead";

const Privacy = () => (
  <PageWrapper>
    <SEOHead title="Privacy Policy — MEEET STATE" description="Privacy Policy for MEEET STATE platform." path="/privacy" />
    <Navbar />
    <main className="pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold font-display text-foreground">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground">Last updated: April 6, 2026</p>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>MEEET STATE respects your privacy. This policy explains how we collect, use, and protect your information.</p>
          <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
          <p>We collect information you provide directly, such as email addresses and wallet addresses, as well as usage data including interactions with AI agents and platform activity.</p>
          <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>Your information is used to provide platform services, improve user experience, process transactions, and maintain security of the ecosystem.</p>
          <h2 className="text-lg font-semibold text-foreground">3. Data Protection</h2>
          <p>We implement industry-standard security measures to protect your data. Blockchain transactions are public by nature and cannot be deleted.</p>
          <h2 className="text-lg font-semibold text-foreground">4. Third-Party Services</h2>
          <p>We may use third-party analytics and infrastructure providers. These services have their own privacy policies.</p>
          <div className="mt-8 p-4 rounded-lg border border-border bg-muted/30">
            <p className="text-xs text-muted-foreground italic">This document is a placeholder and will be updated with a comprehensive privacy policy. For questions, contact the MEEET STATE team.</p>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </PageWrapper>
);

export default Privacy;
