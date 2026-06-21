import http from 'node:http';
import serveHandler from 'serve-handler';

const port = Number(process.env.PORT) || 3000;

const server = http.createServer((req, res) => {
  return serveHandler(req, res, {
    public: 'dist',
    cleanUrls: false,
    // SPA fallback for react-router
    rewrites: [{ source: '**', destination: '/index.html' }],
  });
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Client listening on port ${port}`);
});
