function validUid(uid) {
  return /^\d{6,20}$/.test(String(uid || ''));
}

module.exports = (req, res) => {
  const { uid } = req.query;

  if (!validUid(uid)) {
    return res.status(400).json({ error: 'UID must be 6-20 digits.' });
  }

  const regions = ['VN', 'SG', 'TH', 'ID', 'BR', 'US'];
  const region = regions[Number(String(uid).slice(-1)) % regions.length] || 'VN';

  res.status(200).json({
    uid,
    nickname: `Player_${String(uid).slice(-6)}`,
    region
  });
};