'use client';
import { BaseResources } from '../../components/tables/BaseResources';

export default function ResourcesPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-zinc-100">Campaign Resources</h1>
      <BaseResources />
    </div>
  );
}
