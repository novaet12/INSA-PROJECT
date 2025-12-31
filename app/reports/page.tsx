"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

/* ---------------- Types for DOCX tab ---------------- */

type Assessment = {
  _id: string;
  company: string;
  category: string;
  date: string;
  analyses: Array<{
    questionId: number;
    level: string;
    question: string;
    answer: string;
    likelihood: number;
    impact: number;
    riskScore: number;
    riskLevel: string;
    gap: string;
    threat: string;
    mitigation: string;
    impactLabel: string;
    impactDescription: string;
  }>;
};

/* ---------------- Types for EXCEL tab ---------------- */

interface RegisteredRisk {
  _id: string;
  riskId: string;
  riskName: string;
  category: string;
  status: "open" | "closed";
  type: "risk" | "issue";
  threat: "threat" | "opportunity";
  level: "low" | "medium" | "high" | "critical";
  preProbability: number;
  preImpact: number;
  preScore: number;
  costPre: number;
  postProbability: number;
  postImpact: number;
  postScore: number;
  costPost: number;
  score: number;
  description: string;
  company?: string;
  batchId?: string;
  createdAt: string;
}

interface Batch {
  _id: string;
  batchId: string;
  company?: string;
  createdAt: string;
  riskCount?: number;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  /* ---------------- Shared state ---------------- */

  const [activeTab, setActiveTab] = useState<"docx" | "excel">("docx");

  /* ---------------- DOCX tab state ---------------- */

