import { requireCurrentUserId } from "@/lib/auth/require-current-user";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireCurrentUserId();
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return Response.json({ error: "Address details are not configured yet." }, { status: 503 });

    const url = new URL(request.url);
    const placeId = (url.searchParams.get("placeId") || "").trim();
    const sessionToken = (url.searchParams.get("sessionToken") || "").trim();
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(placeId) || sessionToken.length < 10 || sessionToken.length > 128) {
      return Response.json({ error: "Choose a valid address suggestion." }, { status: 400 });
    }

    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "formattedAddress,location",
      },
      signal: AbortSignal.timeout(6000),
    });
    const body = await response.json();
    if (!response.ok || !body.formattedAddress) {
      console.error("Google Place details unavailable.", { status: response.status, error: body?.error?.status });
      return Response.json({ error: "That address could not be opened." }, { status: 502 });
    }
    return Response.json({
      address: body.formattedAddress as string,
      latitude: typeof body.location?.latitude === "number" ? body.location.latitude : null,
      longitude: typeof body.location?.longitude === "number" ? body.location.longitude : null,
    });
  } catch (error) {
    console.error("Place details unavailable.", error);
    return Response.json({ error: "That address could not be opened." }, { status: 503 });
  }
}
