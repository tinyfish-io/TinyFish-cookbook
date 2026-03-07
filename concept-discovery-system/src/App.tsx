import { AnimatePresence, motion } from 'framer-motion';
import { DiscoveryProvider, useDiscoveryContext } from './context/DiscoveryContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { InputForm } from './components/input/InputForm';
import { Dashboard } from './components/results/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { state } = useDiscoveryContext();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <ErrorBoundary>
        <AnimatePresence mode="wait">
          {state.phase === 'input' ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <InputForm />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </ErrorBoundary>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <DiscoveryProvider>
      <AppContent />
    </DiscoveryProvider>
  );
}