  const [processedAssessments, setProcessedAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [loadingDocx, setLoadingDocx] = useState(true);

  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /* ---------------- EXCEL tab state ---------------- */

  const [batches, setBatches] = useState<Batch[]>([]);
  const [risks, setRisks] = useState<RegisteredRisk[]>([]);
  const [loadingExcel, setLoadingExcel] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isBatchDetailModalOpen, setIsBatchDetailModalOpen] = useState(false);
  const [isCreateBatchModalOpen, setIsCreateBatchModalOpen] = useState(false);
  const [isAddRiskModalOpen, setIsAddRiskModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [exportLoading, setExportLoading] = useState(false);

  // Filter states for EXCEL tab
  const [companyFilter, setCompanyFilter] = useState("");
  const [levelFilter] = useState(""); // reserved if you add later
  const [statusFilter] = useState(""); // reserved if you add later

  // Form states for creating new batch
  const [formData, setFormData] = useState({
    batchId: "",
    company: "",
  });

  // Form states for adding risk to batch
  const [riskFormData, setRiskFormData] = useState({
    riskId: "",
    riskName: "",
    category: "",
    status: "open" as const,
    type: "risk" as const,
    nature: "threat" as const,
    level: "medium" as const,
    preProbability: 50,
    preImpact: 50,
    preScore: 50,
    preCost: 0,
    postProbability: 25,
    postImpact: 25,
    postScore: 25,
    postCost: 0,
    score: 50,
    description: "",
    batchId: "",
  });

  /* ---------------- Auth effect ---------------- */

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  /* ---------------- DOCX tab logic ---------------- */

  const fetchProcessedAssessments = useCallback(async () => {
    try {
      setLoadingDocx(true);
      const res = await fetch("/api/analysis/processed");
      const data = await res.json();
      setProcessedAssessments(
        data.success && Array.isArray(data.assessments) ? data.assessments : []
      );
    } catch (error) {
      console.error("Error:", error);
      setProcessedAssessments([]);
    } finally {
      setLoadingDocx(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchProcessedAssessments();
    }
  }, [status, fetchProcessedAssessments]);

  useEffect(() => {
    let filtered = [...processedAssessments];

    if (selectedCompany) {
      filtered = filtered.filter(
        (assessment) =>
          assessment.company.toLowerCase() === selectedCompany.toLowerCase()
      );
    }

    if (selectedDate) {
      filtered = filtered.filter((assessment) => {
        const assessmentDate = new Date(assessment.date)
          .toISOString()
          .split("T")[0];
        return assessmentDate === selectedDate;
      });
    }

    setFilteredAssessments(filtered);
  }, [processedAssessments, selectedCompany, selectedDate]);

  const handleViewDetails = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsModalOpen(true);
  };

  const handleGenerateReport = async (assessment: Assessment) => {
    try {
      const response = await fetch(
        `/api/reports/export?analysisId=${assessment._id}&format=DOCX`
      );

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${assessment.company}-${new Date(
        assessment.date
      )
        .toISOString()
        .split("T")[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error generating report");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAssessment(null);
  };

  const uniqueCompaniesDocx = Array.from(
    new Set(processedAssessments.map((a) => a.company))
  );

  const uniqueDates = Array.from(
    new Set(
      processedAssessments.map((a) =>
        new Date(a.date).toISOString().split("T")[0]
      )
    )
  )
    .sort()
    .reverse();

  /* ---------------- EXCEL tab logic ---------------- */

  const fetchBatches = useCallback(async () => {
    try {
      setLoadingExcel(true);
      const params = new URLSearchParams();
      if (companyFilter) params.append("company", companyFilter);

      const res = await fetch(`/api/registeredrisks/list?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBatches(data.batches || []);
      } else {
        setBatches([]);
      }
    } catch (err) {
      console.error("Failed to fetch batches", err);
      setBatches([]);
    } finally {
      setLoadingExcel(false);
    }
  }, [companyFilter]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchBatches();
    }
  }, [status, fetchBatches]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchBatches();
    }
  }, [companyFilter, levelFilter, statusFilter, status, fetchBatches]);

  const fetchBatchRisks = async (batchId: string) => {
    try {
      const res = await fetch(`/api/registeredrisks/list?batchId=${batchId}`);
      const data = await res.json();
      if (data.success) {
        setRisks(data.risks || []);
      } else {
        setRisks([]);
      }
    } catch (err) {
      console.error("Failed to fetch batch risks", err);
      setRisks([]);
    }
  };

  const handleViewBatchDetails = (batch: Batch) => {
    setSelectedBatch(batch);
    fetchBatchRisks(batch.batchId);
    setIsBatchDetailModalOpen(true);
  };

  const closeBatchDetailModal = () => {
    setIsBatchDetailModalOpen(false);
    setSelectedBatch(null);
    setRisks([]);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/registeredrisks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("Batch created successfully!");
        setIsCreateBatchModalOpen(false);
        setFormData({
          batchId: "",
          company: "",
        });
        fetchBatches();
      } else {
        const errorMsg = data.error || "Failed to create batch. Please try again.";
        setErrorMessage(errorMsg);
        alert(`Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error creating batch:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Network error. Please try again.";
      setErrorMessage(errorMsg);
      alert(`Error: ${errorMsg}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAddRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setErrorMessage("");

    if (!selectedBatch) return;

    try {
      const res = await fetch("/api/registeredrisks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...riskFormData,
          batchId: selectedBatch.batchId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("Risk added successfully!");
        setIsAddRiskModalOpen(false);
        setRiskFormData({
          riskId: "",
          riskName: "",
          category: "",
          status: "open",
          type: "risk",
          nature: "threat",
          level: "medium",
          preProbability: 50,
          preImpact: 50,
          preScore: 50,
          preCost: 0,
          postProbability: 25,
          postImpact: 25,
          postScore: 25,
          postCost: 0,
          score: 50,
          description: "",
          batchId: "",
        });
        fetchBatchRisks(selectedBatch.batchId);
      } else {
        const errorMsg = data.error || "Failed to add risk. Please try again.";
        setErrorMessage(errorMsg);
        alert(`Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error adding risk:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Network error. Please try again.";
      setErrorMessage(errorMsg);
      alert(`Error: ${errorMsg}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleExportExcel = async (batch: Batch) => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/excelreport/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batch.batchId }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate Excel report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `batch-${batch.batchId}-${new Date()
        .toISOString()
        .split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error exporting Excel:", err);
      alert("Failed to export Excel file. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRiskFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setRiskFormData((prev) => ({
      ...prev,
      [name]: isNaN(Number(value)) ? value : Number(value),
    }));
  };

  const getLevelColor = (level: string) => {
    switch (level) {
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

  const uniqueCompaniesExcel = Array.from(
    new Set(batches.map((b) => b.company).filter(Boolean))
  ) as string[];

  /* ---------------- Loading / auth guards ---------------- */

  const isLoadingAny = (status === "loading") || (activeTab === "docx" ? loadingDocx : loadingExcel);

  if (isLoadingAny) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!session) return null;

  /* ---------------- Render ---------------- */

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Reports</h1>

        {/* Tabs header */}
        <div className="border-b border-slate-700">
          <nav className="flex space-x-4" aria-label="Report tabs">
            <button
              onClick={() => setActiveTab("docx")}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 ${
                activeTab === "docx"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-400 hover:text-white hover:border-slate-500"
              }`}
            >
              Generate DOCX
            </button>
            <button
              onClick={() => setActiveTab("excel")}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 ${
                activeTab === "excel"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-400 hover:text-white hover:border-slate-500"
              }`}
            >
              Generate EXCEL
            </button>
          </nav>
        </div>

        {/* DOCX TAB */}
        {activeTab === "docx" && (
          <>
            {/* Filters */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Filter by Company
                  </label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Companies</option>
                    {uniqueCompaniesDocx.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Filter by Date
                  </label>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Dates</option>
                    {uniqueDates.map((date) => (
                      <option key={date} value={date}>
                        {new Date(date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Assessments List */}
            {filteredAssessments.length > 0 ? (
              <div className="space-y-4">
                {filteredAssessments.map((assessment) => (
                  <div
                    key={assessment._id}
                    className="bg-slate-800 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">
                          {assessment.company}
                        </h3>
                        <div className="space-y-1 text-sm text-slate-300">
                          <p>
                            <span className="font-medium">Category:</span>{" "}
                            {assessment.category}
                          </p>
                          <p>
                            <span className="font-medium">Date:</span>{" "}
                            {new Date(assessment.date).toLocaleDateString()}{" "}
                            {new Date(assessment.date).toLocaleTimeString()}
                          </p>
                          <p>
                            <span className="font-medium">
                              Questions Analyzed:
                            </span>{" "}
                            {assessment.analyses.length}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3 ml-4">
                        <button
                          onClick={() => handleViewDetails(assessment)}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition text-sm font-medium"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleGenerateReport(assessment)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition text-sm font-medium"
                        >
                          Generate Report
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
                <p className="text-slate-400 text-lg">
                  No assessed questionnaires found.
                </p>
                <p className="text-slate-500 text-sm mt-2">
                  Complete and analyze questionnaires to see them here.
                </p>
              </div>
            )}
          </>
        )}

        {/* EXCEL TAB */}
        {activeTab === "excel" && (
          <>
            {/* Header + Add Batch */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Batch Register</h2>
              <button
                onClick={() => {
                  setIsCreateBatchModalOpen(true);
                  setErrorMessage("");
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium"
              >
                + Add New Batch
              </button>
            </div>

            {/* Filters */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Filter Batches</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Company
                  </label>
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Companies</option>
                    {uniqueCompaniesExcel.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Batches List */}
            <div className="space-y-4">
              {batches.length === 0 ? (
                <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg p-12 text-center">
                  <p className="text-white font-semibold mb-2">No batches found</p>
                  <p className="text-slate-400">
                    Try adjusting your filters or add new batches
                  </p>
                </div>
              ) : (
                batches.map((batch) => (
                  <div
                    key={batch._id}
                    className="bg-slate-800 rounded-lg border border-slate-700 p-6 cursor-pointer hover:border-blue-500 hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start">
                      <div
                        className="flex-1"
                        onClick={() => handleViewBatchDetails(batch)}
                      >
                        <h3 className="text-lg font-bold text-white mb-2">
                          {batch.batchId}
                        </h3>
                        <div className="space-y-1 text-sm text-slate-300">
                          <p>
                            <span className="font-medium">Company:</span>{" "}
                            {batch.company || "N/A"}
                          </p>
                          <p>
                            <span className="font-medium">Date:</span>{" "}
                            {new Date(batch.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleViewBatchDetails(batch)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition"
                        >
                          View Risks
                        </button>
                        <button
                          onClick={() => handleExportExcel(batch)}
                          disabled={exportLoading}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {exportLoading ? "Exporting..." : "Export Excel"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* DOCX details modal */}
      {isModalOpen && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedAssessment.company}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {new Date(selectedAssessment.date).toLocaleDateString()}{" "}
                  {new Date(selectedAssessment.date).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {selectedAssessment.analyses.map((analysis, index) => (
                <div
                  key={index}
                  className="border border-slate-700 rounded-lg p-4 space-y-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-400 mb-1">
                      Question {index + 1}
                    </p>
                    <p className="text-white font-medium">
                      {analysis.question}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-400 mb-1">
                      Answer
                    </p>
                    <p className="text-slate-300">{analysis.answer}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400 mb-1">Likelihood</p>
                      <p className="text-white font-medium">
                        {analysis.likelihood}/5
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-1">Impact</p>
                      <p className="text-white font-medium">
                        {analysis.impact}/5
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400 mb-1">Risk Score</p>
                      <p className="text-white font-medium">
                        {analysis.riskScore}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-1">Risk Level</p>
                      <p
                        className={`font-medium ${
                          analysis.riskLevel === "CRITICAL"
                            ? "text-red-400"
                            : analysis.riskLevel === "HIGH"
                            ? "text-orange-400"
                            : analysis.riskLevel === "MEDIUM"
                            ? "text-yellow-400"
                            : "text-green-400"
                        }`}
                      >
                        {analysis.riskLevel}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-400 mb-1">
                      Gap
                    </p>
                    <p className="text-slate-300 text-sm">{analysis.gap}</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-400 mb-1">
                      Threat
                    </p>
                    <p className="text-slate-300 text-sm">{analysis.threat}</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-400 mb-1">
                      Mitigation
                    </p>
                    <p className="text-slate-300 text-sm">
                      {analysis.mitigation}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6 flex space-x-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleGenerateReport(selectedAssessment);
                  closeModal();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Detail Modal (EXCEL) */}
      {isBatchDetailModalOpen && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Batch: {selectedBatch.batchId}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Company: {selectedBatch.company || "N/A"}
                </p>
              </div>
              <button
                onClick={closeBatchDetailModal}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Risks in Batch</h3>
                <button
                  onClick={() => {
                    setIsAddRiskModalOpen(true);
                    setErrorMessage("");
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition"
                >
                  + Add Risk
                </button>
              </div>

              {/* Risks in Batch */}
              <div className="space-y-3">
                {risks.length === 0 ? (
                  <div className="bg-slate-900/50 rounded-lg p-6 text-center">
                    <p className="text-slate-400">
                      No risks in this batch yet
                    </p>
                  </div>
                ) : (
                  risks.map((risk) => (
                    <div
                      key={risk._id}
                      className="bg-slate-900/50 rounded-lg border border-slate-700 p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-bold text-white mb-2">
                            {risk.riskName}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-300">
                            <div>
                              <span className="font-medium text-slate-400">
                                Risk ID:
                              </span>{" "}
                              {risk.riskId}
                            </div>
                            <div>
                              <span className="font-medium text-slate-400">
                                Category:
                              </span>{" "}
                              {risk.category}
                            </div>
                            <div>
                              <span className="font-medium text-slate-400">
                                Type:
                              </span>{" "}
                              {risk.type}
                            </div>
                            <div>
                              <span className="font-medium text-slate-400">
                                Status:
                              </span>{" "}
                              {risk.status}
                            </div>
                          </div>
                        </div>

                        {/* Risk Level Badge */}
                        <div className="ml-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getLevelColor(
                              risk.level
                            )}`}
                          >
                            {risk.level.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6">
              <button
                onClick={closeBatchDetailModal}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {isCreateBatchModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Add New Batch</h2>
              <button
                onClick={() => {
                  setIsCreateBatchModalOpen(false);
                  setErrorMessage("");
                }}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="bg-red-900/30 border border-red-600/50 text-red-300 p-4 m-4 rounded-lg">
                <p className="text-sm">
                  <span className="font-bold">Error:</span> {errorMessage}
                </p>
              </div>
            )}

            {/* Modal Content */}
            <form onSubmit={handleCreateBatch} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Batch ID *
                </label>
                <input
                  type="text"
                  name="batchId"
                  value={formData.batchId}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., BATCH-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., ACME Corp"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateBatchModalOpen(false);
                    setErrorMessage("");
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? "Creating..." : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Risk Modal */}
      {isAddRiskModalOpen && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
                Add Risk to {selectedBatch.batchId}
              </h2>
              <button
                onClick={() => {
                  setIsAddRiskModalOpen(false);
                  setErrorMessage("");
                }}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="bg-red-900/30 border border-red-600/50 text-red-300 p-4 m-4 rounded-lg">
                <p className="text-sm">
                  <span className="font-bold">Error:</span> {errorMessage}
                </p>
              </div>
            )}

            {/* Modal Content */}
            <form onSubmit={handleAddRisk} className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Risk ID *
                  </label>
                  <input
                    type="text"
                    name="riskId"
                    value={riskFormData.riskId}
                    onChange={handleRiskFormChange}
                    required
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., RISK-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Risk Name *
                  </label>
                  <input
                    type="text"
                    name="riskName"
                    value={riskFormData.riskName}
                    onChange={handleRiskFormChange}
                    required
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Data Breach"
                  />
                </div>
              </div>

              {/* Category and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={riskFormData.category}
                    onChange={handleRiskFormChange}
                    required
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Security"
                  />
                </div>
              </div>

              {/* Type, Nature, Level, Status */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Type *
                  </label>
                  <select
                    name="type"
                    value={riskFormData.type}
                    onChange={handleRiskFormChange}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="risk">Risk</option>
                    <option value="issue">Issue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nature *
                  </label>
                  <select
                    name="nature"
                    value={riskFormData.nature}
                    onChange={handleRiskFormChange}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="threat">Threat</option>
                    <option value="opportunity">Opportunity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Level *
                  </label>
                  <select
                    name="level"
                    value={riskFormData.level}
                    onChange={handleRiskFormChange}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={riskFormData.status}
                    onChange={handleRiskFormChange}
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Pre-Mitigation */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h4 className="text-white font-bold mb-3">Pre-Mitigation</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Probability (0-100)
                    </label>
                    <input
                      type="number"
                      name="preProbability"
                      value={riskFormData.preProbability}
                      onChange={handleRiskFormChange}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Impact (0-100)
                    </label>
                    <input
                      type="number"
                      name="preImpact"
                      value={riskFormData.preImpact}
                      onChange={handleRiskFormChange}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Score (0-100)
                    </label>
                    <input
                      type="number"
                      name="preScore"
                      value={riskFormData.preScore}
                      onChange={handleRiskFormChange}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Cost
                    </label>
                    <input
                      type="number"
                      name="preCost"
                      value={riskFormData.preCost}
                      onChange={handleRiskFormChange}
                      min="0"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Post-Mitigation */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h4 className="text-white font-bold mb-3">Post-Mitigation</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Probability (0-100)
                    </label>
                    <input
                      type="number"
                      name="postProbability"
                      value={riskFormData.postProbability}
                      onChange={handleRiskFormChange}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Impact (0-100)
                    </label>
                    <input
                      type="number"
                      name="postImpact"
                      value={riskFormData.postImpact}
                      onChange={handleRiskFormChange}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Score (0-100)
                    </label>
                    <input
                      type="number"
                      name="postScore"
                      value={riskFormData.postScore}
                      onChange={handleRiskFormChange}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Cost
                    </label>
                    <input
                      type="number"
                      name="postCost"
                      value={riskFormData.postCost}
                      onChange={handleRiskFormChange}
                      min="0"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Overall Score */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Overall Score (0-100) *
                </label>
                <input
                  type="number"
                  name="score"
                  value={riskFormData.score}
                  onChange={handleRiskFormChange}
                  min="0"
                  max="100"
                  required
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={riskFormData.description}
                  onChange={handleRiskFormChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Detailed description of the risk..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddRiskModalOpen(false);
                    setErrorMessage("");
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? "Adding..." : "Add Risk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
