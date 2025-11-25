import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";
import RiskAnalysis from "@/models/RiskAnalysis";

// Helper to find answer by possible keys
interface ResponseItem {
    question: string;
    answer: string | number | boolean;
}

const findAnswer = (responses: ResponseItem[], keys: string[]) => {
    const response = responses.find((r) =>
        keys.some((k) => r.question.toLowerCase().includes(k.toLowerCase()))
    );
    return response ? response.answer : "Unknown";
};

export async function GET() {
    try {
        await dbConnect();

        // Fetch recent questionnaires (limit 10 for now)
        const questionnaires = await Questionnaire.find({})
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Fetch recent analyses (limit 10 for now)
        const analyses = await RiskAnalysis.find({})
            .sort({ createdAt: -1 })
            .populate("questionnaireId", "title")
            .limit(10)
            .lean();

        const notifications = [];

        // Process Questionnaires
        for (const q of questionnaires) {
            const company = findAnswer(q.responses, ["company", "organization"]);
            const person = findAnswer(q.responses, ["name", "full name", "respondent"]);
            const position = findAnswer(q.responses, ["position", "role", "job title"]);

            notifications.push({
                id: q._id.toString(),
                type: "questionnaire",
                title: "New Questionnaire Received",
                message: `From ${company} by ${person} (${position})`,
                date: q.createdAt,
                read: false, // In a real app, we'd track this
            });
        }

        // Process Analyses
        for (const a of analyses) {
            // @ts-ignore - populated field
            const qTitle = a.questionnaireId?.title || "Unknown Questionnaire";

            notifications.push({
                id: a._id.toString(),
                type: "analysis",
                title: "Risk Analysis Completed",
                message: `Analysis done for: ${qTitle}`,
                date: a.createdAt,
                read: false,
            });
        }

        // Sort combined notifications by date desc
        notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json(
            { error: "Failed to fetch notifications" },
            { status: 500 }
        );
    }
}
