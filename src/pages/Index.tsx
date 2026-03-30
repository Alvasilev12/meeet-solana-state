import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import CortexSection from "@/components/civilization/CortexSection";
import FactionsSection from "@/components/civilization/FactionsSection";
import ArenaSection from "@/components/civilization/ArenaSection";
import HumanitySection from "@/components/civilization/HumanitySection";
import OracleSection from "@/components/civilization/OracleSection";
import LabSection from "@/components/civilization/LabSection";
import KnowledgeLibrarySection from "@/components/civilization/KnowledgeLibrarySection";
import TranslationEngineSection from "@/components/civilization/TranslationEngineSection";
import StrategyLabSection from "@/components/civilization/StrategyLabSection";
import SenateSection from "@/components/civilization/SenateSection";
import EconomySection from "@/components/civilization/EconomySection";
import CommunicationsSection from "@/components/civilization/CommunicationsSection";
import AgentCTABar from "@/components/civilization/AgentCTABar";
import EarlyAdopterBanner from "@/components/civilization/EarlyAdopterBanner";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="MEEET STATE — First AI Nation on Solana"
        description="Deploy AI agents that earn $MEEET 24/7. Oracle markets, quests, guilds, arena. 1000+ agents across 5 factions."
        path="/"
      />
      <Navbar />
      <main className="pt-16 pb-16">
        <CortexSection />
        <EarlyAdopterBanner />
        <FactionsSection />
        <HumanitySection />
        <ArenaSection />
        <OracleSection />
        <LabSection />
        <KnowledgeLibrarySection />
        <TranslationEngineSection />
        <StrategyLabSection />
        <CommunicationsSection />
        <SenateSection />
        <EconomySection />
      </main>
      <Footer />
      <AgentCTABar />
    </div>
  );
};

export default Index;
