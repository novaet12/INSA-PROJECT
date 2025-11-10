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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [riskMatrix, setRiskMatrix] = useState<any>(null);
  const [aleData, setAleData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "analysis">("overview");

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


  useEffect(() => {
    if (activeTab === "analysis") {
      fetchRiskMatrix();
    }
  }, [activeTab]);

  // Fetch questionnaires action removed from dashboard UI

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
            onClick={() => setActiveTab("analysis")}
            className={`px-6 py-3 font-medium transition ${
              activeTab === "analysis"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Risk Analysis
          </button>
          {/* Trends tab removed */}
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

        {/* Recent Analyses removed from dashboard */}
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

        {/* Trends tab removed from dashboard */}
      </div>
    </Layout>
  );
}

