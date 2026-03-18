import React from 'react';
import type { LoadProgress } from './api';

interface Props {
  progress: LoadProgress;
  error: string | null;
  onRetry: () => void;
}

export default function Loading({ progress, error, onRetry }: Props) {
  const pct =
    progress.total > 0
      ? Math.min(100, Math.round((progress.loaded / progress.total) * 100))
      : 0;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Failed to load data</h2>
          <p className="text-sm text-slate-500 mb-6 font-mono break-all">{error}</p>
          {error.includes('VITE_AIRTABLE_TOKEN') && (
            <p className="text-sm text-slate-600 mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
              Create a <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">.env</code> file
              in the project root and add:<br />
              <code className="font-mono text-xs">VITE_AIRTABLE_TOKEN=patXXX…</code>
              <br /><br />
              Get your token at airtable.com → your account → Developer Hub →
              Personal access tokens. Scope: <em>data.records:read</em> on the Creator Tracking base.
            </p>
          )}
          <button
            onClick={onRetry}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Creator Dashboard</h1>
        </div>

        <p className="text-sm text-slate-500 mb-3">{progress.stage}</p>

        <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-400">
          <span>{progress.loaded.toLocaleString()} records</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}
