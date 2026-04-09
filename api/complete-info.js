function mockAccount(uid, bg = '1') {
  const regions = ['VN', 'SG', 'TH', 'ID', 'BR', 'US'];
  const region = regions[Number(String(uid).slice(-1)) % regions.length] || 'VN';
  const level = 10 + (Number(String(uid).slice(-2)) % 70);
  const likes = 500 + (Number(String(uid).slice(-3)) % 9000);
  const exp = level * 15320;
  const rankingPoints = 1200 + (Number(String(uid).slice(-3)) % 6000);
  const csRankingPoints = Number(String(uid).slice(-2)) % 120;

  return {
    status: 'success',
    data: {
      basicInfo: {
        accountId: uid,
        nickname: `Player_${String(uid).slice(-6)}`,
        region,
        level,
        liked: likes,
        exp,
        rankingPoints,
        csRankingPoints,
        createAt: 1704067200,
        lastLoginAt: Math.floor(Date.now() / 1000) - 3600
      },
      socialInfo: {
        signature: 'Demo signature from safe local backend.'
      },
      clanBasicInfo: {
        clanName: 'Demo Guild',
        clanId: 'GUILD-' + String(uid).slice(-5),
        clanLevel: 4,
        memberNum: 37,
        capacity: 50
      },
      petInfo: {
        level: 5
      },
      creditScoreInfo: {
        creditScore: 100
      },
      captainBasicInfo: {
        nickname: 'GuildLeader',
        accountId: '9' + String(uid).slice(-8),
        level: 65,
        rankingPoints: 5200,
        csRankingPoints: 89
      }
    },
    outfit_image: generateSvgOutfitBase64(bg, uid)
  };
}

function generateSvgOutfitBase64(bg, uid) {
  const palette = {
    '1': ['#3b0a0a', '#ff4444', '#ffbf69'],
    '2': ['#082b12', '#28a745', '#97f9a9'],
    '3': ['#061b3a', '#007bff', '#7fdbff']
  };
  const [bg1, bg2, accent] = palette[bg] || palette['1'];

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="700" height="900" viewBox="0 0 700 900">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="700" height="900" fill="url(#g)"/>
    <circle cx="350" cy="190" r="85" fill="#f1c27d"/>
    <rect x="270" y="285" width="160" height="220" rx="26" fill="#121212"/>
    <rect x="225" y="315" width="50" height="180" rx="20" fill="#f1c27d"/>
    <rect x="425" y="315" width="50" height="180" rx="20" fill="#f1c27d"/>
    <rect x="285" y="505" width="45" height="220" rx="16" fill="#222"/>
    <rect x="370" y="505" width="45" height="220" rx="16" fill="#222"/>
    <rect x="255" y="310" width="190" height="50" rx="16" fill="${accent}" opacity="0.9"/>
    <text x="350" y="80" font-size="42" font-family="Arial" text-anchor="middle" fill="#fff">Demo Outfit</text>
    <text x="350" y="840" font-size="28" font-family="Arial" text-anchor="middle" fill="#fff">UID ${uid}</text>
  </svg>`;

  return Buffer.from(svg).toString('base64');
}

function calculateCSRank(stars) {
  stars = parseInt(stars || 0, 10);
  if (stars >= 87) return `Heroic – ${stars - 87 + 1}★`;
  if (stars >= 62) return `Diamond I – ${stars - 62 + 1}★`;
  if (stars >= 37) return `Platinum I – ${stars - 37 + 1}★`;
  if (stars >= 21) return `Gold I – ${stars - 21 + 1}★`;
  if (stars >= 9) return `Silver I – ${stars - 9 + 1}★`;
  return `Bronze I – ${stars + 1}★`;
}

function calculateBRRank(points) {
  points = parseInt(points || 0, 10);
  if (points >= 5500) return 'Elite Heroic';
  if (points >= 3500) return 'Heroic';
  if (points >= 2750) return 'Diamond';
  if (points >= 2000) return 'Platinum';
  if (points >= 1600) return 'Gold';
  if (points >= 1300) return 'Silver';
  if (points >= 1000) return 'Bronze';
  return 'Unranked';
}

function validUid(uid) {
  return /^\d{6,20}$/.test(String(uid || ''));
}

module.exports = (req, res) => {
  const { uid, bg = '1' } = req.query;

  if (!validUid(uid)) {
    return res.status(400).json({ status: 'error', message: 'UID must be 6-20 digits.' });
  }

  const payload = mockAccount(uid, bg);
  const basicInfo = payload.data.basicInfo;

  res.status(200).json({
    ...payload,
    derived: {
      brRank: calculateBRRank(basicInfo.rankingPoints),
      csRank: calculateCSRank(basicInfo.csRankingPoints)
    }
  });
};