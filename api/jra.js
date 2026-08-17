export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GETのみ対応しています' });

  const target = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!target) return res.status(400).json({ ok: false, error: 'url が指定されていません' });

  let parsed;
  try { parsed = new URL(target); }
  catch { return res.status(400).json({ ok: false, error: 'URLが正しくありません' }); }

  if (parsed.protocol !== 'https:') {
    return res.status(403).json({ ok: false, error: 'HTTPSのJRA公式URLのみ取得できます' });
  }

  const allowedHosts = new Set(['www.jra.go.jp', 'jra.go.jp']);
  if (!allowedHosts.has(parsed.hostname)) {
    return res.status(403).json({ ok: false, error: 'JRA公式URLのみ取得できます' });
  }

  try {
    const response = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja-JP,ja;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `JRA取得失敗 HTTP ${response.status}`
      });
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || '';

    let charset = 'shift_jis';
    const cm = contentType.match(/charset\s*=\s*([^;\s]+)/i);
    if (cm) {
      charset = cm[1].replace(/["']/g, '').toLowerCase();
    }

    let html;
    try {
      html = new TextDecoder(charset).decode(bytes);
    } catch {
      try {
        html = new TextDecoder('shift_jis').decode(bytes);
      } catch {
        html = new TextDecoder('utf-8').decode(bytes);
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-KEIBA-Proxy', 'jra-v51');

    return res.status(200).send(html);

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'JRAページの取得に失敗しました',
      detail: String(error?.message || error)
    });
  }
}
