import { requireCurrentUserId } from "@/lib/auth/require-current-user";
import { getUserProfile, saveUserProfile } from "@/lib/data/profile";
import { validateUserProfile } from "@/lib/validation/profile";

export async function GET() {
  try {
    return Response.json(await getUserProfile(await requireCurrentUserId()));
  } catch {
    return Response.json({ error: "We could not open your profile." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const result = validateUserProfile(await request.json());
    if (!result.success) return Response.json({ error: result.error }, { status: 400 });
    const userId = await requireCurrentUserId();
    const profile = await saveUserProfile(userId, result.data);
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.auth.updateUser({ data: { display_name: profile.displayName, sex: profile.sex } });
    return Response.json(profile);
  } catch {
    return Response.json({ error: "We could not save your profile." }, { status: 500 });
  }
}
