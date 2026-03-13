'use client';

import ScanForm from '@/components/ScanForm';
import ResultsTable from '@/components/ResultsTable';
import BentoCard from '@/components/BentoCard';
import { ScrollFadeIn } from '@/components/ScrollFadeIn';

export default function HomePage() {
  return (
    <div className="bento-grid">
      {/* Hero Section - Compact */}
      <BentoCard delay={0} className="bento-hero">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Find Your Hardware in Seconds
        </h2>
        <p className="text-sm text-gray-600">
          Scan 4+ retailers simultaneously for real-time pricing and availability.
        </p>
      </BentoCard>

      {/* Scan Form - Prominent */}
      <BentoCard delay={0.1} className="bento-scan" enableHover3D={false}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Start a Scan
        </h3>
        <ScanForm />
      </BentoCard>

      {/* Info Cards - Sidebar */}
      <BentoCard delay={0.15} className="bento-info-1 bg-gradient-to-br from-blue-50 to-blue-100/50">
        <div className="text-3xl mb-2">⚡</div>
        <h4 className="font-semibold text-blue-900 mb-1">Fast Scans</h4>
        <p className="text-sm text-blue-700">
          Results in under 45 seconds across multiple vendors
        </p>
      </BentoCard>

      <BentoCard delay={0.2} className="bento-info-2 bg-gradient-to-br from-green-50 to-green-100/50">
        <div className="text-3xl mb-2">📊</div>
        <h4 className="font-semibold text-green-900 mb-1">Price Tracking</h4>
        <p className="text-sm text-green-700">
          Compare prices and detect changes automatically
        </p>
      </BentoCard>

      <BentoCard delay={0.25} className="bento-info-3 bg-gradient-to-br from-purple-50 to-purple-100/50">
        <div className="text-3xl mb-2">🤖</div>
        <h4 className="font-semibold text-purple-900 mb-1">AI-Powered</h4>
        <p className="text-sm text-purple-700">
          Uses TinyFish Web Agents for reliable extraction
        </p>
      </BentoCard>

      {/* Results Section - Full Width */}
      <ScrollFadeIn className="bento-results" direction="up" delay={0.3}>
        <ResultsTable />
      </ScrollFadeIn>
    </div>
  );
}
