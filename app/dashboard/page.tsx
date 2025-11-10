"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import RiskMatrix from "@/components/RiskMatrix";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [riskMatrix, setRiskMatrix] = useState<any>(null);
  const [aleData, setAleData] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "analysis" | "trends">("overview");

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
        setRecentAnalyses(data.recentAnalyses || []);
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

  const fetchTrends = async () => {
    try {
      const response = await fetch("/api/analysis/trends");
      const data = await response.json();
      if (data.success) {
        setTrends(data);
      }
    } catch (error) {
      console.error("Error fetching trends:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "analysis") {
      fetchRiskMatrix();
    } else if (activeTab === "trends") {
      fetchTrends();
    }
  }, [activeTab]);

  const handleFetchQuestionnaires = async () => {
    setFetching(true);
    try {
      const response = await fetch("/api/questionnaires/fetch", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        alert(`Successfully fetched ${data.count} questionnaire(s)`);
        fetchStats(); // Refresh stats
      } else {
        alert("Error: " + (data.error || "Failed to fetch questionnaires"));
      }
    } catch (error) {
      console.error("Error fetching questionnaires:", error);
      alert("Error fetching questionnaires");
    } finally {
      setFetching(false);
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

  if (!session) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <button
            onClick={handleFetchQuestionnaires}
            disabled={fetching}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition disabled:opacity-50"
          >
            {fetching ? "Fetching..." : "Fetch Questionnaires"}
          </button>
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
            onClick={() => setActiveTab("analysis")}
            className={`px-6 py-3 font-medium transition ${
              activeTab === "analysis"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Risk Analysis
          </button>
          <button
            onClick={() => setActiveTab("trends")}
            className={`px-6 py-3 font-medium transition ${
              activeTab === "trends"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Trends
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

        {/* Recent Analyses Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">Recent Analyses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {recentAnalyses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-center text-slate-400"
                    >
                      No analyses yet. Fetch questionnaires to get started.
                    </td>
                  </tr>
                ) : (
                  recentAnalyses.map((analysis) => (
                    <tr key={analysis._id} className="hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {analysis.riskScore}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            analysis.category === "High"
                              ? "bg-red-900/50 text-red-300"
                              : analysis.category === "Medium"
                              ? "bg-yellow-900/50 text-yellow-300"
                              : "bg-green-900/50 text-green-300"
                          }`}
                        >
                          {analysis.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {new Date(analysis.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}

        {/* Risk Analysis Tab */}
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

        {/* Trends Tab */}
        {activeTab === "trends" && trends && (
          <div className="space-y-6">
            {/* Monthly Trends */}
            {trends.monthlyTrends && trends.monthlyTrends.length > 0 && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Monthly Risk Trends
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trends.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        color: "#f1f5f9",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="high" stackId="a" fill="#dc2626" />
                    <Bar dataKey="medium" stackId="a" fill="#eab308" />
                    <Bar dataKey="low" stackId="a" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Risk Score Trends */}
            {trends.riskScoreTrends && trends.riskScoreTrends.length > 0 && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Risk Score Trends (Inherent vs Residual)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.riskScoreTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                    />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        color: "#f1f5f9",
                      }}
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="inherentRisk"
                      stroke="#ef4444"
                      name="Inherent Risk"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="residualRisk"
                      stroke="#22c55e"
                      name="Residual Risk"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

