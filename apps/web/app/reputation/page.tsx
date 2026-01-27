'use client';
import { ReputationTable } from '../../components/tables/ReputationTable';

export default function ReputationPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Faction Reputation</h1>
      <ReputationTable />
    </div>
  );
}
