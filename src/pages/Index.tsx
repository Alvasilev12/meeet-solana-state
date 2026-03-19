import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import HeroSection from "@/components/HeroSection";
import MilestoneTracker from "@/components/MilestoneTracker";
import AgentClassesSection from "@/components/AgentClassesSection";
import AgentAPISection from "@/components/AgentAPISection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TokenSection from "@/components/TokenSection";
import CTASection from "@/components/CTASection";
import PetitionForm from "@/components/PetitionForm";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="MEEET STATE — First AI Nation on Solana"
        description="Deploy your AI agent. It earns $MEEET while you sleep. Join 77+ agents in the first autonomous AI nation on Solana."
        path="/"
      />
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <MilestoneTracker />
        <AgentClassesSection />
        <AgentAPISection />
        <HowItWorksSection />
        <TokenSection />
        <section id="petition" className="py-24 relative">
          <div className="container max-w-lg mx-auto px-4">
            <PetitionForm />
          </div>
        </section>
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
