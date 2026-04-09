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
    const bg = String(req.query?.bg || '1');

    if (!validUid(uid)) {
      return res.status(400).json({ status: 'error', message: 'UID must be 6-20 digits.' });
    }

    const json = await fetchJson(`${PROFILE_API}?uid=${encodeURIComponent(uid)}`);
    const src = normalizeProfilePayload(json);

    const basicInfo = {
      accountId: uid,
      nickname: pick(src, ['profileInfo.nickname', 'basicInfo.nickname', 'playerData.nickname', 'nickname'], 'Unknown'),
      region: pick(src, ['basicInfo.region', 'playerData.region', 'profileInfo.region', 'region'], 'Unknown'),
      level: Number(pick(src, ['profileInfo.level', 'basicInfo.level', 'playerData.level'], 0)) || 0,
      liked: Number(pick(src, ['basicInfo.liked', 'profileInfo.likes', 'socialInfo.likes'], 0)) || 0,
      exp: Number(pick(src, ['basicInfo.exp', 'profileInfo.exp', 'playerData.exp'], 0)) || 0,
      rankingPoints: Number(pick(src, ['basicInfo.rankingPoints', 'profileInfo.rankingPoints', 'profileInfo.rankPoints'], 0)) || 0,
      csRankingPoints: Number(pick(src, ['basicInfo.csRankingPoints', 'profileInfo.csRankingPoints', 'profileInfo.csRankPoints'], 0)) || 0,
      createAt: Number(pick(src, ['basicInfo.createAt', 'profileInfo.createAt', 'playerData.createAt'], 0)) || 0,
      lastLoginAt: Number(pick(src, ['basicInfo.lastLoginAt', 'profileInfo.lastLoginAt', 'playerData.lastLoginAt'], 0)) || 0
    };

    const socialInfo = {
      signature: pick(src, ['socialInfo.signature', 'profileInfo.signature', 'signature'], '')
    };

    const petInfo = {
      id: pick(src, ['petInfo.id', 'petInfo.petId'], null),
      level: Number(pick(src, ['petInfo.level', 'petInfo.petLevel'], 0)) || 0,
      name: pick(src, ['petInfo.name', 'petInfo.petName'], '')
    };

    const clanBasicInfo = {
      clanName: pick(src, ['clanBasicInfo.clanName', 'guildInfo.name', 'guildInfo.guildName'], ''),
      clanId: pick(src, ['clanBasicInfo.clanId', 'guildInfo.id', 'guildInfo.guildId'], ''),
      clanLevel: Number(pick(src, ['clanBasicInfo.clanLevel', 'guildInfo.level'], 0)) || 0,
      memberNum: Number(pick(src, ['clanBasicInfo.memberNum', 'guildInfo.memberNum'], 0)) || 0,
      capacity: Number(pick(src, ['clanBasicInfo.capacity', 'guildInfo.capacity'], 0)) || 0
    };

    const captainBasicInfo = {
      nickname: pick(src, ['captainBasicInfo.nickname', 'guildInfo.captainName'], ''),
      accountId: pick(src, ['captainBasicInfo.accountId', 'guildInfo.captainId'], ''),
      level: Number(pick(src, ['captainBasicInfo.level', 'guildInfo.captainLevel'], 0)) || 0,
      rankingPoints: Number(pick(src, ['captainBasicInfo.rankingPoints'], 0)) || 0,
      csRankingPoints: Number(pick(src, ['captainBasicInfo.csRankingPoints'], 0)) || 0
    };

    const creditScoreInfo = {
      creditScore: Number(pick(src, ['creditScoreInfo.creditScore', 'basicInfo.creditScore'], 100)) || 100
    };

    return res.status(200).json({
      status: 'success',
      region: basicInfo.region,
      data: {
        basicInfo,
        profileInfo: src.profileInfo || {},
        socialInfo,
        clanBasicInfo,
        captainBasicInfo,
        petInfo,
        creditScoreInfo,
        playerData: src.playerData || {}
      },
      outfit_image_url: `/api/outfit-image?uid=${encodeURIComponent(uid)}&bg=${encodeURIComponent(bg)}`
    });
  } catch (error) {
    console.error('complete-info.js fatal error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch account info.' });
  }
};
