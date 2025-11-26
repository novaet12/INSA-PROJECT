"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [processedAssessments, setProcessedAssessments] = useState<ProcessedAssessment[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [viewingQuestionnaire, setViewingQuestionnaire] = useState<Questionnaire | null>(null);

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
      fetchQuestionnaires();
      fetchProcessedAssessments();
      fetchCompanies();
      setLoading(false);
    }
  }, [status, router]);

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





  const fetchQuestionnaires = async () => {
    try {
      const res = await fetch("/api/questionnaires/list");
      const data = await res.json();
      setQuestionnaires(data.success && Array.isArray(data.questionnaires) ? data.questionnaires : []);
    } catch (error) {
      console.error("Error:", error);
      setQuestionnaires([]);
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

  const handleTriggerAnalysis = async (questionnaireId: string) => {
    try {
      const res = await fetch("/api/analysis/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionnaireId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Analysis completed' });
        fetchQuestionnaires();
        fetchProcessedAssessments();
      } else {
        setMessage({ type: 'error', text: data.error || 'Analysis failed' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Error triggering analysis' });
    }
  };

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

  // ✅ CHANGED: Now uses /api/risks/create endpoint with proper structure
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

  const filteredQuestionnaires = filterItems(questionnaires);
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

          {/* Questionnaires + Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">📋 Questionnaires</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredQuestionnaires.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-2">📭</div>
                    <p>No questionnaires found</p>
                  </div>
                ) : (
                  filteredQuestionnaires.map((q) => (
                    <div
                      key={q._id}
                      className="bg-slate-900 rounded-lg p-4 border border-slate-700 hover:border-blue-500/50 transition cursor-pointer group"
                      onClick={() => setViewingQuestionnaire(q)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="text-white font-medium group-hover:text-blue-400 transition">{q.company || "Unknown"}</div>
                          <div className="text-sm text-slate-300">{q.title}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Filled by <span className="text-slate-300">{q.filledBy}</span> ({q.role})
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{q.responseCount || 0} questions</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${q.status === 'pending' ? 'bg-yellow-600/20 text-yellow-400' : 'bg-green-600/20 text-green-400'
                          }`}>
                          {q.status || "pending"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mb-3">{q.date ? new Date(q.date).toLocaleDateString() : "No date"}</div>
                      {q.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerAnalysis(q._id);
                          }}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition"
                        >
                          🔍 Analyze
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">📊 Risk Matrix</h3>
              <RiskMatrix data={null} />
            </div>
          </div>

          {/* Processed Assessments */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">✅ Processed Assessments</h3>
            {filteredAssessments.length === 0 ? (
              <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4 opacity-30">📊</div>
                <p className="text-white font-semibold mb-2">No processed assessments</p>
                <p className="text-slate-400">Analyze questionnaires to see results here</p>
              </div>
            ) : (
              filteredAssessments.map((assessment) => (
                <div key={assessment._id} className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                  <div className="mb-6">
                    <h4 className="text-xl font-bold text-white mb-2">🏢 {assessment.company || "Unknown"}</h4>
                    <div className="flex gap-3 text-sm">
                      <span className="text-slate-400">📊 {assessment.category || "Uncategorized"}</span>
                      <span className="text-slate-400">📅 {assessment.date ? new Date(assessment.date).toLocaleDateString() : "No date"}</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    {(assessment.analyses || []).map((analysis, idx) => (
                      <div key={idx} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                        <div className="mb-3">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-lg">❓</span>
                            <div className="flex-1">
                              <span className="text-xs font-semibold text-white uppercase tracking-wider">Question:</span>
                              <p className="text-white mt-1">{analysis.question || "No question"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-start gap-2">
                            <span className="text-lg">✅</span>
                            <div className="flex-1">
                              <span className="text-xs font-semibold text-white uppercase tracking-wider">Answer:</span>
                              <p className="text-slate-300 mt-1">{analysis.answer || "No answer"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mb-3 bg-slate-800 rounded p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-lg">📊</span>
                            <span className="text-xs font-semibold text-white uppercase tracking-wider">Risk Analysis:</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                            <div><span className="text-slate-400">Likelihood:</span> <span className="text-white ml-2">{analysis.likelihood || 0}/5</span></div>
                            <div><span className="text-slate-400">Impact:</span> <span className="text-white ml-2">{analysis.impact || 0}/5</span></div>
                            <div><span className="text-slate-400">Risk Score:</span> <span className="text-white ml-2">{analysis.riskScore || 0}</span></div>
                            <div>
                              <span className="text-slate-400">Level:</span>
                              <span className={`ml-2 font-bold ${analysis.riskLevel === 'CRITICAL' ? 'text-red-500' :
                                analysis.riskLevel === 'HIGH' ? 'text-orange-500' :
                                  analysis.riskLevel === 'MEDIUM' ? 'text-yellow-500' : 'text-green-500'
                                }`}>{analysis.riskLevel || "UNKNOWN"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {analysis.gap && (
                            <div className="flex items-start gap-2">
                              <span className="text-lg">⚠️</span>
                              <div className="flex-1">
                                <span className="text-xs font-semibold text-white uppercase tracking-wider">Gap:</span>
                                <p className="text-slate-300 mt-1 text-sm">{analysis.gap}</p>
                              </div>
                            </div>
                          )}
                          {analysis.threat && (
                            <div className="flex items-start gap-2">
                              <span className="text-lg">🎯</span>
                              <div className="flex-1">
                                <span className="text-xs font-semibold text-white uppercase tracking-wider">Threat:</span>
                                <p className="text-slate-300 mt-1 text-sm">{analysis.threat}</p>
                              </div>
                            </div>
                          )}
                          {analysis.mitigation && (
                            <div className="flex items-start gap-2">
                              <span className="text-lg">🔧</span>
                              <div className="flex-1">
                                <span className="text-xs font-semibold text-white uppercase tracking-wider">Mitigation:</span>
                                <p className="text-slate-300 mt-1 text-sm">{analysis.mitigation}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-700">
                          <button
                            onClick={() => openRegisterRiskModal(analysis, assessment.company)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition"
                          >
                            📝 Register This Risk
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {assessment.riskMatrix && (
                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                      <h5 className="text-sm font-bold text-white mb-3">Risk Matrix for {assessment.company}</h5>
                      <RiskMatrix data={assessment.riskMatrix} />
                    </div>
                  )}
                </div>
              ))
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
      {/* Questionnaire Details Modal */}
      {viewingQuestionnaire && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">{viewingQuestionnaire.company}</h3>
                <p className="text-slate-400">{viewingQuestionnaire.title}</p>
                <div className="flex gap-4 mt-2 text-sm text-slate-500">
                  <span>👤 {viewingQuestionnaire.filledBy} ({viewingQuestionnaire.role})</span>
                  <span>📅 {new Date(viewingQuestionnaire.date).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => setViewingQuestionnaire(null)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Responses</h4>
              {viewingQuestionnaire.questions && viewingQuestionnaire.questions.length > 0 ? (
                viewingQuestionnaire.questions.map((q: any, idx: number) => (
                  <div key={idx} className="bg-slate-900 rounded p-4 border border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-slate-500">ID: {q.id}</span>
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">{q.section}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${q.level === 'strategic' ? 'bg-purple-900/30 text-purple-400' :
                          q.level === 'tactical' ? 'bg-blue-900/30 text-blue-400' :
                            'bg-green-900/30 text-green-400'
                          }`}>{q.level}</span>
                      </div>
                    </div>
                    <p className="text-white font-medium mb-2">{q.question}</p>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-slate-400">Answer:</span>
                      <span className="text-slate-200">{q.answer}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic">No questions available.</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingQuestionnaire(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
