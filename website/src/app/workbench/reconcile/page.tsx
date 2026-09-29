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
  const [step, setStep] = useState<'idle' | 'media' | 'assignments' | 'complete'>('idle');
  const [mediaResult, setMediaResult] = useState<any>(null);
  const [assignmentResult, setAssignmentResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const executeReconciliation = async () => {
    setIsExecuting(true);
    setError(null);
    setMediaResult(null);
    setAssignmentResult(null);
    setStep('media');

    try {
      // Step 1: Reconcile static media
      const mediaResponse = await fetch('/api/admin/diagnostic/reconcile-static-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const mediaData = await mediaResponse.json();
      setMediaResult(mediaData);

      if (!mediaResponse.ok) {
        setError(`Media reconciliation failed: ${mediaData.error || 'Unknown error'}`);
        setIsExecuting(false);
        setStep('idle');
        return;
      }

      if (mediaData.verdict !== 'SUCCESS') {
        setError(`Media reconciliation verdict: ${mediaData.verdict}`);
        setIsExecuting(false);
        setStep('idle');
        return;
      }

      // Step 2: Reconcile assignments
      setStep('assignments');
      const assignmentResponse = await fetch('/api/admin/diagnostic/reconcile-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const assignmentData = await assignmentResponse.json();
      setAssignmentResult(assignmentData);

      if (!assignmentResponse.ok) {
        setError(`Assignment reconciliation failed: ${assignmentData.error || 'Unknown error'}`);
        setIsExecuting(false);
        setStep('idle');
        return;
      }

      if (assignmentData.verdict !== 'SUCCESS') {
        setError(`Assignment reconciliation verdict: ${assignmentData.verdict}`);
        setIsExecuting(false);
        setStep('idle');
        return;
      }

      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsExecuting(false);
      setStep('idle');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Authority Reconciliation</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">What This Does</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Step 1: Static Media Reconciliation</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Loads canonical media.v1.json</li>
                <li>Enumerates production MEDIA_KV</li>
                <li>Restores missing canonical records with storage: "static"</li>
                <li>Repairs incomplete static records</li>
                <li>Preserves valid R2 records</li>
                <li>Preserves orphan KV records</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Step 2: Assignment Reconciliation</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Loads canonical projects.v1.json</li>
                <li>Loads canonical brand.v1.json</li>
                <li>Loads canonical services.v1.json</li>
                <li>Reconciles project media assignments</li>
                <li>Reconciles brand assignments</li>
                <li>Reconciles service card assignments</li>
                <li>Uses authoritative storeServiceCardAssignment()</li>
                <li>Validates media IDs against canonical authority</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Prerequisites</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>You must be logged into Workbench</li>
            <li>Your session must have administrative access</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Current Status</h2>
          <div className="flex items-center gap-2">
            {step === 'idle' && <span className="text-gray-600">Ready to execute</span>}
            {step === 'media' && <span className="text-blue-600">Executing media reconciliation...</span>}
            {step === 'assignments' && <span className="text-blue-600">Executing assignment reconciliation...</span>}
            {step === 'complete' && <span className="text-green-600">✓ Complete</span>}
          </div>
        </div>

        <button
          onClick={executeReconciliation}
          disabled={isExecuting}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isExecuting ? 'Executing...' : 'Execute Full Reconciliation'}
        </button>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {mediaResult && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Step 1: Media Reconciliation Result</h3>
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Verdict:</span>{' '}
                <span className={mediaResult.verdict === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>
                  {mediaResult.verdict}
                </span>
              </div>
              <div>
                <span className="font-semibold">Test ID:</span> {mediaResult.testId}
              </div>
              <div>
                <span className="font-semibold">Total Canonical:</span> {mediaResult.evidence?.totalCanonical}
              </div>
              <div>
                <span className="font-semibold">Total KV Records:</span> {mediaResult.evidence?.totalKvRecords}
              </div>
              <div>
                <span className="font-semibold">Repaired:</span> {mediaResult.evidence?.repaired}
              </div>
              <div>
                <span className="font-semibold">Preserved:</span> {mediaResult.evidence?.preserved}
              </div>
              <div>
                <span className="font-semibold">Failed:</span> {mediaResult.evidence?.failed}
              </div>
              
              {mediaResult.evidence?.classification && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Classification:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Missing: {mediaResult.evidence.classification.missing}</li>
                    <li>Incomplete: {mediaResult.evidence.classification.incomplete}</li>
                    <li>Valid Static: {mediaResult.evidence.classification.validStatic}</li>
                    <li>Valid R2: {mediaResult.evidence.classification.validR2}</li>
                    <li>Orphan: {mediaResult.evidence.classification.orphan}</li>
                  </ul>
                </div>
              )}

              {mediaResult.evidence?.errors && Object.keys(mediaResult.evidence.errors).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2 text-red-600">Errors:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {Object.entries(mediaResult.evidence.errors).map(([id, err]) => (
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

        {assignmentResult && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Step 2: Assignment Reconciliation Result</h3>
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Verdict:</span>{' '}
                <span className={assignmentResult.verdict === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}>
                  {assignmentResult.verdict}
                </span>
              </div>
              <div>
                <span className="font-semibold">Test ID:</span> {assignmentResult.testId}
              </div>
              <div>
                <span className="font-semibold">Projects:</span> {assignmentResult.evidence?.projects}
              </div>
              <div>
                <span className="font-semibold">Media:</span> {assignmentResult.evidence?.media}
              </div>
              <div>
                <span className="font-semibold">Services:</span> {assignmentResult.evidence?.services}
              </div>
              <div>
                <span className="font-semibold">Reconciled:</span> {assignmentResult.evidence?.reconciled}
              </div>
              <div>
                <span className="font-semibold">Skipped:</span> {assignmentResult.evidence?.skipped}
              </div>
              <div>
                <span className="font-semibold">Failed:</span> {assignmentResult.evidence?.failed}
              </div>

              {assignmentResult.evidence?.errors && Object.keys(assignmentResult.evidence.errors).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2 text-red-600">Errors:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {Object.entries(assignmentResult.evidence.errors).map(([id, err]) => (
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
