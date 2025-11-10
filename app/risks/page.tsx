"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";

type QuestionnaireResponse = {
  question: string;
  answer: string | number | boolean;
  category?: string;
};

type Questionnaire = {
  _id: string;
  externalId?: string;
  title: string;
  responses: QuestionnaireResponse[];
  fetchedAt?: string;
  status?: string;
};

export default function RisksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selected, setSelected] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchQuestionnaires();
    }
  }, [status, router]);

  const fetchQuestionnaires = async () => {
    try {
      const res = await fetch("/api/questionnaires/list");
      const data = await res.json();
      if (data.success) {
        setQuestionnaires(data.questionnaires || []);
        if (data.questionnaires && data.questionnaires.length > 0) {
          setSelected(data.questionnaires[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching questionnaires:", error);
    } finally {
      setLoading(false);
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

  const extractMeta = (q: Questionnaire) => {
    // Try to find company/position in responses
    const flattened = q.responses || [];
    const companyResp = flattened.find((r) =>
      /(company|organization|org|employer)/i.test(r.question || "")
    );
    const positionResp = flattened.find((r) => /(position|role|title)/i.test(r.question || ""));
    const filledBy = flattened.find((r) => /(name|fullname|filled by|submitted by)/i.test(r.question || ""));

    return {
      company: companyResp ? String(companyResp.answer) : "",
      position: positionResp ? String(positionResp.answer) : "",
      person: filledBy ? String(filledBy.answer) : "",
    };
  };

  const handleCreateRisk = async (payload: any) => {
    try {
      const res = await fetch("/api/risks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alert("Risk created successfully");
      } else {
        alert("Failed to create risk: " + (data.error || ""));
      }
    } catch (error) {
      console.error("Error creating risk:", error);
      alert("Error creating risk");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Questionnaire Register</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchQuestionnaires()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-lg font-bold text-white mb-4">Questionnaires</h2>
            <div className="space-y-2 max-h-[70vh] overflow-auto">
              {questionnaires.length === 0 ? (
                <div className="text-slate-400">No questionnaires found.</div>
              ) : (
                questionnaires.map((q) => (
                  <button
                    key={q._id}
                    onClick={() => setSelected(q)}
                    className={`w-full text-left p-3 rounded-md transition ${selected?._id === q._id ? "bg-slate-700" : "hover:bg-slate-700/50"}`}
                  >
                    <div className="text-sm font-medium text-white">{q.title}</div>
                    <div className="text-xs text-slate-400">{q.externalId || q._id}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {selected ? (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selected.title}</h2>
                    <div className="text-sm text-slate-400">Fetched: {new Date(selected.fetchedAt || Date.now()).toLocaleString()}</div>
                    <div className="text-sm text-slate-400">ID: {selected.externalId || selected._id}</div>
                  </div>
                  <div className="text-sm text-slate-300 text-right">
                    {(() => {
                      const meta = extractMeta(selected);
                      return (
                        <div>
                          <div><strong>Company:</strong> {meta.company || "-"}</div>
                          <div><strong>Position:</strong> {meta.position || "-"}</div>
                          <div><strong>Person:</strong> {meta.person || "-"}</div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-6">
                  {(selected.responses || []).map((resp, idx) => (
                    <QuestionItem
                      key={idx}
                      question={resp.question || String(idx + 1)}
                      answer={String(resp.answer ?? "")}
                      company={extractMeta(selected).company}
                      person={extractMeta(selected).person}
                      onCreateRisk={handleCreateRisk}
                      defaultOwner={(session?.user as any)?.email || ""}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="text-slate-400">Select a questionnaire to view questions and create risks.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function QuestionItem({ question, answer, company, person, onCreateRisk, defaultOwner }: any) {
  const [riskName, setRiskName] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("open");
  const [type, setType] = useState("risk");
  const [nature, setNature] = useState("threat");
  const [level, setLevel] = useState("operational");

  const [preProb, setPreProb] = useState<number>(3);
  const [preImpact, setPreImpact] = useState<number>(3);
  const preScore = preProb * preImpact;

  const [mitigationCost, setMitigationCost] = useState<number>(0);
  const [mitigationEffectiveness, setMitigationEffectiveness] = useState<number>(0); // percent 0-100

  // Compute post values by reducing prob/impact by effectiveness
  const calcPost = (val: number) => {
    const reduced = val * (1 - mitigationEffectiveness / 100);
    // Map back to 1-5 integer scale
    const clamped = Math.max(1, Math.min(5, Math.round(reduced)));
    return clamped;
  };

  const postProb = calcPost(preProb);
  const postImpact = calcPost(preImpact);
  const postScore = postProb * postImpact;

  // Percentage equivalents for display (map 1-5 -> 20%-100%)
  const preProbPercent = Math.round((preProb / 5) * 100);
  const preImpactPercent = Math.round((preImpact / 5) * 100);
  const postProbPercent = Math.round((postProb / 5) * 100);
  const postImpactPercent = Math.round((postImpact / 5) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      description: `${question} — Answer: ${answer}\nCompany: ${company || ""}\nPerson: ${person || ""}`,
      category: category || "Uncategorized",
      level: level || "low",
      likelihood: preProb,
      impact: preImpact,
      status: status,
      mitigationStrategy: `Mitigation cost: ${mitigationCost}, effectiveness: ${mitigationEffectiveness}%`,
      owner: defaultOwner || "",
    };

    await onCreateRisk(payload);
  };

  return (
    <div className="bg-slate-900 rounded-md border border-slate-700 p-4">
      <div className="mb-2">
        <div className="text-sm text-slate-300 font-medium">Question</div>
        <div className="text-white">{question}</div>
      </div>
      <div className="mb-4">
        <div className="text-sm text-slate-300 font-medium">Answer</div>
        <div className="text-slate-200 whitespace-pre-wrap">{answer}</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400">Risk Name</label>
            <input value={riskName} onChange={(e) => setRiskName(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-400">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-400">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white">
              <option value="open">Open</option>
              <option value="mitigated">Mitigated</option>
              <option value="accepted">Accepted</option>
              <option value="transferred">Transferred</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white">
              <option value="risk">Risk</option>
              <option value="issue">Issue</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Threat / Opportunity</label>
            <select value={nature} onChange={(e) => setNature(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white">
              <option value="threat">Threat</option>
              <option value="opportunity">Opportunity</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-slate-400">Prob. (pre) 1-5</label>
            <input type="number" min={1} max={5} value={preProb} onChange={(e) => setPreProb(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" />
            <div className="text-xs text-slate-400 mt-1">{preProbPercent}%</div>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Impact (pre) 1-5</label>
            <input type="number" min={1} max={5} value={preImpact} onChange={(e) => setPreImpact(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" />
            <div className="text-xs text-slate-400 mt-1">{preImpactPercent}%</div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">Score (pre)</label>
            <div className="px-3 py-2 rounded bg-slate-900 text-white">{preScore}</div>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Mitigation Cost</label>
            <input type="number" min={0} value={mitigationCost} onChange={(e) => setMitigationCost(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" />
          </div>
          <div>
            <label className="block text-xs text-slate-400">Mitigation Eff. %</label>
            <input type="number" min={0} max={100} value={mitigationEffectiveness} onChange={(e) => setMitigationEffectiveness(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400">Prob. (post)</label>
            <div className="px-3 py-2 rounded bg-slate-900 text-white">{postProb} ({postProbPercent}%)</div>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Impact (post)</label>
            <div className="px-3 py-2 rounded bg-slate-900 text-white">{postImpact} ({postImpactPercent}%)</div>
          </div>
          <div>
            <label className="block text-xs text-slate-400">Score (post)</label>
            <div className="px-3 py-2 rounded bg-slate-900 text-white">{postScore}</div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400">Description / Notes</label>
          <textarea className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white" rows={3} />
        </div>

        <div className="flex space-x-2">
          <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md">Create Risk</button>
        </div>
      </form>
    </div>
  );
}

