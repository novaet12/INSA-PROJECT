import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Report from "@/models/Report";
import { Document, Packer, Paragraph, TextRun } from "docx";
import jsPDF from "jspdf";
import PptxGenJS from "pptxgenjs";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const reportId = searchParams.get("reportId");
    const format = searchParams.get("format") || "PDF";

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const report = await Report.findById(reportId);
    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // helper to normalize different buffer-like returns into ArrayBuffer
    function toArrayBuffer(input: any): ArrayBuffer { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!input) return new ArrayBuffer(0);
      // Node Buffer
      if (Buffer.isBuffer(input)) {
        return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
      }
      // Uint8Array
      if (input instanceof Uint8Array) {
        return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
      }
      // ArrayBuffer
      if (input instanceof ArrayBuffer) return input;
      // Blob (not expected server-side) -> try arrayBuffer()
      if (typeof input.arrayBuffer === "function") return input.arrayBuffer();
      // string -> encode
      if (typeof input === "string") {
        const enc = new TextEncoder();
        return enc.encode(input).buffer;
      }
      // Fallback
      return new ArrayBuffer(0);
    }

    if (format === "PDF") {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`${report.level.toUpperCase()} Risk Report`, 20, 20);
      doc.setFontSize(12);

      const content = report.content.split("\n");
      let yPos = 40;

      content.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line.substring(0, 100), 20, yPos); // Limit line length
        yPos += 7;
      });

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      const pdfArray = toArrayBuffer(pdfBuffer);

      return new NextResponse(pdfArray, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="report-${report.level}-${reportId}.pdf"`,
        },
      });
    } else if (format === "DOCX") {
      const content = report.content.split("\n");
      const paragraphs = content.map(
        (line: string) =>
          new Paragraph({
            children: [new TextRun(line)],
            spacing: { after: 200 },
          })
      );

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${report.level.toUpperCase()} Risk Report`,
                    bold: true,
                    size: 32,
                  }),
                ],
              }),
              ...paragraphs,
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      const docxArray = toArrayBuffer(buffer);

      return new NextResponse(docxArray, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="report-${report.level}-${reportId}.docx"`,
        },
      });
    } else if (format === "PPTX") {
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText(`${report.level.toUpperCase()} Risk Report`, {
        x: 1,
        y: 2,
        w: 8,
        h: 1,
        fontSize: 44,
        bold: true,
        color: "363636",
      });
      titleSlide.addText(`Generated: ${new Date(report.generatedAt).toLocaleDateString()}`, {
        x: 1,
        y: 3.5,
        w: 8,
        h: 0.5,
        fontSize: 18,
        color: "666666",
      });

      // Content slides
      const content = report.content.split("\n\n");
      content.forEach((section: string) => {
        if (section.trim()) {
          const slide = pptx.addSlide();
          slide.addText(section.substring(0, 100), {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 6,
            fontSize: 14,
            color: "363636",
          });
        }
      });

      // Risk matrix slide
      const matrixSlide = pptx.addSlide();
      matrixSlide.addText("Risk Matrix", {
        x: 1,
        y: 0.5,
        w: 8,
        h: 0.5,
        fontSize: 32,
        bold: true,
      });
      matrixSlide.addText(`High: ${report.riskMatrix.high} | Medium: ${report.riskMatrix.medium} | Low: ${report.riskMatrix.low}`, {
        x: 1,
        y: 1.5,
        w: 8,
        h: 0.5,
        fontSize: 18,
      });

      const buffer = await pptx.write({ outputType: "nodebuffer" });
      const pptxArray = toArrayBuffer(buffer);

      return new NextResponse(pptxArray, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="report-${report.level}-${reportId}.pptx"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported format" },
        { status: 400 }
      );
    }
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Error exporting report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export report" },
      { status: 500 }
    );
  }
}

