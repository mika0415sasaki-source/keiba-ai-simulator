export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const target = req.query.url;

  if (!target) {
    return res.status(400).json({
      ok: false,
      error: "url が指定されていません"
    });
  }

  // JRA公式ページ以外への中継を禁止
  let parsed;
  try {
    parsed = new URL(target);
  } catch (e) {
    return res.status(400).json({
      ok: false,
      error: "URLが正しくありません"
    });
  }

  const allowedHosts = [
    "www.jra.go.jp",
    "jra.go.jp"
  ];

  if (!allowedHosts.includes(parsed.hostname)) {
    return res.status(403).json({
      ok: false,
      error: "JRA公式URLのみ取得できます"
    });
  }

  try {
    const response = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja-JP,ja;q=0.9"
      },
      redirect: "follow"
    });

    const html = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `JRA取得失敗 HTTP ${response.status}`
      });
    }

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    return res.status(200).send(html);

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "JRAページの取得に失敗しました",
      detail: String(error?.message || error)
    });
  }
}
