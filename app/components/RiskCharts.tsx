// components/RiskCharts.tsx
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

export interface RiskVisualizationData {
  level: string;
  count: number;
  color: string;
}

interface RiskChartsProps {
  data: RiskVisualizationData[];
  chartType: "pie" | "bar";
}

export const RiskCharts: React.FC<RiskChartsProps> = ({ data, chartType }) => {
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

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-lg font-bold text-white mb-6">
        Risk Assessment Overview
      </h3>
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
        <div className="w-full lg:w-1/2 h-80">
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
