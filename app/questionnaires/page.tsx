"use client";
import React, { useEffect, useState } from "react";
// import Link from "next/link"; (not used)
import Layout from "../components/Layout";

type Q = {
  _id: string;
  title?: string;
  company?: string;
  filledBy?: string;
  role?: string;
  date?: string;
  status?: string;
  responseCount?: number;
  category?: string;
  questions?: QuestionItem[];
};

type QuestionItem = {
  question?: string;
  answer?: string;
};
 

export default function QuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState<Q[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<Q | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/questionnaires/list");
      const data = await res.json();
      if (data.success && Array.isArray(data.questionnaires)) setQuestionnaires(data.questionnaires);
      else setQuestionnaires([]);
    } catch (err) {
      console.error("Failed to load questionnaires", err);
      setQuestionnaires([]);
    } finally {
      setLoading(false);
    }
  };

  // Build a unique list of questionnaire names (titles) for the dropdown
  const names = Array.from(new Set(questionnaires.map((q) => q.title || "(untitled)")));

  // Filter by selected name (dropdown) and by optional date range; then sort by date
  const filtered = questionnaires
    .filter((q) => (categoryFilter === "all" ? true : (q.title || "(untitled)") === categoryFilter))
    .filter((q) => {
      if (!dateFrom && !dateTo) return true;
      const t = q.date ? new Date(q.date).getTime() : 0;
      if (dateFrom) {
        const fromT = new Date(dateFrom).getTime();
        if (t < fromT) return false;
      }
      if (dateTo) {
        // include the end day by setting end to end-of-day
        const toT = new Date(dateTo).setHours(23, 59, 59, 999);
        if (t > toT) return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return sortOrder === "desc" ? tb - ta : ta - tb;
    });

  const triggerAnalysis = async (id: string) => {
    try {
      await fetch("/api/analysis/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionnaireId: id }),
      });
      // optional: show toast or refresh
      fetchList();
    } catch (err) {
      console.error("Failed to trigger analysis", err);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Top filter/navigation bar */}
        <div className="bg-slate-800 rounded border border-slate-700 p-3 mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Name</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-slate-900 text-white text-sm px-2 py-1 rounded border border-slate-700">
              <option value="all">All</option>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-slate-900 text-white text-sm px-2 py-1 rounded border border-slate-700" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-slate-900 text-white text-sm px-2 py-1 rounded border border-slate-700" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Sort</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")} className="bg-slate-900 text-white text-sm px-2 py-1 rounded border border-slate-700">
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="text-xs text-slate-400">Total: {questionnaires.length}</div>
            <button onClick={() => { setDateFrom(""); setDateTo(""); setCategoryFilter("all"); fetchList(); }} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">Reset</button>
            <button onClick={fetchList} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">Refresh</button>
          </div>
        </div>

        <main>
          {loading ? (
            <div className="text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-slate-400">No questionnaires found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((q) => (
                <div key={q._id} className="bg-slate-800 rounded p-4 border border-slate-700 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{q.company || "Unknown"}</div>
                    <div className="text-sm text-slate-300">{q.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{q.responseCount || 0} answers • {q.date ? new Date(q.date).toLocaleDateString() : ""}</div>
                    <div className="text-xs text-slate-400 mt-2">Category: {q.category || "(none)"}</div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button onClick={() => setViewing(q)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">View</button>
                    <button onClick={() => triggerAnalysis(q._id)} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm">Run Analysis</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {viewing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-white">{viewing.company}</h3>
                <p className="text-slate-400">{viewing.title}</p>
                <div className="text-sm text-slate-500 mt-1">{viewing.date ? new Date(viewing.date).toLocaleString() : ""}</div>
              </div>
              <button onClick={() => setViewing(null)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>

            <div className="space-y-3">
              {Array.isArray(viewing.questions) && viewing.questions.length > 0 ? (
                viewing.questions.map((qq: QuestionItem, idx: number) => (
                  <div key={idx} className="bg-slate-900 rounded p-3 border border-slate-700">
                    <div className="text-xs text-slate-400">Question</div>
                    <div className="text-white font-medium">{qq.question}</div>
                    <div className="text-xs text-slate-400 mt-2">Answer</div>
                    <div className="text-slate-300">{qq.answer}</div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic">No questions available.</div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={() => setViewing(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
