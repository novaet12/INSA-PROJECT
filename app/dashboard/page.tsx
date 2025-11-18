"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import RiskMatrix from "@/components/RiskMatrix";


interface DashboardStats {
  totalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  totalQuestionnaires: number;
  totalReports: number;
  totalRegisteredRisks?: number;
  openRisks?: number;
  mitigatedRisks?: number;
}


interface Analysis {
  _id: string;
  riskScore: number;
  category: string;
  createdAt: string;
}

interface Questionnaire {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  responses?: any[];
  company?: string;
  category?: string;
}

interface ProcessedQuestionnaire {
  _id: string;
  questionnaireId: string;
  company: string;
  category: string;
  questions: Array<{
    question: string;
    answer: string;
    likelihood: number;
    impact: number;
    riskScore: number;
    riskLevel: string;
    gap: string;
    threat: string;
    mitigation: string;
  }>;
  riskMatrix: Array<{
    likelihood: number;
    impact: number;
    count: number;
  }>;
  createdAt: string;
}


export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [riskMatrix, setRiskMatrix] = useState<any>(null);
  const [aleData, setAleData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "assessment">("overview");
  
  // Assessment tab state
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [processedQuestionnaires, setProcessedQuestionnaires] = useState<ProcessedQuestionnaire[]>([]);
  const [fetchingQuestionnaires, setFetchingQuestionnaires] = useState(false);
  const [processingAnalysis, setProcessingAnalysis] = useState<string | null>(null);
  const [assessmentMessage, setAssessmentMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Filters
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);


  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchStats();
    }
  }, [status, router]);


  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      const data = await response.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };


  const fetchRiskMatrix = async () => {
    try {
      const response = await fetch("/api/analysis/matrix");
      const data = await response.json();
      if (data.success) {
        setRiskMatrix(data.matrix);
        setAleData(data.ale);
      }
    } catch (error) {
      console.error("Error fetching risk matrix:", error);
    }
  };

  const fetchQuestionnaires = async () => {
    try {
      const response = await fetch("/api/questionnaires");
      const data = await response.json();
      if (data.success) {
        setQuestionnaires(data.questionnaires || []);
      }
    } catch (error) {
      console.error("Error fetching questionnaires:", error);
    }
  };

  const fetchProcessedQuestionnaires = async () => {
    try {
      const response = await fetch("/api/questionnaires/processed");
      const data = await response.json();
      if (data.success) {
        setProcessedQuestionnaires(data.processed || []);
      }
    } catch (error) {
      console.error("Error fetching processed questionnaires:", error);
    }
  };

  const handleFetchExternalQuestionnaires = async () => {
    setFetchingQuestionnaires(true);
    setAssessmentMessage(null);
    
    try {
      const response = await fetch("/api/questionnaires/fetch", {
        method: "POST",
      });
      const data = await response.json();
      
      if (data.success) {
        setAssessmentMessage({
          type: 'success',
          text: `Successfully fetched ${data.count || 0} questionnaire(s)`
        });
        await fetchQuestionnaires();
        await fetchStats();
      } else {
        setAssessmentMessage({
          type: 'error',
          text: data.error || "Failed to fetch questionnaires"
        });
      }
    } catch (error) {
      console.error("Error fetching external questionnaires:", error);
      setAssessmentMessage({
        type: 'error',
        text: "Network error while fetching questionnaires"
      });
    } finally {
      setFetchingQuestionnaires(false);
    }
  };

  const handleTriggerAnalysis = async (questionnaireId: string) => {
    setProcessingAnalysis(questionnaireId);
    setAssessmentMessage(null);
    
    try {
      const response = await fetch("/api/analysis/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questionnaireId }),
      });
      const data = await response.json();
      
      if (data.success) {
        setAssessmentMessage({
          type: 'success',
          text: "Risk analysis completed successfully"
        });
        await fetchQuestionnaires();
        await fetchStats();
      } else {
        setAssessmentMessage({
          type: 'error',
          text: data.error || "Failed to process analysis"
        });
      }
    } catch (error) {
      console.error("Error triggering analysis:", error);
      setAssessmentMessage({
        type: 'error',
        text: "Network error while processing analysis"
      });
    } finally {
      setProcessingAnalysis(null);
    }
  };


  useEffect(() => {
    if (activeTab === "assessment") {
      fetchQuestionnaires();
      fetchProcessedQuestionnaires();
      fetchRiskMatrix();
    }
  }, [activeTab]);


  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading...</div>
        </div>
      </Layout>
    );
  }


  if (!session) {
    return null;
  }


  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        </div>


        {/* Tabs */}
        <div className="flex space-x-4 border-b border-slate-700">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 font-medium transition ${
              activeTab === "overview"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("assessment")}
            className={`px-6 py-3 font-medium transition ${
              activeTab === "assessment"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Risk Assessment
          </button>
        </div>


        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-2">
              Total Risks
            </h3>
            <p className="text-3xl font-bold text-white">
              {stats?.totalRisks || 0}
            </p>
          </div>


          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-2">
              High Risks
            </h3>
            <p className="text-3xl font-bold text-red-400">
              {stats?.highRisks || 0}
            </p>
          </div>


          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-2">
              Medium Risks
            </h3>
            <p className="text-3xl font-bold text-yellow-400">
              {stats?.mediumRisks || 0}
            </p>
          </div>


          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-slate-400 text-sm font-medium mb-2">
              Low Risks
            </h3>
            <p className="text-3xl font-bold text-green-400">
              {stats?.lowRisks || 0}
            </p>
          </div>
        </div>


        {/* Risk Register Stats */}
        {(stats?.totalRegisteredRisks !== undefined) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-slate-400 text-sm font-medium mb-2">
                Registered Risks
              </h3>
              <p className="text-3xl font-bold text-white">
                {stats?.totalRegisteredRisks || 0}
              </p>
            </div>


            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-slate-400 text-sm font-medium mb-2">
                Open Risks
              </h3>
              <p className="text-3xl font-bold text-orange-400">
                {stats?.openRisks || 0}
              </p>
            </div>


            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-slate-400 text-sm font-medium mb-2">
                Mitigated Risks
              </h3>
              <p className="text-3xl font-bold text-green-400">
                {stats?.mitigatedRisks || 0}
              </p>
            </div>
          </div>
        )}
          </>
        )}


        {/* Risk Assessment Tab */}
        {activeTab === "assessment" && (
          <div className="space-y-6">
            {/* Top Section: Questionnaires List and Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Questionnaires List (2/3 width) */}
              <div className="lg:col-span-2 bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">
                    📋 Questionnaires ({questionnaires.filter(q => {
                      const matchCompany = !companyFilter || q.company?.toLowerCase().includes(companyFilter.toLowerCase());
                      const matchCategory = !categoryFilter || q.category === categoryFilter;
                      const matchDate = !dateFilter || new Date(q.createdAt).toISOString().split('T')[0] === dateFilter;
                      return matchCompany && matchCategory && matchDate;
                    }).length})
                  </h3>
                  <button
                    onClick={handleFetchExternalQuestionnaires}
                    disabled={fetchingQuestionnaires}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white text-sm font-medium rounded transition flex items-center gap-2"
                  >
                    {fetchingQuestionnaires ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Fetching...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Fetch
                      </>
                    )}
                  </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Filter by company..."
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    <option value="strategic">Strategic Level</option>
                    <option value="tactical">Tactical Level</option>
                    <option value="operational">Operational Level</option>
                  </select>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Status Message */}
                {assessmentMessage && (
                  <div className={`p-3 rounded border mb-4 text-sm ${
                    assessmentMessage.type === 'success' 
                      ? 'bg-green-900/20 border-green-700 text-green-400' 
                      : 'bg-red-900/20 border-red-700 text-red-400'
                  }`}>
                    {assessmentMessage.text}
                  </div>
                )}

                {/* Questionnaires List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {questionnaires
                    .filter(q => {
                      const matchCompany = !companyFilter || q.company?.toLowerCase().includes(companyFilter.toLowerCase());
                      const matchCategory = !categoryFilter || q.category === categoryFilter;
                      const matchDate = !dateFilter || new Date(q.createdAt).toISOString().split('T')[0] === dateFilter;
                      return matchCompany && matchCategory && matchDate;
                    })
                    .map((q) => (
                      <div
                        key={q._id}
                        className="p-3 bg-slate-700/50 rounded border border-slate-600 hover:border-slate-500 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="text-white font-medium text-sm">
                              {q.title || "Untitled"}
                            </h4>
                            <div className="flex flex-wrap gap-2 mt-2 text-xs">
                              {q.company && (
                                <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
                                  🏢 {q.company}
                                </span>
                              )}
                              {q.category && (
                                <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
                                  📊 {q.category}
                                </span>
                              )}
                              <span className="px-2 py-1 bg-slate-600/50 text-slate-300 rounded">
                                📅 {new Date(q.createdAt).toLocaleDateString()}
                              </span>
                              <span className={`px-2 py-1 rounded ${
                                q.status === 'analyzed' ? 'bg-green-900/30 text-green-400' :
                                q.status === 'processing' ? 'bg-yellow-900/30 text-yellow-400' :
                                'bg-slate-600/50 text-slate-300'
                              }`}>
                                {q.status || 'pending'}
                              </span>
                            </div>
                          </div>
                          {q.status !== 'analyzed' && (
                            <button
                              onClick={() => handleTriggerAnalysis(q._id)}
                              disabled={processingAnalysis === q._id}
                              className="ml-3 px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white text-xs font-medium rounded transition"
                            >
                              {processingAnalysis === q._id ? 'Analyzing...' : 'Analyze'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  {questionnaires.filter(q => {
                    const matchCompany = !companyFilter || q.company?.toLowerCase().includes(companyFilter.toLowerCase());
                    const matchCategory = !categoryFilter || q.category === categoryFilter;
                    const matchDate = !dateFilter || new Date(q.createdAt).toISOString().split('T')[0] === dateFilter;
                    return matchCompany && matchCategory && matchDate;
                  }).length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No questionnaires found matching filters
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Risk Matrix (1/3 width) */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">🎯 Risk Matrix</h3>
                {riskMatrix && <RiskMatrix data={riskMatrix} />}
              </div>
            </div>

            {/* Processed Questionnaires by Company */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                  🔍 Processed Assessments ({processedQuestionnaires.length})
                </h3>
              </div>

              {processedQuestionnaires.length === 0 ? (
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
                  <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-slate-400">No processed assessments yet</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Analyze questionnaires to see detailed risk assessments here
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Company selector */}
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(processedQuestionnaires.map(p => p.company))).map(company => (
                      <button
                        key={company}
                        onClick={() => setSelectedCompany(selectedCompany === company ? null : company)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          selectedCompany === company
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        🏢 {company}
                      </button>
                    ))}
                  </div>

                  {/* Display selected company's assessments */}
                  {processedQuestionnaires
                    .filter(p => !selectedCompany || p.company === selectedCompany)
                    .map((processed) => (
                      <div key={processed._id} className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h4 className="text-xl font-bold text-white mb-2">
                              🏢 {processed.company}
                            </h4>
                            <div className="flex gap-3 text-sm">
                              <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
                                📊 {processed.category}
                              </span>
                              <span className="text-slate-400">
                                📅 {new Date(processed.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Questions and Answers */}
                        <div className="space-y-4 mb-6">
                          {processed.questions?.map((item, idx) => (
                            <div key={idx} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs text-slate-400 mb-1">❓ QUESTION:</p>
                                  <p className="text-white font-medium">{item.question}</p>
                                </div>

                                <div>
                                  <p className="text-xs text-slate-400 mb-1">✅ ANSWER:</p>
                                  <p className="text-blue-400">{item.answer}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-800/50 rounded">
                                  <div>
                                    <p className="text-xs text-slate-400 mb-1">📊 RISK MATRIX ANALYSIS:</p>
                                    <div className="space-y-1 text-sm">
                                      <p className="text-slate-300">Likelihood: <span className="font-bold text-yellow-400">{item.likelihood}/5</span></p>
                                      <p className="text-slate-300">Impact: <span className="font-bold text-orange-400">{item.impact}/5</span></p>
                                      <p className="text-slate-300">Risk Score: <span className="font-bold text-red-400">{item.riskScore} ({item.likelihood} × {item.impact})</span></p>
                                      <p className="text-slate-300">Risk Level: <span className={`font-bold ${
                                        item.riskLevel === 'CRITICAL' ? 'text-red-400' :
                                        item.riskLevel === 'HIGH' ? 'text-orange-400' :
                                        item.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
                                        'text-green-400'
                                      }`}>{item.riskLevel}</span></p>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <p className="text-xs text-slate-400 mb-1">⚠️ GAP:</p>
                                      <p className="text-slate-300 text-sm">{item.gap}</p>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-xs text-slate-400 mb-1">🎯 THREAT:</p>
                                  <p className="text-red-300 text-sm">{item.threat}</p>
                                </div>

                                <div>
                                  <p className="text-xs text-slate-400 mb-1">🔧 MITIGATION:</p>
                                  <p className="text-green-300 text-sm">{item.mitigation}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Company-Specific Risk Matrix */}
                        <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                          <h5 className="text-white font-bold mb-4">📊 {processed.company} - Risk Matrix</h5>
                          <div className="grid grid-cols-6 gap-1">
                            {/* Y-axis label */}
                            <div className="flex items-center justify-center">
                              <p className="text-xs text-slate-400 transform -rotate-90 whitespace-nowrap">Impact →</p>
                            </div>
                            
                            {/* Matrix cells */}
                            {[5, 4, 3, 2, 1].map((impact) => (
                              <>
                                <div key={`label-${impact}`} className="flex items-center justify-center">
                                  <p className="text-xs text-slate-400 font-bold">{impact}</p>
                                </div>
                                {[1, 2, 3, 4, 5].map((likelihood) => {
                                  const score = likelihood * impact;
                                  const risksInCell = processed.riskMatrix?.filter(
                                    r => r.likelihood === likelihood && r.impact === impact
                                  ) || [];
                                  const count = risksInCell.reduce((sum, r) => sum + r.count, 0);
                                  
                                  return (
                                    <div
                                      key={`${likelihood}-${impact}`}
                                      className={`aspect-square flex items-center justify-center rounded relative ${
                                        score >= 15 ? 'bg-red-900/40 border-red-700' :
                                        score >= 10 ? 'bg-orange-900/40 border-orange-700' :
                                        score >= 5 ? 'bg-yellow-900/40 border-yellow-700' :
                                        'bg-green-900/40 border-green-700'
                                      } border`}
                                    >
                                      {count > 0 && (
                                        <>
                                          <div className="w-3 h-3 bg-white rounded-full absolute"></div>
                                          <span className="text-xs font-bold text-slate-900 relative z-10">{count}</span>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </>
                            ))}
                            
                            {/* X-axis labels */}
                            <div></div>
                            <div></div>
                            {[1, 2, 3, 4, 5].map((likelihood) => (
                              <div key={`x-label-${likelihood}`} className="flex items-center justify-center">
                                <p className="text-xs text-slate-400 font-bold">{likelihood}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-slate-400 text-center mt-2">← Likelihood</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Old Risk Analysis Tab removed */}
        {activeTab === "analysis" && (
          <div className="space-y-6">
            {/* Risk Matrix */}
            {riskMatrix && <RiskMatrix data={riskMatrix} />}


            {/* ALE (Annual Loss Expectancy) */}
            {aleData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Annual Loss Expectancy (ALE)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-slate-400 text-sm">Total ALE</p>
                      <p className="text-3xl font-bold text-white">
                        ${aleData.total?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Average ALE per Risk</p>
                      <p className="text-2xl font-bold text-blue-400">
                        ${aleData.average?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Total Risks Analyzed</p>
                      <p className="text-xl font-semibold text-slate-300">
                        {aleData.risks?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>


                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Top Risks by ALE
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {aleData.risks
                      ?.sort((a: any, b: any) => b.ale - a.ale)
                      .slice(0, 10)
                      .map((risk: any, index: number) => (
                        <div
                          key={index}
                          className="p-3 bg-slate-700/50 rounded border border-slate-600"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm text-white font-medium">
                                {risk.description.substring(0, 60)}...
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                L{risk.likelihood} × I{risk.impact} = {risk.likelihood * risk.impact}
                              </p>
                            </div>
                            <div className="ml-4 text-right">
                              <p className="text-sm font-bold text-red-400">
                                ${risk.ale.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}
                              </p>
                              <p className="text-xs text-slate-400">
                                {risk.category}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}


            {/* Risk Treatment Options */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Risk Treatment Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-700/50 rounded border border-slate-600">
                  <h4 className="font-semibold text-white mb-2">Avoid</h4>
                  <p className="text-sm text-slate-400">
                    Eliminate the risk by not performing the activity or changing
                    the approach
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded border border-slate-600">
                  <h4 className="font-semibold text-white mb-2">Transfer</h4>
                  <p className="text-sm text-slate-400">
                    Transfer the risk to a third party (insurance, outsourcing)
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded border border-slate-600">
                  <h4 className="font-semibold text-white mb-2">Mitigate</h4>
                  <p className="text-sm text-slate-400">
                    Implement controls to reduce likelihood or impact of the risk
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded border border-slate-600">
                  <h4 className="font-semibold text-white mb-2">Accept</h4>
                  <p className="text-sm text-slate-400">
                    Acknowledge the risk and accept the potential consequences
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Old Assessment Tab removed - now integrated above */}
        {activeTab === "old-assessment" && (
          <div className="space-y-6">
            {/* Header with Action Button */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Risk Assessment</h2>
                <p className="text-slate-400 mt-1">
                  Import questionnaires and trigger AI-powered risk analysis
                </p>
              </div>
              <button
                onClick={handleFetchExternalQuestionnaires}
                disabled={fetchingQuestionnaires}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium rounded-lg transition flex items-center gap-2"
              >
                {fetchingQuestionnaires ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fetching...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Fetch Questionnaires
                  </>
                )}
              </button>
            </div>

            {/* Status Message */}
            {assessmentMessage && (
              <div className={`p-4 rounded-lg border ${
                assessmentMessage.type === 'success' 
                  ? 'bg-green-900/20 border-green-700 text-green-400' 
                  : 'bg-red-900/20 border-red-700 text-red-400'
              }`}>
                {assessmentMessage.text}
              </div>
            )}

            {/* Questionnaires List */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Questionnaires ({questionnaires.length})
              </h3>
              
              {questionnaires.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-slate-400">No questionnaires found</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Click &quot;Fetch Questionnaires&quot; to import from external API
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questionnaires.map((questionnaire) => (
                    <div
                      key={questionnaire._id}
                      className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <h4 className="text-white font-medium">
                          {questionnaire.title || "Untitled Questionnaire"}
                        </h4>
                        <div className="flex gap-4 mt-2 text-sm text-slate-400">
                          <span>
                            Status: <span className={`font-medium ${
                              questionnaire.status === 'analyzed' ? 'text-green-400' : 
                              questionnaire.status === 'processing' ? 'text-yellow-400' : 
                              'text-slate-300'
                            }`}>
                              {questionnaire.status || 'pending'}
                            </span>
                          </span>
                          <span>
                            {new Date(questionnaire.createdAt).toLocaleDateString()}
                          </span>
                          {questionnaire.responses && (
                            <span>
                              {questionnaire.responses.length} responses
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {questionnaire.status !== 'analyzed' && (
                        <button
                          onClick={() => handleTriggerAnalysis(questionnaire._id)}
                          disabled={processingAnalysis === questionnaire._id}
                          className="ml-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white text-sm font-medium rounded transition flex items-center gap-2"
                        >
                          {processingAnalysis === questionnaire._id ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Analyze
                            </>
                          )}
                        </button>
                      )}
                      
                      {questionnaire.status === 'analyzed' && (
                        <span className="ml-4 px-4 py-2 bg-green-900/30 text-green-400 text-sm font-medium rounded flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Completed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assessment Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-white">Import Questionnaires</h4>
                </div>
                <p className="text-sm text-slate-400">
                  Fetch cybersecurity questionnaires from external APIs to begin the assessment process
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-white">AI-Powered Analysis</h4>
                </div>
                <p className="text-sm text-slate-400">
                  Trigger automated AI analysis using OpenAI to identify vulnerabilities and assess risks
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-white">Track Progress</h4>
                </div>
                <p className="text-sm text-slate-400">
                  Monitor assessment status and compare results across different time periods
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}