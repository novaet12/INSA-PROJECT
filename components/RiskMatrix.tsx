"use client";

interface RiskMatrixProps {
  data: Array<{
    likelihood: number;
    impact: number;
    count: number;
  }>;
}

export default function RiskMatrix({ data }: RiskMatrixProps) {
  const matrix = Array(5)
    .fill(0)
    .map(() => Array(5).fill(0));

  // Populate matrix with data
  data.forEach((item) => {
    if (item.likelihood >= 1 && item.likelihood <= 5 && item.impact >= 1 && item.impact <= 5) {
      matrix[5 - item.impact][item.likelihood - 1] = item.count;
    }
  });

  const getColor = (likelihood: number, impact: number) => {
    const score = likelihood * impact;
    if (score >= 20) return "bg-red-900";
    if (score >= 15) return "bg-red-700";
    if (score >= 10) return "bg-orange-600";
    if (score >= 5) return "bg-yellow-600";
    return "bg-green-600";
  };

  const getTextColor = (likelihood: number, impact: number) => {
    const score = likelihood * impact;
    if (score >= 10) return "text-white";
    return "text-slate-900";
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-lg font-bold text-white mb-4">Risk Matrix (5×5)</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-xs text-slate-400"></th>
              {[1, 2, 3, 4, 5].map((likelihood) => (
                <th
                  key={likelihood}
                  className="p-2 text-xs text-slate-400 text-center"
                >
                  L{likelihood}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[5, 4, 3, 2, 1].map((impact, impactIdx) => (
              <tr key={impact}>
                <td className="p-2 text-xs text-slate-400 text-right pr-4">
                  I{impact}
                </td>
                {[1, 2, 3, 4, 5].map((likelihood, likelihoodIdx) => {
                  const count = matrix[impactIdx][likelihoodIdx];
                  const score = likelihood * impact;
                  return (
                    <td
                      key={likelihood}
                      className={`p-3 border border-slate-600 text-center ${getColor(
                        likelihood,
                        impact
                      )} ${getTextColor(likelihood, impact)} min-w-[60px]`}
                    >
                      <div className="font-bold">{score}</div>
                      {count > 0 && (
                        <div className="text-xs mt-1">({count})</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-900 mr-2"></div>
              <span>High (20-25)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-600 mr-2"></div>
              <span>Medium (10-19)</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-600 mr-2"></div>
              <span>Low (1-9)</span>
            </div>
          </div>
          <div>
            <span>L = Likelihood, I = Impact</span>
          </div>
        </div>
      </div>
    </div>
  );
}

