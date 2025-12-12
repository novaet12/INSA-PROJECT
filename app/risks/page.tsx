"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

interface Risk {
  _id: string;
  description: string;
  company?: string;
  category: string;
  level: string;
  status: string;
  likelihood: number;
  impact: number;
  owner: string;
  createdAt: string;
  gap?: string;
  threat?: string;
  mitigation?: string;
  mitigationStrategy?: string;
  mitigationCost?: number;
  mitigationEffectiveness?: number;
}

interface Stats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  open: number;
}

export default function RisksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [allRisks, setAllRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);

  // Filter states
  const [companyFilter, setCompanyFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchRegisteredRisks();
      fetchCompanies();
    }
  }, [status, router]);

  // Re-fetch when filters change
  useEffect(() => {
    if (status === "authenticated") {
      fetchRegisteredRisks();
    }
  }, [companyFilter, levelFilter, statusFilter, dateFilter, status]);

  // ✅ CHANGED: Now uses query parameters for server-side filtering
  const fetchRegisteredRisks = async () => {
    try {
      const params = new URLSearchParams();
      if (companyFilter) params.append('company', companyFilter);
      if (levelFilter) params.append('level', levelFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFilter) params.append('dateFrom', dateFilter);

      const res = await fetch(`/api/risks/list?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAllRisks(data.risks || []);
      }
    } catch (err) {
      console.error("Failed to fetch registered risks", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/risks/list');
      const data = await res.json();
      if (data.success && Array.isArray(data.risks)) {
        const companies = Array.from(new Set(
          data.risks
            .map((risk: Risk) => risk.company)
            .filter((company: string | undefined) => company)
        )) as string[];
        setAvailableCompanies(companies);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const calculateStats = (): Stats => {
    return {
      total: allRisks.length,
      critical: allRisks.filter((r) => r.level === "critical").length,
      high: allRisks.filter((r) => r.level === "high").length,
      medium: allRisks.filter((r) => r.level === "medium").length,
      low: allRisks.filter((r) => r.level === "low").length,
      open: allRisks.filter((r) => r.status === "open").length,
    };
  };

  const stats = calculateStats();

  const getLevelColor = (level: string) => {
    switch (level) {
      case "critical": return "text-red-600 bg-red-600/20 border-red-600/30";
      case "high": return "text-orange-500 bg-orange-500/20 border-orange-500/30";
      case "medium": return "text-yellow-500 bg-yellow-500/20 border-yellow-500/30";
      case "low": return "text-green-500 bg-green-500/20 border-green-500/30";
      default: return "text-slate-400 bg-slate-400/20 border-slate-400/30";
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "critical": return "🔴";
      case "high": return "🟠";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "⚪";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return "🔓";
      case "mitigated": return "✅";
      case "accepted": return "📝";
      case "transferred": return "↗️";
      default: return "❓";
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">🛡️ Risk Register</h1>
          <button
            onClick={fetchRegisteredRisks}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition flex items-center gap-2"
          >
            <span>↻</span>
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">🔍 Filter Risks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-2">Company Name</label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">All</option>
                {availableCompanies.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Risk Level</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="mitigated">Mitigated</option>
                <option value="accepted">Accepted</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Created Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h4 className="text-xs text-slate-400 mb-1">Total Risks</h4>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h4 className="text-xs text-slate-400 mb-1">Critical</h4>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h4 className="text-xs text-slate-400 mb-1">High</h4>
            <div className="text-2xl font-bold text-orange-500">{stats.high}</div>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h4 className="text-xs text-slate-400 mb-1">Medium</h4>
            <div className="text-2xl font-bold text-yellow-500">{stats.medium}</div>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h4 className="text-xs text-slate-400 mb-1">Low</h4>
            <div className="text-2xl font-bold text-green-500">{stats.low}</div>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h4 className="text-xs text-slate-400 mb-1">Open Risks</h4>
            <div className="text-2xl font-bold text-yellow-400">{stats.open}</div>
          </div>
        </div>

        {/* Risks List */}
        <div className="space-y-4">
          {allRisks.length === 0 ? (
            <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4 opacity-30">📋</div>
              <p className="text-white font-semibold mb-2">No risks found</p>
              <p className="text-slate-400">Try adjusting your filters or add new risks to the register</p>
            </div>
          ) : (
            allRisks.map((risk) => {
              const riskScore = risk.likelihood * risk.impact;
              const effectiveness = risk.mitigationEffectiveness || 0;
              const postLikelihood = Math.max(1, Math.round(risk.likelihood * (1 - effectiveness / 100)));
              const postImpact = Math.max(1, Math.round(risk.impact * (1 - effectiveness / 100)));
              const postScore = postLikelihood * postImpact;

              return (
                <div
                  key={risk._id}
                  className={`bg-slate-800 rounded-lg border-l-4 p-6 hover:transform hover:-translate-y-1 transition-all ${risk.level === "critical" ? "border-l-red-600" :
                      risk.level === "high" ? "border-l-orange-500" :
                        risk.level === "medium" ? "border-l-yellow-500" :
                          "border-l-green-500"
                    }`}
                >
                  {/* Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-3">{risk.description}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getLevelColor(risk.level)}`}>
                        {getLevelIcon(risk.level)} {risk.level.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-600/20 text-blue-400 border border-blue-600/30">
                        {getStatusIcon(risk.status)} {risk.status.charAt(0).toUpperCase() + risk.status.slice(1)}
                      </span>
                      {risk.company && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/20 text-purple-400 border border-purple-600/30">
                          🏢 {risk.company}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pink-600/20 text-pink-400 border border-pink-600/30">
                        📊 {risk.category}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600">
                        📅 {new Date(risk.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Details Sections */}
                  <div className="space-y-3 mb-4">
                    {risk.gap && (
                      <div className="bg-slate-900/50 rounded p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">⚠️</span>
                          <span className="text-xs font-semibold text-white uppercase tracking-wider">Gap Analysis</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{risk.gap}</p>
                      </div>
                    )}

                    {risk.threat && (
                      <div className="bg-slate-900/50 rounded p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🎯</span>
                          <span className="text-xs font-semibold text-white uppercase tracking-wider">Threat Assessment</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{risk.threat}</p>
                      </div>
                    )}

                    {(risk.mitigation || risk.mitigationStrategy) && (
                      <div className="bg-slate-900/50 rounded p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🔧</span>
                          <span className="text-xs font-semibold text-white uppercase tracking-wider">Mitigation Strategy</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {risk.mitigation || risk.mitigationStrategy}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">Pre-Mitigation</div>
                      <div className="text-2xl font-bold text-white">{riskScore}</div>
                      <div className="text-xs text-slate-500">L{risk.likelihood} × I{risk.impact}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">Post-Mitigation</div>
                      <div className="text-2xl font-bold text-green-500">{postScore}</div>
                      <div className="text-xs text-slate-500">L{postLikelihood} × I{postImpact}</div>
                    </div>
                    {risk.mitigationCost !== undefined && (
                      <div className="text-center">
                        <div className="text-xs text-slate-400 mb-1">Cost</div>
                        <div className="text-xl font-bold text-white">
                          ${(risk.mitigationCost / 1000).toFixed(0)}K
                        </div>
                      </div>
                    )}
                    {risk.mitigationEffectiveness !== undefined && (
                      <div className="text-center">
                        <div className="text-xs text-slate-400 mb-1">Effectiveness</div>
                        <div className="text-xl font-bold text-white">{risk.mitigationEffectiveness}%</div>
                      </div>
                    )}
                  </div>

                  {/* Owner */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700 text-sm text-slate-400">
                    <span>👤</span>
                    <span><strong className="text-white">Risk Owner:</strong> {risk.owner}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
