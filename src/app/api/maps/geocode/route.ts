import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ADDRESS_LENGTH = 300;

// The Geocoding web service rejects keys restricted by HTTP referrer, so the
// lookup runs on the server. Prefer a server-only key (restrict it by IP) and
// fall back to the public Maps key for existing deployments.
const getGoogleMapsApiKey = () =>
  process.env.GOOGLE_MAPS_API_KEY?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
  "";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/json",
    },
  });

export async function GET(request: NextRequest) {
  // Only signed-in dashboard users geocode addresses; keep the paid API from
  // becoming an open proxy.
  if (!request.cookies.get("kyra_access_token")?.value) {
    return jsonResponse({ status: "UNAUTHORIZED" }, 401);
  }

  const address = request.nextUrl.searchParams.get("address")?.trim() || "";
  if (!address || address.length > MAX_ADDRESS_LENGTH) {
    return jsonResponse({ status: "INVALID_REQUEST" }, 400);
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return jsonResponse(
      {
        status: "REQUEST_DENIED",
        error_message: "Google Maps API key belum dikonfigurasi di server.",
      },
      503
    );
  }

  const params = new URLSearchParams({
    address,
    key: apiKey,
    language: "id",
    region: "id",
    components: "country:ID",
  });

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      { cache: "no-store" }
    );
  } catch {
    return jsonResponse({ status: "UNKNOWN_ERROR" }, 502);
  }

  if (!upstream.ok) {
    return jsonResponse({ status: "UNKNOWN_ERROR" }, 502);
  }

  const payload = (await upstream.json()) as {
    status?: unknown;
    error_message?: unknown;
    results?: unknown;
  };

  return jsonResponse({
    status: payload.status,
    error_message: payload.error_message,
    results: Array.isArray(payload.results) ? payload.results : [],
  });
}
