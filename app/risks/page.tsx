"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

interface QuestionAnalysis {
  questionId: string;
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
  impactLabel?: string;
  impactDescription?: string;
}

interface ProcessedAssessment {
  _id: string;
  company: string;
  category: string;
  date: string;
  analyses: QuestionAnalysis[];
}

export default function RiskRegisterFromAssessmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<ProcessedAssessment[]>([]);

  const [companyFilter, setCompanyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState("");

  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchAssessments();
    }
  }, [status, router]);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/analysis/processed");
      const data = await res.json();

      const list: ProcessedAssessment[] = Array.isArray(data.assessments)
        ? data.assessments
        : [];

      setAssessments(list);

      const companies = Array.from(
        new Set(
          list
            .map((a) => a.company)
            .filter((c): c is string => !!c)
        )
      );
      setAvailableCompanies(companies);

      const categories = Array.from(
        new Set(
          list
            .map((a) => a.category)
            .filter((c): c is string => !!c)
        )
      );
      setAvailableCategories(categories);

      setLoading(false);
    } catch (error) {
      console.error("Error loading assessments", error);
      setAssessments([]);
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading assessments...</div>
        </div>
      </Layout>
    );
  }

  if (!session) return null;

  // Flatten assessments → rows with filters applied
  const rows: Array<QuestionAnalysis & { company: string; category: string; date: string }> =
    assessments
      .filter((a) => {
        const matchCompany =
          !companyFilter ||
          (a.company || "").toLowerCase() === companyFilter.toLowerCase();
        const matchCategory =
          !categoryFilter ||
          (a.category || "").toLowerCase() === categoryFilter.toLowerCase();
        return matchCompany && matchCategory;
      })
      .flatMap((a) =>
        (a.analyses || []).map((q) => ({
          ...q,
          company: a.company,
          category: a.category,
          date: a.date,
        }))
      )
      .filter((q) => {
        if (!riskLevelFilter) return true;
        return (
          (q.riskLevel || "").toLowerCase() ===
          riskLevelFilter.toLowerCase()
        );
      });

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Risk Register (from Assessments)</h1>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Company */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Company
              </label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                {availableCompanies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Risk level */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Risk level
              </label>
              <select
                value={riskLevelFilter}
                onChange={(e) => setRiskLevelFilter(e.target.value)}
                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm"
              >
                <option value="">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Plain table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">
              No records match the current filters.
            </p>
          ) : (
            <table className="min-w-full text-xs text-left border-collapse text-slate-100">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Level</th>
                  <th className="py-2 pr-3">Question</th>
                  <th className="py-2 pr-3">Answer</th>
                  <th className="py-2 pr-3">Likelihood</th>
                  <th className="py-2 pr-3">Impact</th>
                  <th className="py-2 pr-3">Risk Score</th>
                  <th className="py-2 pr-3">Risk Level</th>
                  <th className="py-2 pr-3">Gap</th>
                  <th className="py-2 pr-3">Threat</th>
                  <th className="py-2 pr-3">Mitigation</th>
                  <th className="py-2 pr-3">Impact Label</th>
                  <th className="py-2 pr-3">Impact Description</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={`${r.questionId}-${idx}`}
                    className="border-b border-slate-700 last:border-b-0"
                  >
                    <td className="py-2 pr-3">{r.company}</td>
                    <td className="py-2 pr-3">{r.category}</td>
                    <td className="py-2 pr-3">
                      {r.date ? new Date(r.date).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-2 pr-3">{r.level}</td>
                    <td className="py-2 pr-3">{r.question}</td>
                    <td className="py-2 pr-3">{r.answer}</td>
                    <td className="py-2 pr-3">{r.likelihood}</td>
                    <td className="py-2 pr-3">{r.impact}</td>
                    <td className="py-2 pr-3">{r.riskScore}</td>
                    <td className="py-2 pr-3">{r.riskLevel}</td>
                    <td className="py-2 pr-3">{r.gap}</td>
                    <td className="py-2 pr-3">{r.threat}</td>
                    <td className="py-2 pr-3">{r.mitigation}</td>
                    <td className="py-2 pr-3">{r.impactLabel}</td>
                    <td className="py-2 pr-3">{r.impactDescription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
