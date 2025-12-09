"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import Link from "next/link";



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

interface Questionnaire {
  _id: string;
  title: string;
  company: string;
  filledBy: string;
  role: string;
  date: string;
  status: string;
  responseCount: number;
  questions?: any[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Assessment states
  const [processedAssessments, setProcessedAssessments] = useState<ProcessedAssessment[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [viewingAssessment, setViewingAssessment] = useState<ProcessedAssessment | null>(null);
  
  // state for edit modal: stores current item to edit
  const [viewingEdit, setViewingEdit] = useState<{
    assessmentId: string;
    level: string;
    questionId: number | string;
    current: any;
  } | null>(null);

  // Filters
  const [companyFilter, setCompanyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);

  // Risk registration
  const [registeringRisk, setRegisteringRisk] = useState<QuestionAnalysis | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [riskFormData, setRiskFormData] = useState({ category: "", status: "open", owner: "" });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchProcessedAssessments();
      fetchCompanies();
      setLoading(false);
    }
  }, [status, router]);

  // Poll for updates every 15 seconds so the dashboard reflects new analyses
  useEffect(() => {
    if (status !== 'authenticated') return;
    // Prefer SSE updates if available; fallback to polling for older browsers
    let es: EventSource | null = null;
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        es = new EventSource('/api/notifications/stream');
        es.addEventListener('analysis', (ev: MessageEvent) => {
          try {
            const payload = JSON.parse(ev.data);
            // Refresh processed assessments (could also optimistically append)
            fetchProcessedAssessments();
          } catch (e) { fetchProcessedAssessments(); }
        });
        es.onopen = () => console.debug('SSE connected');
        es.onerror = () => {
          console.debug('SSE error, falling back to polling');
          if (es) { es.close(); es = null; }
        };
      } catch (e) {
        es = null;
      }
    }

    const interval = setInterval(() => {
      if (!es) {
        fetchProcessedAssessments();
      }
    }, 15000);

    return () => {
      if (es) es.close();
      clearInterval(interval);
    };
  }, [status]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies/list");
      const data = await res.json();
      if (data.success && Array.isArray(data.companies)) {
        setAvailableCompanies(data.companies);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };







  const fetchProcessedAssessments = async () => {
    try {
      const res = await fetch("/api/analysis/processed");
      const data = await res.json();
      setProcessedAssessments(data.success && Array.isArray(data.assessments) ? data.assessments : []);
    } catch (error) {
      console.error("Error:", error);
      setProcessedAssessments([]);
    }
  };

  const openAssessmentModal = (assessment: ProcessedAssessment) => {
    setViewingAssessment(assessment);
  };

  const closeAssessmentModal = () => setViewingAssessment(null);

  // manual analysis trigger removed from dashboard UI (auto-analysis handles imports)

  const openRegisterRiskModal = (analysis: QuestionAnalysis, company: string) => {
    setRegisteringRisk(analysis);
    setSelectedCompany(company);
    setRiskFormData({ category: "", status: "open", owner: (session?.user as any)?.email || "" }); // eslint-disable-line @typescript-eslint/no-explicit-any
  };

  const closeRegisterRiskModal = () => {
    setRegisteringRisk(null);
    setSelectedCompany("");
    setRiskFormData({ category: "", status: "open", owner: "" });
  };

  const closeEditModal = () => setViewingEdit(null);

  const saveEditedAnalysis = async (payload: any) => {
    try {
      const res = await fetch('/api/analysis/update-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success) {
        // refresh processed assessments
        fetchProcessedAssessments();
        closeEditModal();
      } else {
        alert('Failed to save edits: ' + (d.error || ''));
      }
    } catch (err) {
      console.error('Save edit error', err);
      alert('Error saving edits');
    }
  };

  // CHANGED Now uses /api/risks/create endpoint with proper structure
  const handleRegisterRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringRisk) return;

    try {
      const res = await fetch("/api/risks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: `${registeringRisk.question} — Answer: ${registeringRisk.answer}`,
          company: selectedCompany,
          category: riskFormData.category || "Uncategorized",
          level: registeringRisk.riskLevel.toLowerCase(),
          likelihood: registeringRisk.likelihood,
          impact: registeringRisk.impact,
          status: riskFormData.status,
          owner: riskFormData.owner,
          gap: registeringRisk.gap,
          threat: registeringRisk.threat,
          mitigation: registeringRisk.mitigation,
          mitigationStrategy: registeringRisk.mitigation,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Risk registered successfully' });
        closeRegisterRiskModal();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to register' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Error registering risk' });
    }
  };

  const filterItems = <T extends { company?: string; category?: string; date?: string }>(items: T[]) => {
    return items.filter(item => {
      if (!item) return false;
      const matchCompany = !companyFilter || (item.company || "").toLowerCase().includes(companyFilter.toLowerCase());
      const matchCategory = !categoryFilter || item.category === categoryFilter;
      const matchDate = !dateFilter || item.date === dateFilter;
      return matchCompany && matchCategory && matchDate;
    });
  };

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!session) return null;

  const filteredAssessments = filterItems(processedAssessments);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>




        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">🔍 Filter Assessments</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2">Company Name</label>
                <input
                  type="text"
                  list="company-list"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  placeholder="Filter by company..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                />
                <datalist id="company-list">
                  {availableCompanies.map((company) => (
                    <option key={company} value={company} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-2">Category Level</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}

            
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                >
                  <option value="">All Categories</option>
                  <option value="operational">Operational</option>
                  <option value="tactical">Tactical</option>
                  <option value="strategic">Strategic</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-2">Date</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Risk Matrix: moved to its own page */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Risk Matrix</h3>
            <div className="text-slate-300 mb-4">The Risk Matrix has moved to its own page for a fuller view and interactive selection.</div>
            <div className="flex items-center gap-3">
              <Link href="/risk-matrix" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium">Open Risk Matrix</Link>
              <button onClick={() => fetchProcessedAssessments()} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">Refresh</button>
            </div>
            {filteredAssessments[0] && (
              <div className="mt-4 text-sm text-slate-400">Latest: <span className="text-white font-medium">{filteredAssessments[0].company}</span> • {filteredAssessments[0].analyses.length} questions • {filteredAssessments[0].date ? new Date(filteredAssessments[0].date).toLocaleDateString() : 'No date'}</div>
            )}
          </div>

          {/* Processed Assessments (grouped by analysis run) */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Processed Assessments</h3>
            {filteredAssessments.length === 0 ? (
              <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4 opacity-30"> </div>
                <p className="text-white font-semibold mb-2">No processed assessments</p>
                <p className="text-slate-400">Analyze questionnaires to see results here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssessments.map((assessment) => (
                  <div key={assessment._id} className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-white">{assessment.company || "Unknown"}</div>
                      <div className="text-sm text-slate-400">{assessment.category || "Uncategorized"} • {assessment.date ? new Date(assessment.date).toLocaleDateString() : "No date"}</div>
                      <div className="text-sm text-slate-400 mt-1">Questions: <span className="text-white font-medium">{(assessment.analyses || []).length}</span></div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openAssessmentModal(assessment)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          // quick refresh or other action
                          fetchProcessedAssessments();
                        }}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Register Risk Modal */}
      {registeringRisk && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">📝 Register Risk</h3>
            <div className="mb-4 p-4 bg-slate-900 rounded border border-slate-700">
              <p className="text-sm text-slate-400 mb-2"><strong>Question:</strong></p>
              <p className="text-white text-sm mb-3">{registeringRisk.question}</p>
              <p className="text-sm text-slate-400 mb-2"><strong>Answer:</strong></p>
              <p className="text-slate-300 text-sm">{registeringRisk.answer}</p>
            </div>

            <form onSubmit={handleRegisterRisk} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Company</label>
                <input type="text" value={selectedCompany} readOnly className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white" />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Risk Category</label>
                <input
                  type="text"
                  value={riskFormData.category}
                  onChange={(e) => setRiskFormData({ ...riskFormData, category: e.target.value })}
                  placeholder="e.g., Data Security, Compliance"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Risk Level</label>
                  <input type="text" value={registeringRisk.riskLevel} readOnly className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-400" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Status</label>
                  <select
                    value={riskFormData.status}
                    onChange={(e) => setRiskFormData({ ...riskFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                  >
                    <option value="open">Open</option>
                    <option value="mitigated">Mitigated</option>
                    <option value="accepted">Accepted</option>
                    <option value="transferred">Transferred</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Risk Owner (Email)</label>
                <input
                  type="email"
                  value={riskFormData.owner}
                  onChange={(e) => setRiskFormData({ ...riskFormData, owner: e.target.value })}
                  placeholder="owner@company.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition">
                  Register Risk
                </button>
                <button type="button" onClick={closeRegisterRiskModal} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Assessment Details Modal (group run) */}
      {viewingAssessment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-white">{viewingAssessment.company}</h3>
                <p className="text-slate-400">{viewingAssessment.category}</p>
                <div className="text-sm text-slate-500 mt-1">{viewingAssessment.date ? new Date(viewingAssessment.date).toLocaleString() : ''}</div>
                <div className="text-sm text-slate-400 mt-2">Questions: {(viewingAssessment.analyses || []).length}</div>
              </div>
              <button onClick={closeAssessmentModal} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>

            <div className="space-y-4">
              {(viewingAssessment.analyses || []).map((a, idx) => (
                <div key={idx} className="bg-slate-900 rounded p-4 border border-slate-700">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm text-slate-400">Question</div>
                      <div className="text-white font-medium">{a.question}</div>
                      <div className="text-sm text-slate-400 mt-2">Answer</div>
                      <div className="text-slate-300">{a.answer}</div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm text-slate-400">Likelihood</div>
                      <div className="text-white font-bold">{(a.likelihood ?? a.analysis?.likelihood) || 0}/5</div>
                      <div className="text-sm text-slate-400 mt-2">Impact</div>
                      <div className="text-white font-bold">{(a.impact ?? a.analysis?.impact) || 0}/5</div>
                      <div className="text-sm text-slate-400 mt-2">Level</div>
                      <div className="text-white font-medium">{a.riskLevel || a.analysis?.riskLevel || 'UNKNOWN'}</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {((a.gap ?? a.analysis?.gap) || '') !== '' && (
                      <div>
                        <div className="text-xs text-slate-400">Gap</div>
                        <div className="text-slate-300">{a.gap ?? a.analysis?.gap}</div>
                      </div>
                    )}
                    {((a.threat ?? a.analysis?.threat) || '') !== '' && (
                      <div>
                        <div className="text-xs text-slate-400">Threat</div>
                        <div className="text-slate-300">{a.threat ?? a.analysis?.threat}</div>
                      </div>
                    )}
                    {((a.mitigation ?? a.analysis?.mitigation) || '') !== '' && (
                      <div>
                        <div className="text-xs text-slate-400">Mitigation</div>
                        <div className="text-slate-300">{a.mitigation ?? a.analysis?.mitigation}</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openRegisterRiskModal(a as any, viewingAssessment.company)}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                    >
                      Register Risk
                    </button>
                    <button
                      onClick={() => setViewingEdit({ assessmentId: viewingAssessment._id, level: a.level, questionId: a.questionId, current: a })}
                      className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={closeAssessmentModal} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Analysis Modal */}
      {viewingEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-2xl w-full">
            <h3 className="text-xl font-bold text-white mb-4">✏️ Edit Analysis</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400">Likelihood (1-5)</label>
                <input type="number" min={1} max={5} defaultValue={viewingEdit.current.likelihood} id="edit-likelihood" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400">Impact (1-5)</label>
                <input type="number" min={1} max={5} defaultValue={viewingEdit.current.impact} id="edit-impact" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400">Gap</label>
                <textarea defaultValue={viewingEdit.current.gap} id="edit-gap" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400">Threat</label>
                <textarea defaultValue={viewingEdit.current.threat} id="edit-threat" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-400">Mitigation</label>
                <textarea defaultValue={viewingEdit.current.mitigation} id="edit-mitigation" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white" />
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={async () => {
                  const likelihood = Number((document.getElementById('edit-likelihood') as HTMLInputElement).value || viewingEdit.current.likelihood);
                  const impact = Number((document.getElementById('edit-impact') as HTMLInputElement).value || viewingEdit.current.impact);
                  const gap = (document.getElementById('edit-gap') as HTMLTextAreaElement).value;
                  const threat = (document.getElementById('edit-threat') as HTMLTextAreaElement).value;
                  const mitigation = (document.getElementById('edit-mitigation') as HTMLTextAreaElement).value;

                  await saveEditedAnalysis({
                    analysisId: viewingEdit.assessmentId,
                    level: viewingEdit.level,
                    questionId: viewingEdit.questionId,
                    analysis: { likelihood, impact, gap, threat, mitigation }
                  });
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
              >
                Save
              </button>
              <button onClick={closeEditModal} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
