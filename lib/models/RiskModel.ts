export interface Risk {
  riskId: string;
  riskName: string;
  category: string;
  status: "open" | "closed";
  type: "risk" | "issue";
  threat: "threat" | "opportunity";
  level: "low" | "medium" | "high" | "critical";
  preProbability: number;
  preImpact: number;
  preScore: number;
  costPre: number;
  postProbability: number;
  postImpact: number;
  postScore: number;
  costPost: number;
  score: number;
  description: string;
  company?: string;
  batchId?: string;
}