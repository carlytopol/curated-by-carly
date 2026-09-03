import { AuthenticationRequiredError, requireCurrentUserId } from "@/lib/auth/require-current-user";
import {
  clearStyleSurvey,
  getStyleSurvey,
  saveStyleSurveyAnswer,
  setStyleLearning,
} from "@/lib/data/style-profile";

function errorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return Response.json({ error: "Please sign in again to continue." }, { status: 401 });
  console.error("Style Profile request failed.", error instanceof Error ? error.message : "Unknown error");
  return Response.json({ error: error instanceof Error ? error.message : "Your Style Notes are unavailable just now." }, { status: 500 });
}

export async function GET() {
  try {
    return Response.json(await getStyleSurvey(await requireCurrentUserId()), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.learningEnabled === "boolean") {
      await setStyleLearning(userId, body.learningEnabled);
      return Response.json(await getStyleSurvey(userId));
    }
    if (typeof body.questionId !== "string") return Response.json({ error: "Choose a Style Notes question to update." }, { status: 400 });
    return Response.json(await saveStyleSurveyAnswer(userId, body.questionId, body.value, body.skipped === true));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    const userId = await requireCurrentUserId();
    await clearStyleSurvey(userId);
    return Response.json(await getStyleSurvey(userId));
  } catch (error) {
    return errorResponse(error);
  }
}
