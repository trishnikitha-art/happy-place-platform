/**
 * Workbench Reconciliation Page
 * 
 * Browser-based interface to execute static media reconciliation.
 * This page can use actual Workbench cookies for authentication.
 * 
 * POST /api/admin/diagnostic/reconcile-static-media
 */

'use client';

import { useState } from 'react';

export default function ReconcilePage() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const executeReconciliation = async () => {
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/diagnostic/reconcile-static-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // This works in browser context
      });

      const data = await response.json();
      setResult(data);

      if (!response.ok) {
        setError(data.error || 'Reconciliation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Static Media Reconciliation</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">What This Does</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Loads canonical media.v1.json</li>
            <li>Enumerates production MEDIA_KV</li>
            <li>Restores missing canonical records with storage: "static"</li>
            <li>Repairs incomplete static records</li>
            <li>Preserves valid R2 records</li>
            <li>Preserves orphan KV records</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Prerequisites</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>You must be logged into Workbench</li>
            <li>Your session must have administrative access</li>
          </ul>
        </div>

        <button
          onClick={executeReconciliation}
          disabled={isExecuting}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isExecuting ? 'Executing...' : 'Execute Reconciliation'}
        </button>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Reconciliation Result</h3>
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Verdict:</span>{' '}
                <span className={result.verdict === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>
                  {result.verdict}
                </span>
              </div>
              <div>
                <span className="font-semibold">Test ID:</span> {result.testId}
              </div>
              <div>
                <span className="font-semibold">Total Canonical:</span> {result.evidence?.totalCanonical}
              </div>
              <div>
                <span className="font-semibold">Total KV Records:</span> {result.evidence?.totalKvRecords}
              </div>
              <div>
                <span className="font-semibold">Repaired:</span> {result.evidence?.repaired}
              </div>
              <div>
                <span className="font-semibold">Preserved:</span> {result.evidence?.preserved}
              </div>
              <div>
                <span className="font-semibold">Failed:</span> {result.evidence?.failed}
              </div>
              
              {result.evidence?.classification && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Classification:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Missing: {result.evidence.classification.missing}</li>
                    <li>Incomplete: {result.evidence.classification.incomplete}</li>
                    <li>Valid Static: {result.evidence.classification.validStatic}</li>
                    <li>Valid R2: {result.evidence.classification.validR2}</li>
                    <li>Orphan: {result.evidence.classification.orphan}</li>
                  </ul>
                </div>
              )}

              {result.evidence?.errors && Object.keys(result.evidence.errors).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2 text-red-600">Errors:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {Object.entries(result.evidence.errors).map(([id, err]) => (
                      <li key={id}>
                        <span className="font-mono">{id}</span>: {String(err)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
