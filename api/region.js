const PROFILE_API = process.env.FF_PROFILE_API || 'http://raw.sukhdaku.qzz.io/player/info';

function validUid(uid) {
  return /^\d{6,20}$/.test(String(uid || ''));
}

function get(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function pick(obj, paths, fallback = null) {
  for (const path of paths) {
    const value = get(obj, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function normalizeProfilePayload(json) {
  if (!json || typeof json !== 'object') return {};
  if (json.data && typeof json.data === 'object') return json.data;
  return json;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0'
    }
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Profile upstream HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Profile upstream did not return JSON.');
  }
}

module.exports = async function handler(req, res) {
  try {
    const uid = String(req.query?.uid || '').trim();

    if (!validUid(uid)) {
      return res.status(400).json({ error: 'UID must be 6-20 digits.' });
    }

    const json = await fetchJson(`${PROFILE_API}?uid=${encodeURIComponent(uid)}`);
    const src = normalizeProfilePayload(json);

    return res.status(200).json({
      uid,
      nickname: pick(src, ['profileInfo.nickname', 'basicInfo.nickname', 'playerData.nickname', 'nickname'], 'Unknown'),
      region: pick(src, ['basicInfo.region', 'playerData.region', 'profileInfo.region', 'region'], 'Unknown'),
      server: pick(src, ['playerData.server', 'basicInfo.server', 'server', 'join'], 'Unknown')
    });
  } catch (error) {
    console.error('region.js fatal error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch region info.' });
  }
};
