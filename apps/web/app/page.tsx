
import GraphCanvas from '../components/graph/GraphCanvas';
import { BaseResources } from '../components/tables/BaseResources';

export default function Home() {
  return (
    <main className="bg-zinc-950 min-h-screen">
      <div className="relative h-screen w-full">
        <GraphCanvas />
      </div>
      <div className="container mx-auto p-4 pb-20">
        <BaseResources />
      </div>
    </main>
  );
}
