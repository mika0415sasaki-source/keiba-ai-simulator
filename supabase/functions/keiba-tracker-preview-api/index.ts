import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });

// This endpoint is intentionally isolated from the production tracker app_id.
const APP_ID = "keiba-independent-preview-jockey-capture-v1";
const clean = (value: unknown) => String(value ?? "").trim();

function raceIdFromUrl(value: unknown) {
  let input = clean(value);
  for (let i = 0; i < 3; i++) {
    try { input = decodeURIComponent(input); } catch { break; }
  }
  const match = input.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i) || input.match(/\b(20\d{10})\b/);
  return match?.[1] ?? "";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await request.json();
    if (body?.action !== "save_prediction") return json({ error: "unsupported action" }, 400);

    const raceUrl = clean(body.race_url);
    const raceId = clean(body.race_id || raceIdFromUrl(raceUrl));
    if (!/^20\d{10}$/.test(raceId)) return json({ error: "race_idを確認できません" }, 400);

    const ranking = Array.isArray(body.ranking) ? body.ranking.slice(0, 30) : [];
    if (!ranking.length) return json({ error: "rankingが空です" }, 400);
    const serialized = JSON.stringify(ranking);
    if (serialized.length > 1_500_000) return json({ error: "保存データが上限を超えています" }, 413);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const row = {
      app_id: APP_ID,
      race_id: raceId,
      race_date: body.race_date || null,
      course: body.course || null,
      race_no: body.race_no || null,
      surface: body.surface || null,
      distance: body.distance || null,
      mode: body.mode || "AI分析",
      ticket_count: Number(body.ticket_count) || 0,
      tickets: Array.isArray(body.tickets) ? body.tickets : [],
      ranking,
      odds: {
        ...(body.odds && typeof body.odds === "object" ? body.odds : {}),
        capture_version: "jockey-history-field-size-v1",
        race_field_size: Number.isInteger(Number(ranking[0]?.current_field_size))
          ? Number(ranking[0].current_field_size)
          : null,
        race_field_size_source: "imported_entry_roster",
        jockey_capture_status: clean(body.jockey_capture_status) || "unknown"
      },
      snapshot_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("keiba_prediction_snapshots")
      .upsert(row, { onConflict: "app_id,race_id" })
      .select("id,app_id,race_id,snapshot_at")
      .single();

    if (error) throw error;
    return json({ saved: true, isolated: true, app_id: APP_ID, row: data });
  } catch (error) {
    return json({ error: String((error as Error)?.message || error) }, 500);
  }
});
