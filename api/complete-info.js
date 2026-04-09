const ACCINFO_API = 'https://danger-player-info.vercel.app/accinfo';
const API_KEY = process.env.DANGER_API_KEY || 'DANGERxINFO';

function validUid(uid) {
  return /^\d{6,20}$/.test(String(uid || '').trim());
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

async function fetchText(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0'
    }
  });

  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    text
  };
}

function normalizeToExpectedShape(uid, raw) {
  if (raw?.status === 'success' && raw?.data) {
    return {
      status: 'success',
      region: raw.region || raw?.data?.basicInfo?.region || null,
      data: raw.data,
      outfit_image:
        raw.outfit_image ||
        raw.outfitImage ||
        raw?.data?.outfit_image ||
        raw?.data?.outfitImage ||
        null
    };
  }

  if (raw?.basicInfo || raw?.profileInfo || raw?.socialInfo) {
    return {
      status: 'success',
      region: raw?.basicInfo?.region || null,
      data: raw,
      outfit_image: raw.outfit_image || raw.outfitImage || null
    };
  }

  if (raw?.data && (raw.data.basicInfo || raw.data.profileInfo || raw.data.socialInfo)) {
    return {
      status: 'success',
      region: raw?.data?.basicInfo?.region || null,
      data: raw.data,
      outfit_image:
        raw.outfit_image ||
        raw.outfitImage ||
        raw?.data?.outfit_image ||
        raw?.data?.outfitImage ||
        null
    };
  }

  return {
    status: 'success',
    region: raw?.region || null,
    data: {
      basicInfo: {
        accountId: String(raw?.uid || raw?.accountId || uid),
        nickname: pick(raw, ['nickname', 'playerName', 'name'], 'Unknown'),
        region: pick(raw, ['region', 'serverRegion'], 'Unknown'),
        level: Number(pick(raw, ['level', 'lvl'], 0)) || 0,
        liked: Number(pick(raw, ['liked', 'likes'], 0)) || 0,
        exp: Number(pick(raw, ['exp'], 0)) || 0,
        rankingPoints: Number(pick(raw, ['rankingPoints', 'rankPoints'], 0)) || 0,
        csRankingPoints: Number(pick(raw, ['csRankingPoints', 'csRankPoints'], 0)) || 0,
        createAt: Number(pick(raw, ['createAt'], 0)) || 0,
        lastLoginAt: Number(pick(raw, ['lastLoginAt'], 0)) || 0
      },
      profileInfo: raw?.profileInfo || {},
      socialInfo: {
        signature: pick(raw, ['signature', 'bio', 'socialInfo.signature'], '')
      },
      clanBasicInfo: raw?.clanBasicInfo || {},
      captainBasicInfo: raw?.captainBasicInfo || {},
      petInfo: raw?.petInfo || {},
      creditScoreInfo: raw?.creditScoreInfo || { creditScore: 100 }
    },
    outfit_image:
      raw?.outfit_image ||
      raw?.outfitImage ||
      raw?.image ||
      raw?.imageBase64 ||
      null
  };
}

module.exports = async function handler(req, res) {
  try {
    const uid = String(req.query?.uid || '').trim();

    if (!validUid(uid)) {
      return res.status(400).json({
        status: 'error',
        message: 'UID must be 6-20 digits.'
      });
    }

    const url = `${ACCINFO_API}?uid=${encodeURIComponent(uid)}&key=${encodeURIComponent(API_KEY)}`;
    const upstream = await fetchText(url);

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({
        status: 'error',
        message: `Upstream HTTP ${upstream.status}`,
        raw: upstream.text.slice(0, 500)
      });
    }

    let raw;
    try {
      raw = JSON.parse(upstream.text);
    } catch {
      return res.status(502).json({
        status: 'error',
        message: 'Upstream did not return JSON.',
        raw: upstream.text.slice(0, 500)
      });
    }

    return res.status(200).json(normalizeToExpectedShape(uid, raw));
  } catch (error) {
    console.error('complete-info.js fatal error:', error);

    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch account info.'
    });
  }
};
