import { useDiscoveryContext } from '@/context/DiscoveryContext';
import { ExecutionLogPanel } from '@/components/logs/ExecutionLogPanel';
import { ResultsGrid } from './ResultsGrid';

export function Dashboard() {
  const { state } = useDiscoveryContext();

  return (
    <div className="min-h-[80vh] container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Left Panel: Execution Logs */}
        <aside className="lg:sticky lg:top-4 h-fit">
          <ExecutionLogPanel logs={state.logs} phase={state.phase} />
        </aside>

        {/* Center/Right Panel: Results Grid */}
        <main>
          <ResultsGrid
            agents={state.agents}
            phase={state.phase}
            userInput={state.userInput || ''}
          />
        </main>
      </div>
    </div>
  );
}
