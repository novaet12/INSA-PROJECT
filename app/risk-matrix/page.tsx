"use client";

import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import RiskMatrix from "@/components/RiskMatrix";

interface QuestionAnalysis {
  question: string;
  answer: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: string;
  gap: string;
  threat: string;
  mitigation: string;
}

interface ProcessedAssessment {
  _id: string;
  company: string;
  category: string;
  date: string;
  analyses: QuestionAnalysis[];
  riskMatrix: { likelihood: number; impact: number; count: number }[];
}

export default function RiskMatrixPage() {
  const [assessments, setAssessments] = useState<ProcessedAssessment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProcessedAssessments();

    // SSE subscription: refresh when new analyses complete
    let es: EventSource | null = null;
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        es = new EventSource('/api/notifications/stream');
        es.addEventListener('analysis', (ev: MessageEvent) => {
          try {
            const payload = JSON.parse(ev.data);
            // For now we simply refresh the list; could optimistically insert payload
            fetchProcessedAssessments();
          } catch (e) {
            fetchProcessedAssessments();
          }
        });
        es.onopen = () => console.debug('RiskMatrix SSE connected');
        es.onerror = () => {
          console.debug('RiskMatrix SSE error, closing');
          if (es) { es.close(); es = null; }
        };
      } catch (e) {
        es = null;
      }
    }

    return () => { if (es) es.close(); };
  }, []);

  const fetchProcessedAssessments = async () => {
    try {
      const res = await fetch('/api/analysis/processed');
      const data = await res.json();
      setAssessments(data.success && Array.isArray(data.assessments) ? data.assessments : []);
      if (Array.isArray(data.assessments) && data.assessments.length > 0) {
        setSelectedId(data.assessments[0]._id);
      }
    } catch (err) {
      console.error('Failed to load assessments', err);
      setAssessments([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  };

  const selected = assessments.find((a) => a._id === selectedId) || null;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Risk Matrix</h1>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-slate-300">Select an assessment to view its risk matrix.</div>
            <div className="flex items-center gap-3">
              <select value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value || null)} className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm">
                <option value="">-- Select --</option>
                {assessments.map((a) => (
                  <option key={a._id} value={a._id}>{a.company} — {a.date ? new Date(a.date).toLocaleDateString() : 'No date'}</option>
                ))}
              </select>
              <button onClick={() => fetchProcessedAssessments()} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">Refresh</button>
            </div>
          </div>

          {loading ? (
            <div className="text-slate-400">Loading...</div>
          ) : (
            <div>
              {selected ? (
                <RiskMatrix data={selected.riskMatrix} />
              ) : (
                <div className="text-slate-400">No assessments found. Analyze questionnaires to generate risk matrices.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
