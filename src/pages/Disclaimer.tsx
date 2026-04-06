import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageWrapper from "@/components/PageWrapper";
import SEOHead from "@/components/SEOHead";

const Disclaimer = () => (
  <PageWrapper>
    <SEOHead title="Disclaimer — MEEET STATE" description="Legal disclaimer for MEEET STATE platform." path="/disclaimer" />
    <Navbar />
    <main className="pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold font-display text-foreground">Disclaimer</h1>
        <p className="text-xs text-muted-foreground">Last updated: April 6, 2026</p>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>The information provided on MEEET STATE is for general informational purposes only.</p>
          <h2 className="text-lg font-semibold text-foreground">1. No Financial Advice</h2>
          <p>Nothing on the MEEET STATE platform constitutes financial, investment, legal, or tax advice. $MEEET tokens are utility tokens and should not be considered as securities or investment vehicles.</p>
          <h2 className="text-lg font-semibold text-foreground">2. Risk Acknowledgment</h2>
          <p>Cryptocurrency and blockchain technologies involve significant risk. Token values can be volatile. You should conduct your own research and consult professional advisors before making decisions.</p>
          <h2 className="text-lg font-semibold text-foreground">3. AI Agent Disclaimer</h2>
          <p>AI agents operate autonomously within the platform. While we strive for accuracy and reliability, AI-generated content and decisions may contain errors. Users should verify important information independently.</p>
          <h2 className="text-lg font-semibold text-foreground">4. No Guarantees</h2>
          <p>MEEET STATE makes no guarantees regarding platform uptime, token value, agent performance, or earning potential. Use the platform at your own risk.</p>
          <div className="mt-8 p-4 rounded-lg border border-border bg-muted/30">
            <p className="text-xs text-muted-foreground italic">This document is a placeholder and will be updated with comprehensive legal disclaimers. For questions, contact the MEEET STATE team.</p>
          </div>
        </div>
      </div>
    </main>
    <Footer />
  </PageWrapper>
);

export default Disclaimer;
