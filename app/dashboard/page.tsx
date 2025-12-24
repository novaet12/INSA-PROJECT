"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

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
  impactLabel?: string;
  impactDescription?: string;
}

interface ProcessedAssessment {
  _id: string;
  company: string;
  category: string;
  date: string;
  analyses: QuestionAnalysis[];
  riskMatrix: { likelihood: number; impact: number; count: number }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [processedAssessments, setProcessedAssessments] =
    useState<ProcessedAssessment[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [viewingAssessment, setViewingAssessment] =
    useState<ProcessedAssessment | null>(null);
  const [viewingEdit, setViewingEdit] = useState<{
    assessmentId: string;
    level: string;
    questionId: number | string;
    current: any;
  } | null>(null);

  const [companyFilter, setCompanyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);

  const [registeringRisk, setRegisteringRisk] =
    useState<QuestionAnalysis | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [riskFormData, setRiskFormData] = useState({
    category: "",
    status: "open",
    owner: "",
  });
  const [reanalyzing, setReanalyzing] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchProcessedAssessments();
      fetchCompanies();
      setLoading(false);
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let es: EventSource | null = null;
    if (typeof window !== "undefined" && "EventSource" in window) {
      try {
        es = new EventSource("/api/notifications/stream");
        es.addEventListener("analysis", (ev: MessageEvent) => {
          try {
            const payload = JSON.parse(ev.data);
            fetchProcessedAssessments();
          } catch (e) {
            fetchProcessedAssessments();
          }
        });
        es.onopen = () => console.debug("SSE connected");
        es.onerror = () => {
          console.debug("SSE error, falling back to polling");
          if (es) {
            es.close();
            es = null;
          }
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
      const res = await fetch("/api/analysis/processed");
      const data = await res.json();
      if (data.success && Array.isArray(data.assessments)) {
        const companies = Array.from(
          new Set(
            data.assessments
              .map((assessment: ProcessedAssessment) => assessment.company)
              .filter((company: string) => company)
          )
        ) as string[];
        setAvailableCompanies(companies);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchProcessedAssessments = async () => {
    try {
      const res = await fetch("/api/analysis/processed");
      const data = await res.json();
      setProcessedAssessments(
        data.success && Array.isArray(data.assessments) ? data.assessments : []
      );
    } catch (error) {
      console.error("Error:", error);
      setProcessedAssessments([]);
    }
  };

  const openAssessmentModal = (assessment: ProcessedAssessment) => {
    setViewingAssessment(assessment);
  };

  const closeAssessmentModal = () => setViewingAssessment(null);

  const openRegisterRiskModal = (analysis: QuestionAnalysis, company: string) => {
    setRegisteringRisk(analysis);
    setSelectedCompany(company);
    setRiskFormData({
      category: "",
      status: "open",
      owner: (session?.user as any)?.email || "",
    });
  };

  const closeRegisterRiskModal = () => {
    setRegisteringRisk(null);
    setSelectedCompany("");
    setRiskFormData({ category: "", status: "open", owner: "" });
    setRegisterLoading(false);
  };

  const closeEditModal = () => setViewingEdit(null);

  const saveEditedAnalysis = async (payload: any) => {
    try {
      const res = await fetch("/api/analysis/update-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success) {
        fetchProcessedAssessments();
        closeEditModal();
        setMessage({ type: "success", text: "Analysis updated successfully" });
      } else {
        setMessage({
          type: "error",
          text: "Failed to save edits: " + (d.error || ""),
        });
      }
    } catch (err) {
      console.error("Save edit error", err);
      setMessage({ type: "error", text: "Error saving edits" });
    }
  };

  const handleRegisterRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringRisk || !viewingAssessment) return;

    setRegisterLoading(true);
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
          questionnaireId: viewingAssessment._id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Risk registered successfully" });
        closeRegisterRiskModal();
        fetchProcessedAssessments();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to register" });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Error registering risk" });
    } finally {
      setRegisterLoading(false);
    }
  };

