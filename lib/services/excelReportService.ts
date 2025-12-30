import ExcelJS from "exceljs";
import { RiskService } from "./riskService2";

interface RiskData {
  riskId?: string;
  riskName?: string;
  category?: string;
  type?: string;
  threat?: string;
  level?: string;
  status?: string;
  preProbability?: number;
  preImpact?: number;
  preScore?: number;
  costPre?: number;
  postProbability?: number;
  postImpact?: number;
  postScore?: number;
  costPost?: number;
  score?: number;
  description?: string;
  createdAt?: string;
}

export class ExcelReportService {
  static async generateBatchReport(batchId: string): Promise<Buffer> {
    const batch = await RiskService.getBatchById(batchId);
    if (!batch) throw new Error("Batch not found");

    const risks = await RiskService.getRisksByBatchId(batchId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Risk Data");

    // ================= HEADERS =================
    const headers = [
      "Risk ID",
      "Risk Name",
      "Risk Category",
      "Risk/Issue",
      "Threat/Opportunity",
      "Level",
      "open/close",
      "Probability (pre-mitigation)",
      "Impact (pre-mitigation)",
      "Score (pre-mitigation)",
      "Cost (pre-mitigation)",
      "Probability (post-mitigation)",
      "Impact (post-mitigation)",
      "Score (post-mitigation)",
      "Cost (mitigation)",
      "Score",
      "Description",
      "Created Date",
    ];

    sheet.addRow(headers);

    // 🎨 Style header row
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F4E78" }, // dark blue
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // ================= DATA ROWS =================
    risks.forEach(risk => {
      sheet.addRow([
        risk.riskId,
        risk.riskName,
        risk.category,
        risk.type,
        risk.threat,
        risk.level,
        risk.status,
        risk.preProbability,
        risk.preImpact,
        risk.preScore,
        risk.costPre,
        risk.postProbability,
        risk.postImpact,
        risk.postScore,
        risk.costPost,
        risk.score,
        risk.description,
        risk.createdAt
          ? new Date(risk.createdAt).toLocaleDateString()
          : "",
      ]);
    });

    // Freeze header row
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    // Auto width
    sheet.columns.forEach(col => {
      col.width = 18;
    });

    // File name includes batch info
    const fileName = `Risk_Report_${batch.batchId}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();

    return buffer;
  }
}
