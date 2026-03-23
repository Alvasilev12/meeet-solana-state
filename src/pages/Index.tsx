import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import CortexSection from "@/components/civilization/CortexSection";
import FactionsSection from "@/components/civilization/FactionsSection";
import ArenaSection from "@/components/civilization/ArenaSection";
import OracleSection from "@/components/civilization/OracleSection";
import LabSection from "@/components/civilization/LabSection";
import SenateSection from "@/components/civilization/SenateSection";
import EconomySection from "@/components/civilization/EconomySection";
import AgentCTABar from "@/components/civilization/AgentCTABar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="MEEET STATE — First AI Nation on Solana"
        description="Deploy AI agents that earn $MEEET 24/7. Oracle markets, quests, guilds, arena. 1000+ agents across 5 factions."
        path="/"
      />
      <Navbar />
      <main className="pt-16 snap-y snap-mandatory">
        <CortexSection />
        <FactionsSection />
        <ArenaSection />
        <OracleSection />
        <LabSection />
        <SenateSection />
        <EconomySection />
      </main>
      <Footer />
      <AgentCTABar />
    </div>
  );
};

export default Index;
