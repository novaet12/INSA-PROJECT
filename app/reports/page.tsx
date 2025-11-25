"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type ReportLevel = "strategic" | "tactical" | "operational" | "awareness";

interface Report {
  _id: string;
  level: ReportLevel;
  content: string;
  riskMatrix: {
    high: number;
    medium: number;
    low: number;
  };
  generatedAt: string;
}

interface Risk {
  _id: string;
  description: string;
  level: string;
  riskId: string;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeLevel, setActiveLevel] = useState<string>("critical");
  // const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [risksByLevel, setRisksByLevel] = useState<Record<string, Risk[]>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchReports();
      fetchRegisteredRisks();
    }
  }, [status, router, activeLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRegisteredRisks = useCallback(async () => {
    try {
      const res = await fetch("/api/risks/list");
      const data = await res.json();
      if (data.success) {
        const grouped: Record<string, Risk[]> = { critical: [], high: [], medium: [], low: [] };
        (data.risks || []).forEach((r: Risk) => {
          const lvl = r.level || "low";
          if (!grouped[lvl]) grouped[lvl] = [];
          grouped[lvl].push(r);
        });
        setRisksByLevel(grouped);
      }
    } catch (error) {
      console.error("Error fetching registered risks:", error);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      if (activeLevel === "awareness") {
        // Fetch awareness reports from a different endpoint
        const response = await fetch("/api/reports/awareness");
        const data = await response.json();
        if (data.success) {
          // Convert awareness report to report format for display
          setSelectedReport(data.report ? {
            _id: "awareness",
            level: "awareness" as ReportLevel,
            content: data.report.content,
            riskMatrix: data.report.riskMatrix || { high: 0, medium: 0, low: 0 },
            generatedAt: data.report.generatedAt || new Date().toISOString(),
          } : null);
          // setReports([]);
        }
      } else {
        const response = await fetch(`/api/reports/list?level=${activeLevel}`);
        const data = await response.json();
        if (data.success) {
          // setReports(data.reports || []);
          if (data.reports && data.reports.length > 0) {
            setSelectedReport(data.reports[0]);
          } else {
            setSelectedReport(null);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  }, [activeLevel]);

  const handleExport = async (format: "PDF" | "DOCX" | "PPTX") => {
    if (!selectedReport) return;

    try {
      const response = await fetch(
        `/api/reports/export?reportId=${selectedReport._id}&format=${format}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${selectedReport.level}-${selectedReport._id}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting report:", error);
      alert("Error exporting report");
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

  const reportLevels: { value: string; label: string }[] = [
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
    { value: "awareness", label: "Awareness Assessment" },
  ];

  const chartData = selectedReport
    ? [
      { name: "High", value: selectedReport.riskMatrix.high, color: "#ef4444" },
      { name: "Medium", value: selectedReport.riskMatrix.medium, color: "#eab308" },
      { name: "Low", value: selectedReport.riskMatrix.low, color: "#22c55e" },
    ]
    : [];

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Reports</h1>

        {/* Report Level Tabs */}
        <div className="flex space-x-4 border-b border-slate-700">
          {reportLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => setActiveLevel(level.value)}
              className={`px-6 py-3 font-medium transition ${activeLevel === level.value
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-slate-400 hover:text-slate-300"
                }`}
            >
              {level.label}
            </button>
          ))}
        </div>

        {selectedReport ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">
                    {activeLevel.charAt(0).toUpperCase() + activeLevel.slice(1)} Report
                  </h2>
                  <div className="flex space-x-2">
                    <button onClick={() => handleExport("PDF")} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition text-sm">Export PDF</button>
                    <button onClick={() => handleExport("DOCX")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition text-sm">Export DOCX</button>
                    <button onClick={() => handleExport("PPTX")} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition text-sm">Export PPTX</button>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none">
                  <div className="text-slate-300 whitespace-pre-wrap">{selectedReport.content}</div>
                </div>
              </div>
            </div>

            {/* Risk Matrix Visualization */}
            <div className="space-y-6">

              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-center py-8">No data available</div>
              )}

              {/* Registered risks by level (separate block) */}
              <div className="mt-6 bg-slate-800 rounded-lg border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Registered Risks by Level</h3>
                <div className="space-y-4">
                  {(["critical", "high", "medium", "low"] as const).map((lvl) => (
                    <div key={lvl}>
                      <div className="text-sm text-slate-300 font-medium mb-2">
                        {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                      </div>
                      <div className="space-y-1">
                        {(risksByLevel[lvl] || []).slice(0, 5).map((r: Risk) => (
                          <div key={r._id} className="flex justify-between items-center bg-slate-900 p-2 rounded">
                            <div className="text-sm text-white truncate">{r.description}</div>
                            <div className="text-xs text-slate-400 ml-2">{r.riskId}</div>
                          </div>
                        ))}
                        {(risksByLevel[lvl] || []).length === 0 && (
                          <div className="text-xs text-slate-400">No registered risks</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>


              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Risk Matrix
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">High Risks:</span>
                    <span className="text-red-400 font-bold">
                      {selectedReport.riskMatrix.high}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Medium Risks:</span>
                    <span className="text-yellow-400 font-bold">
                      {selectedReport.riskMatrix.medium}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Low Risks:</span>
                    <span className="text-green-400 font-bold">
                      {selectedReport.riskMatrix.low}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-400">
                    Generated:{" "}
                    {new Date(selectedReport.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
            <p className="text-slate-400 text-lg">
              No {activeLevel} reports available yet.
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Fetch questionnaires and wait for automatic analysis to generate
              reports.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

