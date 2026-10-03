import React, { useEffect } from 'react';
import LandingNav from '../components/landing/LandingNav';
import LandingHero from '../components/landing/LandingHero';
import StatsStrip from '../components/landing/StatsStrip';
import Marquee from '../components/landing/Marquee';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import LandingEnd from '../components/landing/LandingEnd';
import VideoDialog from '../components/landing/VideoDialog';

export default function LandingPage() {
  useEffect(() => {
    document.title = 'FarmWise — Smart Farming Platform';
  }, []);

  return (
    <div className="screen on" id="s-landing">
      <LandingNav />
      <LandingHero />
      <StatsStrip />
      <Marquee />
      <FeaturesSection />
      <HowItWorksSection />
      <LandingEnd />
      <VideoDialog />
    </div>
  );
}
