'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import SiliconWafer from "@/components/SiliconWafer";
import SignalOverview from "@/components/SignalOverview";
import VendorIntelligence from "@/components/VendorIntelligence";
import HistoricalTrend from "@/components/HistoricalTrend";
import SystemArchitecture from "@/components/SystemArchitecture";
import PlatformView from "@/components/PlatformView";

const Index = () => {
  const [showPlatform, setShowPlatform] = useState(false);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Header />

      <div className="fixed inset-0 grid-overlay opacity-30 pointer-events-none" />

      <AnimatePresence mode="wait">
        {showPlatform ? (
          <motion.div
            key="platform"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            <PlatformView />
          </motion.div>
        ) : (
          <motion.div
            key="landing"
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <section className="relative min-h-[90vh] flex items-center justify-center pt-16">
              <SiliconWafer />

              <div className="container mx-auto px-6 relative z-10">
                <motion.div
                  className="max-w-3xl mx-auto text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                >
                  <motion.div
                    className="heading-technical mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Semiconductor Analytics
                  </motion.div>

                  <motion.h1
                    className="text-4xl md:text-6xl font-light tracking-tight text-foreground mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span className="text-gradient-silver">Supply chain tracking</span>
                    <br />
                    <span className="text-foreground-muted">at wafer-level scale</span>
                  </motion.h1>

                  <motion.p
                    className="text-lg text-foreground-muted max-w-xl mx-auto mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    Real-time risk signals, vendor data, and historical
                    analytics for semiconductor procurement workflows.
                  </motion.p>

                  <motion.div
                    className="flex items-center justify-center gap-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <button
                      onClick={() => setShowPlatform(true)}
                      className="px-6 py-3 bg-foreground text-background font-medium text-sm tracking-wide hover:bg-foreground/90 transition-colors"
                    >
                      ACCESS PLATFORM
                    </button>
                  </motion.div>
                </motion.div>

                <motion.div
                  className="absolute bottom-12 left-1/2 -translate-x-1/2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, y: [0, 8, 0] }}
                  transition={{
                    opacity: { delay: 1.5 },
                    y: { delay: 1.5, duration: 2, repeat: Infinity },
                  }}
                >
                  <div className="w-px h-16 bg-gradient-to-b from-transparent via-foreground-subtle to-transparent" />
                </motion.div>
              </div>
            </section>

            <section className="relative py-24">
              <div className="container mx-auto px-6">
                <motion.div
                  className="text-center mb-16"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  <span className="heading-technical mb-4 block">System Dashboard</span>
                  <h2 className="text-3xl font-light text-foreground">
                    Operations Center for Hardware Data
                  </h2>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="h-[300px]"
                  >
                    <SignalOverview result={null} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="h-[300px]"
                  >
                    <VendorIntelligence result={null} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="h-[300px]"
                  >
                    <HistoricalTrend result={null} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="h-[300px]"
                  >
                    <SystemArchitecture />
                  </motion.div>
                </div>
              </div>
            </section>

            <section className="relative py-24 border-t border-border-subtle">
              <div className="container mx-auto px-6">
                <motion.div
                  className="text-center mb-16"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  <span className="heading-technical mb-4 block">Capabilities</span>
                  <h2 className="text-3xl font-light text-foreground">
                    Engineered for Precision
                  </h2>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  {[
                    {
                      title: "Multi-Source Tracking",
                      description:
                        "Aggregate signals from vendor APIs, market feeds, and secondary sources in real-time.",
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          className="w-6 h-6 stroke-accent"
                          fill="none"
                          strokeWidth="1.5"
                        >
                          <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" />
                        </svg>
                      ),
                    },
                    {
                      title: "Risk Assessment",
                      description:
                        "Automated analysis identifies potential supply disruptions before they impact your pipeline.",
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          className="w-6 h-6 stroke-signal"
                          fill="none"
                          strokeWidth="1.5"
                        >
                          <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
                        </svg>
                      ),
                    },
                    {
                      title: "Technical Insights",
                      description:
                        "Decision-grade data for procurement strategy and vendor diversification.",
                      icon: (
                        <svg
                          viewBox="0 0 24 24"
                          className="w-6 h-6 stroke-foreground"
                          fill="none"
                          strokeWidth="1.5"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M3 9h18M9 21V9" />
                        </svg>
                      ),
                    },
                  ].map((feature, i) => (
                    <motion.div
                      key={feature.title}
                      className="glass-panel p-6 rounded-sm"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                    >
                      <div className="mb-4">{feature.icon}</div>
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-foreground-muted leading-relaxed">
                        {feature.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border-subtle py-12">
              <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-foreground-muted">
                      © 2026 SiliconSignal
                    </span>
                  </div>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
