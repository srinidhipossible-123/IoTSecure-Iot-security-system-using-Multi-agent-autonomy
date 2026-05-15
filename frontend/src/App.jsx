import Navbar from './components/Navbar';
import Hero from './components/Hero';
import DeviceCarousel from './components/DeviceCarousel';
import ThreatTimeline from './components/ThreatTimeline';
import LiveTraffic from './components/LiveTraffic';
import AgentTraces from './components/AgentTraces';
import StatsGrid from './components/StatsGrid';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <div className="section-divider" />
        <LiveTraffic />
        <div className="section-divider" />
        <DeviceCarousel />
        <div className="section-divider" />
        <ThreatTimeline />
        <div className="section-divider" />
        <AgentTraces />
        <div className="section-divider" />
        <StatsGrid />
        <div className="section-divider" />
        <Footer />
      </main>
    </>
  );
}