  const registerAllRisks = async (
    analyses: QuestionAnalysis[],
    company: string
  ) => {
    if (!viewingAssessment) return;

    setRegisterLoading(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const analysis of analyses) {
        try {
          if (analysis.gap === "No significant gap identified") continue;

          const res = await fetch("/api/risks/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: `${analysis.question} — Answer: ${analysis.answer}`,
              company: company,
              category: "Assessment Risk",
              level: analysis.riskLevel.toLowerCase(),
              likelihood: analysis.likelihood,
              impact: analysis.impact,
              status: "open",
              owner: (session?.user as any)?.email || "",
              gap: analysis.gap,
              threat: analysis.threat,
              mitigation: analysis.mitigation,
              questionnaireId: viewingAssessment._id,
            }),
          });

          const data = await res.json();
          if (data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error("Error registering individual risk:", error);
          failCount++;
        }
      }

      if (successCount > 0) {
        setMessage({
          type: "success",
          text: `Successfully registered ${successCount} risk(s)${
            failCount > 0 ? `, ${failCount} failed` : ""
          }`,
        });
      } else {
        setMessage({ type: "error", text: "Failed to register risks" });
      }

      closeAssessmentModal();
      fetchProcessedAssessments();
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Error registering risks" });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleReanalyze = async (assessmentId: string) => {
    if (
      !confirm(
        "Re-analyze this assessment? This will replace the existing analysis with fresh AI results."
      )
    )
      return;

    setReanalyzing(true);
    try {
      const res = await fetch("/api/analysis/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: assessmentId }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Re-analysis completed successfully",
        });
        fetchProcessedAssessments();
        closeAssessmentModal();
      } else {
        setMessage({ type: "error", text: data.error || "Re-analysis failed" });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Error during re-analysis" });
    } finally {
      setReanalyzing(false);
    }
  };

  const filterItems = <
    T extends { company?: string; category?: string; date?: string }
  >(
    items: T[]
  ) => {
    return items.filter((item) => {
      if (!item) return false;
      const matchCompany =
        !companyFilter ||
        (item.company || "").toLowerCase().includes(companyFilter.toLowerCase());
      const matchCategory = !categoryFilter || item.category === categoryFilter;
      const matchDate = !dateFilter || item.date === dateFilter;
      return matchCompany && matchCategory && matchDate;
    });
  };

  const getRiskLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return "bg-red-600/20 text-red-400 border-red-600/30";
      case "high":
        return "bg-orange-600/20 text-orange-400 border-orange-600/30";
      case "medium":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
      case "low":
        return "bg-green-600/20 text-green-400 border-green-600/30";
      default:
        return "bg-slate-600/20 text-slate-400 border-slate-600/30";
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return "🔴";
      case "high":
        return "🟠";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
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

  const filteredAssessments = filterItems(processedAssessments).sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <div className="space-y-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4">🔍 Filter Assessments</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2">Company Name</label>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
                >
                  <option value="">All</option>
                  {availableCompanies.map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
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
          </div></div>

        {/* Assessments List */}
        <div className="space-y-4">
          {filteredAssessments.length === 0 ? (
            <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4 opacity-30">📋</div>
              <p className="text-white font-semibold mb-2">
                No processed assessments
              </p>
              <p className="text-slate-400">
                Analyze questionnaires to see results here
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-400 mb-4">
                Showing {filteredAssessments.length} of{" "}
                {processedAssessments.length} assessments
              </p>
              <div className="space-y-4">
                {filteredAssessments.map((assessment) => (
                  <div
                    key={assessment._id}
                    className="bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-blue-500 hover:shadow-lg transition cursor-pointer"
                    onClick={() => openAssessmentModal(assessment)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">
                          {assessment.company || "Unknown Company"}
                        </h3>
                        <div className="space-y-1 text-sm text-slate-300">
                          <p>
                            <span className="font-medium">Category:</span>{" "}
                            {assessment.category || "Uncategorized"}
                          </p>
                          <p>
                            <span className="font-medium">Date:</span>{" "}
                            {assessment.date
                              ? new Date(assessment.date).toLocaleDateString()
                              : "N/A"}
                          </p>
                          <p>
                            <span className="font-medium">Questions:</span>{" "}
                            {(assessment.analyses || []).length} analyzed
                          </p>
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssessmentModal(assessment);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium text-sm"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchProcessedAssessments();
                          }}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium text-sm"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Register Risk Modal */}
      {registeringRisk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">📝 Register Risk</h2>
              <button
                onClick={closeRegisterRiskModal}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Question & Answer */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-2">Question</p>
                  <p className="text-white font-medium">{registeringRisk.question}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-2">Answer</p>
                  <p className="text-slate-300">{registeringRisk.answer}</p>
                </div>
              </div>

              {/* Risk Details */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Likelihood</p>
                    <p className="text-2xl font-bold text-white">
                      {registeringRisk.likelihood}/5
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Impact</p>
                    <p className="text-2xl font-bold text-white">
                      {registeringRisk.impact}/5
                    </p>
                  </div>
                </div>
                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskLevelColor(
                      registeringRisk.riskLevel
                    )}`}
                  >
                    {getRiskLevelIcon(registeringRisk.riskLevel)}{" "}
                    {registeringRisk.riskLevel.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleRegisterRisk} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    value={selectedCompany}
                    readOnly
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Risk Category *
                  </label>
                  <input
                    type="text"
                    value={riskFormData.category}
                    onChange={(e) =>
                      setRiskFormData({
                        ...riskFormData,
                        category: e.target.value,
                      })
                    }
                    placeholder="e.g., Data Security, Compliance"
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Status
                    </label>
                    <select
                      value={riskFormData.status}
                      onChange={(e) =>
                        setRiskFormData({
                          ...riskFormData,
                          status: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="open">Open</option>
                      <option value="mitigated">Mitigated</option>
                      <option value="accepted">Accepted</option>
                      <option value="transferred">Transferred</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Risk Level
                    </label>
                    <input
                      type="text"
                      value={registeringRisk.riskLevel}
                      readOnly
                      className="w-full px-4 py-2 bg-slate-700 text-slate-400 rounded-md border border-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Risk Owner (Email) *
                  </label>
                  <input
                    type="email"
                    value={riskFormData.owner}
                    onChange={(e) =>
                      setRiskFormData({ ...riskFormData, owner: e.target.value })
                    }
                    placeholder="owner@company.com"
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registerLoading ? "Registering..." : "Register Risk"}
                  </button>
                  <button
                    type="button"
                    onClick={closeRegisterRiskModal}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Details Modal */}
      {viewingAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {viewingAssessment.company}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {viewingAssessment.category}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {viewingAssessment.date
                    ? new Date(viewingAssessment.date).toLocaleString()
                    : ""}
                </p>
              </div>
              <button
                onClick={closeAssessmentModal}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-2">
                  Total Questions Analyzed
                </p>
                <p className="text-3xl font-bold text-white">
                  {(viewingAssessment.analyses || []).length}
                </p>
              </div>

              {/* Questions & Analyses */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">
                  Questions & Analysis
                </h3>
                <div className="space-y-4">
                  {(viewingAssessment.analyses || []).map((a, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/50 rounded-lg p-4 border border-slate-700"
                    >
                      <div className="mb-4">
                        <p className="text-xs text-slate-400 mb-1">
                          Question {idx + 1}
                        </p>
                        <p className="text-white font-medium">{a.question}</p>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-slate-400 mb-1">Answer</p>
                        <p className="text-slate-300">{a.answer}</p>
                      </div>

                      {/* Risk Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">
                            Likelihood
                          </p>
                          <p className="text-xl font-bold text-white">
                            {a.likelihood ?? 0}/5
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Impact</p>
                          <p className="text-xl font-bold text-white">
                            {a.impact ?? 0}/5
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">
                            Risk Score
                          </p>
                          <p className="text-xl font-bold text-orange-400">
                            {a.riskScore ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">
                            Risk Level
                          </p>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold border ${getRiskLevelColor(
                              a.riskLevel
                            )}`}
                          >
                            {getRiskLevelIcon(a.riskLevel)}{" "}
                            {(a.riskLevel || "Unknown").toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Analysis Details */}
                      <div className="space-y-3 mb-4">
                        {a.gap && a.gap !== "" && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Gap</p>
                            <p className="text-slate-300 text-sm">{a.gap}</p>
                          </div>
                        )}
                        {a.threat && a.threat !== "" && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Threat</p>
                            <p className="text-slate-300 text-sm">{a.threat}</p>
                          </div>
                        )}
                        {a.mitigation && a.mitigation !== "" && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">
                              Mitigation
                            </p>
                            <p className="text-slate-300 text-sm">
                              {a.mitigation}
                            </p>
                          </div>
                        )}
                        {a.impactDescription && a.impactDescription !== "" && (
                          <div>
                            <p className="text-xs text-slate-400 mb-1">
                              Impact Description
                            </p>
                            <p className="text-slate-300 text-sm">
                              {a.impactDescription}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setViewingEdit({
                              assessmentId: viewingAssessment._id,
                              level: a.riskLevel,
                              questionId: idx,
                              current: a,
                            })
                          }
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-medium transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            openRegisterRiskModal(a, viewingAssessment.company)
                          }
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition"
                        >
                          Register as Risk
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6 flex justify-between gap-3">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const allAnalyses = viewingAssessment.analyses || [];
                    if (allAnalyses.length === 0) {
                      alert("No questions to register as risks");
                      return;
                    }
                    if (
                      confirm(
                        `Register all ${allAnalyses.length} questions as risks?`
                      )
                    ) {
                      registerAllRisks(allAnalyses, viewingAssessment.company);
                    }
                  }}
                  disabled={registerLoading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Register All Risks ({(viewingAssessment.analyses || []).length})
                </button>
                <button
                  onClick={() => handleReanalyze(viewingAssessment._id)}
                  disabled={reanalyzing}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reanalyzing ? "Re-analyzing..." : "Re-analyze"}
                </button>
              </div>
              <button
                onClick={closeAssessmentModal}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Analysis Modal */}
      {viewingEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full">
            {/* Modal Header */}
            <div className="bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">✏️ Edit Analysis</h2>
              <button
                onClick={closeEditModal}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Likelihood (1-5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={viewingEdit.current.likelihood}
                  id="edit-likelihood"
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Impact (1-5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={viewingEdit.current.impact}
                  id="edit-impact"
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Gap
                </label>
                <textarea
                  defaultValue={viewingEdit.current.gap}
                  id="edit-gap"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Threat
                </label>
                <textarea
                  defaultValue={viewingEdit.current.threat}
                  id="edit-threat"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mitigation
                </label>
                <textarea
                  defaultValue={viewingEdit.current.mitigation}
                  id="edit-mitigation"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-800 border-t border-slate-700 p-6 flex gap-3">
              <button
                onClick={async () => {
                  const likelihood = Number(
                    (
                      document.getElementById("edit-likelihood") as HTMLInputElement
                    ).value || viewingEdit.current.likelihood
                  );
                  const impact = Number(
                    (
                      document.getElementById("edit-impact") as HTMLInputElement
                    ).value || viewingEdit.current.impact
                  );
                  const gap = (
                    document.getElementById("edit-gap") as HTMLTextAreaElement
                  ).value;
                  const threat = (
                    document.getElementById("edit-threat") as HTMLTextAreaElement
                  ).value;
                  const mitigation = (
                    document.getElementById(
                      "edit-mitigation"
                    ) as HTMLTextAreaElement
                  ).value;

                  await saveEditedAnalysis({
                    analysisId: viewingEdit.assessmentId,
                    level: viewingEdit.level,
                    questionId: viewingEdit.questionId,
                    analysis: { likelihood, impact, gap, threat, mitigation },
                  });
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium"
              >
                Save Changes
              </button>
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}