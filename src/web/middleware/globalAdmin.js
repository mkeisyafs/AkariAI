const SNOWFLAKE_RE = /^[0-9]{15,20}$/;

function parseAdminIds() {
  return (process.env.GLOBAL_ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => SNOWFLAKE_RE.test(s));
}

export function requireGlobalAdmin(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const adminIds = parseAdminIds();
  if (!adminIds.includes(req.user.id)) {
    return res.status(403).json({ error: 'Global admin only' });
  }
  return next();
}

export default requireGlobalAdmin;
