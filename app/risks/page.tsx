"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

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
  questionnaireId?: string;
  createdAt: string;
}

export default function RisksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [registeredRisks, setRegisteredRisks] = useState<RegisteredRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState<RegisteredRisk | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Filter states
  const [companyFilter, setCompanyFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Form states for creating new risk
  const [formData, setFormData] = useState({
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
    company: "",
    questionnaireId: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchRegisteredRisks();
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchRegisteredRisks();
    }
  }, [companyFilter, levelFilter, statusFilter, status]);

  const fetchRegisteredRisks = async () => {
    try {
      const params = new URLSearchParams();
      if (companyFilter) params.append("company", companyFilter);
      if (levelFilter) params.append("level", levelFilter);
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/airegisterdrisks/list?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRegisteredRisks(data.risks || []);
      }
    } catch (err) {
      console.error("Failed to fetch registered risks", err);
      setRegisteredRisks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (risk: RegisteredRisk) => {
    setSelectedRisk(risk);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRisk(null);
  };

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/airegisterdrisks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("Risk created successfully!");
        setIsCreateModalOpen(false);
        setFormData({
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
          company: "",
          questionnaireId: "",
        });
        fetchRegisteredRisks();
      } else {
        // Show specific error message from backend
        const errorMsg =
          data.error || "Failed to create risk. Please try again.";
        setErrorMessage(errorMsg);
        alert(`Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error creating risk:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Network error. Please try again.";
      setErrorMessage(errorMsg);
      alert(`Error: ${errorMsg}`);
    } finally {
      setCreateLoading(false);
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

  const getLevelIcon = (level: string) => {
    switch (level) {
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

  const uniqueCompanies = Array.from(
    new Set(registeredRisks.map((r) => r.company).filter(Boolean))
  ) as string[];

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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">🛡️ Risk Register</h1>
          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setErrorMessage("");
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition font-medium"
          >
            + Add Risk Manually
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">🔍 Filter Risks</h3>
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
                {uniqueCompanies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Risk Level
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Risks List */}
        <div className="space-y-4">
          {registeredRisks.length === 0 ? (
            <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4 opacity-30">📋</div>
              <p className="text-white font-semibold mb-2">No risks found</p>
              <p className="text-slate-400">
                Try adjusting your filters or add new risks to the register
              </p>
            </div>
          ) : (
            registeredRisks.map((risk) => (
              <div
                key={risk._id}
                onClick={() => handleViewDetails(risk)}
                className="bg-slate-800 rounded-lg border border-slate-700 p-6 cursor-pointer hover:border-blue-500 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">
                      {risk.riskName}
                    </h3>
                    <div className="space-y-1 text-sm text-slate-300">
                      <p>
                        <span className="font-medium">Company:</span>{" "}
                        {risk.company || "N/A"}
                      </p>
                      <p>
                        <span className="font-medium">Risk ID:</span>{" "}
                        {risk.riskId}
                      </p>
                      <p>
                        <span className="font-medium">Date:</span>{" "}
                        {new Date(risk.createdAt).toLocaleDateString()}
                      </p>
                      {risk.questionnaireId && (
                        <p>
                          <span className="font-medium">
                            Questionnaire ID:
                          </span>{" "}
                          {risk.questionnaireId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 ml-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getLevelColor(
                        risk.level
                      )}`}
                    >
                      {getLevelIcon(risk.level)} {risk.level.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-600/20 text-blue-400 border border-blue-600/30">
                      {risk.status.charAt(0).toUpperCase() +
                        risk.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRisk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedRisk.riskName}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Risk ID: {selectedRisk.riskId}
                </p>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-2">
                  Description
                </h3>
                <p className="text-slate-300">{selectedRisk.description}</p>
              </div>

              {/* Details Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-700">
                      <td className="px-4 py-3 text-slate-400 font-medium">
                        Category
                      </td>
                      <td className="px-4 py-3 text-white">
                        {selectedRisk.category}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-medium">
                        Type
                      </td>
                      <td className="px-4 py-3 text-white">
                        {selectedRisk.type.charAt(0).toUpperCase() +
                          selectedRisk.type.slice(1)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-700">
                      <td className="px-4 py-3 text-slate-400 font-medium">
                        Nature
                      </td>
                      <td className="px-4 py-3 text-white">
                        {selectedRisk.threat.charAt(0).toUpperCase() +
                          selectedRisk.threat.slice(1)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-medium">
                        Status
                      </td>
                      <td className="px-4 py-3 text-white">
                        {selectedRisk.status.charAt(0).toUpperCase() +
                          selectedRisk.status.slice(1)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-700">
                      <td className="px-4 py-3 text-slate-400 font-medium">
                        Level
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getLevelColor(
                            selectedRisk.level
                          )}`}
                        >
                          {getLevelIcon(selectedRisk.level)}{" "}
                          {selectedRisk.level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-medium">
                        Company
                      </td>
                      <td className="px-4 py-3 text-white">
                        {selectedRisk.company || "N/A"}
                      </td>
                    </tr>
                    {selectedRisk.questionnaireId && (
                      <tr className="border-b border-slate-700">
                        <td className="px-4 py-3 text-slate-400 font-medium">
                          Questionnaire ID
                        </td>
                        <td className="px-4 py-3 text-white">
                          {selectedRisk.questionnaireId}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-medium">
                          Created Date
                        </td>
                        <td className="px-4 py-3 text-white">
                          {new Date(selectedRisk.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pre-Mitigation Section */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">
                  Pre-Mitigation
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Probability</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedRisk.preProbability}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Impact</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedRisk.preImpact}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Score</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {selectedRisk.preScore}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Cost</p>
                    <p className="text-2xl font-bold text-white">
                      ${selectedRisk.costPre.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Post-Mitigation Section */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">
                  Post-Mitigation
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Probability</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedRisk.postProbability}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Impact</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedRisk.postImpact}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Score</p>
                    <p className="text-2xl font-bold text-green-400">
                      {selectedRisk.postScore}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Cost</p>
                    <p className="text-2xl font-bold text-white">
                      ${selectedRisk.costPost.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Overall Score */}
              <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-600/30">
                <p className="text-sm text-slate-400 mb-2">Overall Score</p>
                <p className="text-4xl font-bold text-blue-400">
                  {selectedRisk.score}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6">
              <button
                onClick={closeDetailModal}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Risk Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Add Risk Manually</h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
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
            <form onSubmit={handleCreateRisk} className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Risk ID *
                  </label>
                  <input
                    type="text"
                    name="riskId"
                    value={formData.riskId}
                    onChange={handleFormChange}
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
                    value={formData.riskName}
                    onChange={handleFormChange}
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
                    value={formData.category}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Security"
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
              </div>

              {/* Type, Nature, Level, Status */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleFormChange}
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
                    value={formData.nature}
                    onChange={handleFormChange}
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
                    value={formData.level}
                    onChange={handleFormChange}
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
                    value={formData.status}
                    onChange={handleFormChange}
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
                      value={formData.preProbability}
                      onChange={handleFormChange}
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
                      value={formData.preImpact}
                      onChange={handleFormChange}
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
                      value={formData.preScore}
                      onChange={handleFormChange}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Cost ($)
                    </label>
                    <input
                      type="number"
                      name="preCost"
                      value={formData.preCost}
                      onChange={handleFormChange}
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
                      value={formData.postProbability}
                      onChange={handleFormChange}
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
                      value={formData.postImpact}
                      onChange={handleFormChange}
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
                      value={formData.postScore}
                      onChange={handleFormChange}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-2">
                      Cost ($)
                    </label>
                    <input
                      type="number"
                      name="postCost"
                      value={formData.postCost}
                      onChange={handleFormChange}
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
                  value={formData.score}
                  onChange={handleFormChange}
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
                  value={formData.description}
                  onChange={handleFormChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Detailed description of the risk..."
                />
              </div>

              {/* Questionnaire ID (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Questionnaire ID (Optional)
                </label>
                <input
                  type="text"
                  name="questionnaireId"
                  value={formData.questionnaireId}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-md border border-slate-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Link to questionnaire batch ID"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
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
                  {createLoading ? "Creating..." : "Create Risk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}