import { SearchProvider } from '@/context/SearchContext';
import { useRestaurantSearch } from '@/hooks/useRestaurantSearch';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SearchForm } from '@/components/search/SearchForm';
import { ComparisonDashboard } from '@/components/results/ComparisonDashboard';
import { AnimatePresence } from 'framer-motion';

function AppContent() {
  const { search, cancelAll, reset, state } = useRestaurantSearch();

  const isActive = state.phase === 'searching';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-4 py-8">
        <AnimatePresence mode="wait">
          {state.phase === 'input' && (
            <SearchForm
              key="search"
              onSearch={search}
              isSearching={false}
            />
          )}

          {isActive && state.searchParams && (
            <ComparisonDashboard
              key="dashboard"
              agents={state.agents}
              searchParams={state.searchParams}
              searchStartedAt={state.searchStartedAt}
              searchCompletedAt={state.searchCompletedAt}
              onCancel={() => {
                cancelAll();
                reset();
              }}
              onReset={reset}
            />
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <SearchProvider>
      <AppContent />
    </SearchProvider>
  );
}
