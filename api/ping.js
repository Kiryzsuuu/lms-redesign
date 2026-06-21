module.exports = (req, res) => {
  res.json({
    ok: true,
    env: {
      hasMongoUri: !!process.env.MONGO_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
      clientOrigin: process.env.CLIENT_ORIGIN,
    }
  });
};
