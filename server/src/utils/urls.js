function buildClientUrl(env, path) {
  const base = env.CLIENT_ORIGIN || 'http://localhost:5173';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

module.exports = { buildClientUrl };
