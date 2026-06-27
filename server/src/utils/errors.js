class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function notFound(req, res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  // Zod validation error: jangan bocorkan struktur internal (regex/pattern) ke client.
  const issues = err?.issues || err?.errors;
  if (err?.name === 'ZodError' && Array.isArray(issues)) {
    const fields = issues.map((i) => ({
      field: Array.isArray(i.path) ? i.path.join('.') : String(i.path ?? ''),
      message: i.message,
    }));
    return res.status(400).json({
      error: {
        status: 400,
        message: 'Data yang dimasukkan tidak valid',
        fields,
      },
    });
  }

  // HttpError punya .status eksplisit & pesan aman -> tampilkan apa adanya.
  // Error tak terduga (tanpa .status) -> jangan bocorkan detail internal.
  const isKnown = typeof err.status === 'number';
  const status = isKnown ? err.status : 500;
  const message = isKnown ? (err.message || 'Internal Server Error') : 'Terjadi kesalahan pada server';

  res.status(status).json({
    error: {
      status,
      message,
    },
  });
}

module.exports = { HttpError, notFound, errorHandler };
