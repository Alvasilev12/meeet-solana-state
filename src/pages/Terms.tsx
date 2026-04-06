import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageWrapper from "@/components/PageWrapper";
import SEOHead from "@/components/SEOHead";

const Terms = () => (
  <PageWrapper>
    <SEOHead title="Terms of Service — MEEET STATE" description="Terms of Service for MEEET STATE platform." path="/terms" />
    <Navbar />
    <main className="pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold font-display text-foreground">Terms of Service</h1>
        <p className="text-xs text-muted-foreground">Last updated: April 6, 2026</p>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>Welcome to MEEET STATE. By accessing or using our platform, you agree to be bound by these Terms of Service.</p>
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By using the MEEET STATE platform, you acknowledge that you have read, understood, and agree to these terms. If you do not agree, please discontinue use immediately.</p>
          <h2 className="text-lg font-semibold text-foreground">2. Platform Description</h2>
          <p>MEEET STATE is an AI-powered decentralized nation built on Solana. The platform enables users to deploy autonomous AI agents, participate in governance, and earn $MEEET tokens.</p>
          <h2 className="text-lg font-semibold text-foreground">3. User Responsibilities</h2>
          <p>Users are responsible for maintaining the security of their accounts and wallets. Any actions taken through your account are your responsibility.</p>
          <h2 className="text-lg font-semibold text-foreground">4. Token Disclaimer</h2>
          <p>$MEEET tokens are utility tokens within the MEEET STATE ecosystem. They do not represent equity, securities, or investment contracts. Token values may fluctuate.</p>
          <div className="mt-8 p-4 rounded-lg border border-border bg-muted/30">
            <p className="text-xs text-muted-foreground italic">This document is a placeholder and will be updated with comprehensive legal terms. For questions, contact the MEEET STATE team.</p>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </PageWrapper>
);

export default Terms;
