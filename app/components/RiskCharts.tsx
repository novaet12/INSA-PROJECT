"use client";

import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useRef } from "react";
import html2canvas from "html2canvas";

export interface RiskVisualizationData {
  level: string;
  count: number;
  color: string;
}

interface RiskChartsProps {
  data: RiskVisualizationData[];
  chartType: "pie" | "bar";
  companyName?: string;
  date?: string;
}

export const RiskCharts: React.FC<RiskChartsProps> = ({
  data,
  chartType,
  companyName = "All Companies",
  date = "",
}) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-lg p-12 text-center">
        <p className="text-white font-semibold mb-2">No risk data available</p>
        <p className="text-slate-400">
          Adjust filters or process more assessments to see data here.
        </p>
      </div>
    );
  }

  const totalRisks = data.reduce((sum, item) => sum + item.count, 0);

  const handleDownload = async () => {
    if (!chartContainerRef.current) return;

    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: "#020617",
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;

      // Generate file name with company and date
      const dateStr = date
        ? new Date(date).toISOString().split("T")[0]
        : "no-date";
      const companySanitized = (companyName || "all")
        .replace(/\s+/g, "-")
        .toLowerCase();
      const fileName =
        chartType === "pie"
          ? `RiskChart_Pie_${companySanitized}_${dateStr}.png`
          : `RiskChart_Bar_${companySanitized}_${dateStr}.png`;

      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error exporting chart:", err);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">
          Risk Assessment Overview
        </h3>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 text-xs rounded-md bg-slate-700 text-slate-100 hover:bg-slate-600 transition"
        >
          Download chart (PNG)
        </button>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Chart container with metadata caption - this gets exported */}
        <div
          ref={chartContainerRef}
          className="w-full lg:w-1/2 bg-slate-900 rounded-md p-4"
        >
          {/* Metadata section visible in exported image */}
          <div className="mb-4 pb-3 border-b border-slate-600">
            <p className="text-sm text-slate-200">
              <span className="font-semibold">Company:</span> {companyName}
            </p>
            {date && (
              <p className="text-sm text-slate-200 mt-1">
                <span className="font-semibold">Date:</span>{" "}
                {new Date(date).toLocaleDateString()}
              </p>
            )}
            <p className="text-sm text-slate-200 mt-1">
              <span className="font-semibold">Total Risks:</span> {totalRisks}
            </p>
          </div>

          {/* Chart area */}
          <div className="h-80">
            {chartType === "pie" ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="level"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="level" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" name="Risk Count" fill="#3b82f6">
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Stats sidebar (not exported) */}
        <div className="w-full lg:w-1/2 space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-sm text-slate-400 mb-1">Total Risks</p>
            <p className="text-4xl font-bold text-white">{totalRisks}</p>
          </div>

          {data.map((item) => (
            <div
              key={item.level}
              className="bg-slate-900/50 rounded-lg p-4 border-l-4"
              style={{ borderLeftColor: item.color }}
            >
              <div className="flex justify-between items-center">
                <p className="text-white font-medium">{item.level}</p>
                <p className="text-2xl font-bold text-white">{item.count}</p>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {((item.count / totalRisks) * 100).toFixed(1)}% of total
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
