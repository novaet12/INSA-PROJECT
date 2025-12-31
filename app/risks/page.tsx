"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

interface RiskItem {
  _id: string;
  description: string;
  company: string;
  category: string;
  level: string; // low, medium, high, critical
  likelihood: number;
  impact: number;
  status: string; // open, mitigated, accepted, transferred
  owner: string;
  gap?: string;
  threat?: string;
  mitigation?: string;
  createdAt?: string;
}

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

export default function RiskRegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [message, setMessage] = useState<MessageState>(null);

  const [companyFilter, setCompanyFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchRisks();
    }
  }, [status, router]);

  const fetchRisks = async () => {
    try {
      const res = await fetch("/api/risks/list"); // adjust if your route differs
      const data = await res.json();
      const list: RiskItem[] = Array.isArray(data.risks) ? data.risks : [];
      setRisks(list);

      const companies = Array.from(
        new Set(
          list
            .map((r) => r.company)
            .filter((c): c is string => !!c)
        )
      );
      setAvailableCompanies(companies);
      setLoading(false);
    } catch (error) {
      console.error("Error loading risks", error);
      setRisks([]);
      setLoading(false);
      setMessage({
        type: "error",
        text: "Failed to load risk register",
      });
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return "bg-red-900/40 border-red-700 text-red-100";
      case "high":
        return "bg-orange-900/40 border-orange-700 text-orange-100";
      case "medium":
        return "bg-yellow-900/40 border-yellow-700 text-yellow-100";
      case "low":
        return "bg-green-900/40 border-green-700 text-green-100";
      default:
        return "bg-slate-800 border-slate-600 text-slate-100";
    }
  };

  const getRiskChipColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical":
        return "bg-red-700/80 text-red-50";
      case "high":
        return "bg-orange-700/80 text-orange-50";
      case "medium":
        return "bg-yellow-700/80 text-yellow-50";
      case "low":
        return "bg-green-700/80 text-green-50";
      default:
        return "bg-slate-700/80 text-slate-100";
    }
  };

  const getStatusChipColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-red-800/70 text-red-100";
      case "mitigated":
        return "bg-emerald-800/70 text-emerald-100";
      case "accepted":
        return "bg-blue-800/70 text-blue-100";
      case "transferred":
        return "bg-purple-800/70 text-purple-100";
      default:
        return "bg-slate-700/70 text-slate-100";
    }
  };

  const filteredRisks = risks.filter((r) => {
    if (!r) return false;
    const matchCompany =
      !companyFilter || r.company === companyFilter;
    const matchLevel =
      !levelFilter || r.level?.toLowerCase() === levelFilter.toLowerCase();
    const matchStatus =
      !statusFilter || r.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchCompany && matchLevel && matchStatus;
  });

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading risk register...</div>
        </div>
      </Layout>
    );
  }

  if (!session) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Risk Register</h1>

        {message && (
          <div
            className={`px-4 py-2 rounded ${
              message.type === "success"
                ? "bg-green-900/40 text-green-300 border border-green-700"
                : "bg-red-900/40 text-red-300 border border-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Filter Registered Risks
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Company
              </label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                {availableCompanies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Risk Level
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="mitigated">Mitigated</option>
                <option value="accepted">Accepted</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
          </div>
        </div>

        {/* Top summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-xs text-slate-400 mb-1">Total Risks</p>
            <p className="text-3xl font-bold text-white">
              {filteredRisks.length}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-xs text-slate-400 mb-1">Open</p>
            <p className="text-2xl font-bold text-red-300">
              {
                filteredRisks.filter(
                  (r) => r.status?.toLowerCase() === "open"
                ).length
              }
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-xs text-slate-400 mb-1">Mitigated</p>
            <p className="text-2xl font-bold text-emerald-300">
              {
                filteredRisks.filter(
                  (r) => r.status?.toLowerCase() === "mitigated"
                ).length
              }
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <p className="text-xs text-slate-400 mb-1">Critical / High</p>
            <p className="text-2xl font-bold text-orange-300">
              {
                filteredRisks.filter((r) =>
                  ["critical", "high"].includes(r.level?.toLowerCase())
                ).length
              }
            </p>
          </div>
        </div>

        {/* Creative cards grouped by level */}
        <div className="space-y-6">
          {["critical", "high", "medium", "low"].map((lvl) => {
            const group = filteredRisks.filter(
              (r) => r.level?.toLowerCase() === lvl
            );
            if (group.length === 0) return null;

            return (
              <div key={lvl} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white capitalize">
                    {lvl} risks
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskChipColor(
                      lvl
                    )}`}
                  >
                    {group.length} item(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.map((risk) => {
                    const score = (risk.likelihood || 0) * (risk.impact || 0);
                    const scorePercent = Math.min(
                      100,
                      Math.max(0, (score / 25) * 100)
                    );

                    return (
                      <div
                        key={risk._id}
                        className={`rounded-lg border p-4 ${getRiskLevelColor(
                          risk.level
                        )}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-xs text-slate-300/80 mb-1">
                              {risk.company}
                            </p>
                            <p className="text-sm font-semibold text-white">
                              {risk.category || "Assessment Risk"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`px-2 py-1 rounded-full text-[11px] font-semibold ${getStatusChipColor(
                                risk.status
                              )}`}
                            >
                              {risk.status?.toUpperCase() || "OPEN"}
                            </span>
                            <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-black/40 border border-white/10">
                              {(risk.level || "unknown").toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-200/80 mb-1">
                          Risk
                        </p>
                        <p className="text-sm text-slate-50 mb-3">
                          {risk.description}
                        </p>

                        {/* Mini metrics strip */}
                        <div className="grid grid-cols-3 gap-2 mb-3 text-[11px]">
                          <div className="bg-black/20 rounded-md px-2 py-1.5">
                            <p className="text-slate-300/80">Likelihood</p>
                            <p className="font-semibold text-white">
                              {risk.likelihood ?? 0}/5
                            </p>
                          </div>
                          <div className="bg-black/20 rounded-md px-2 py-1.5">
                            <p className="text-slate-300/80">Impact</p>
                            <p className="font-semibold text-white">
                              {risk.impact ?? 0}/5
                            </p>
                          </div>
                          <div className="bg-black/20 rounded-md px-2 py-1.5">
                            <p className="text-slate-300/80">Score</p>
                            <p className="font-semibold text-white">{score}</p>
                          </div>
                        </div>

                        {/* Score bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-slate-200/70 mb-1">
                            <span>Risk score</span>
                            <span>0 - 25</span>
                          </div>
                          <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                            <div
                              className="h-1.5 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500"
                              style={{ width: `${scorePercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Gap / threat / mitigation */}
                        <div className="space-y-2 text-xs">
                          {risk.gap && (
                            <div>
                              <p className="text-slate-200/80">Gap</p>
                              <p className="text-slate-50/90">
                                {risk.gap}
                              </p>
                            </div>
                          )}
                          {risk.threat && (
                            <div>
                              <p className="text-slate-200/80">Threat</p>
                              <p className="text-slate-50/90">
                                {risk.threat}
                              </p>
                            </div>
                          )}
                          {risk.mitigation && (
                            <div>
                              <p className="text-slate-200/80">
                                Mitigation
                              </p>
                              <p className="text-slate-50/90">
                                {risk.mitigation}
                              </p>
                            </div>
                          )}
                          {risk.owner && (
                            <div className="pt-1 flex justify-between items-center">
                              <p className="text-[11px] text-slate-300/80">
                                Owner
                              </p>
                              <p className="text-[11px] text-slate-50/90">
                                {risk.owner}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabular view (for detail / export style) */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 overflow-x-auto">
          <h3 className="text-lg font-bold text-white mb-3">
            Risk list (table view)
          </h3>
          {filteredRisks.length === 0 ? (
            <p className="text-sm text-slate-400">
              No risks match the current filters.
            </p>
          ) : (
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-700 text-slate-300">
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Level</th>
                  <th className="py-2 pr-4">Likelihood</th>
                  <th className="py-2 pr-4">Impact</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Owner</th>
                </tr>
              </thead>
              <tbody>
                {filteredRisks.map((r) => {
                  const score = (r.likelihood || 0) * (r.impact || 0);
                  return (
                    <tr
                      key={r._id}
                      className="border-b border-slate-800 hover:bg-slate-900/70"
                    >
                      <td className="py-2 pr-4 text-slate-100">
                        {r.company}
                      </td>
                      <td className="py-2 pr-4 text-slate-200 max-w-xs truncate">
                        {r.description}
                      </td>
                      <td className="py-2 pr-4 text-slate-200">
                        {(r.level || "").toUpperCase()}
                      </td>
                      <td className="py-2 pr-4 text-slate-200">
                        {r.likelihood ?? 0}
                      </td>
                      <td className="py-2 pr-4 text-slate-200">
                        {r.impact ?? 0}
                      </td>
                      <td className="py-2 pr-4 text-slate-200">
                        {score}
                      </td>
                      <td className="py-2 pr-4 text-slate-200">
                        {(r.status || "").toUpperCase()}
                      </td>
                      <td className="py-2 pr-4 text-slate-200">
                        {r.owner}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
