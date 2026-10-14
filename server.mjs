import { createServer } from 'node:http';
import releasesHandler from './api/releases.js';
import rumorsHandler from './api/rumors.js';

const handlers = {
  '/api/releases': releasesHandler,
  '/api/rumors': rumorsHandler,
};

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://localhost:3001').pathname;
  const handler = handlers[pathname];

  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
    return;
  }

  const response = {
    statusCode: 200,
    setHeader(name, value) { res.setHeader(name, value); },
    status(code) { this.statusCode = code; return this; },
    json(data) {
      if (res.writableEnded) return data;
      res.statusCode = this.statusCode;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(data));
      return data;
    },
  };

  try {
    await handler(req, response);
  } catch (error) {
    console.error(`Error en ${pathname}:`, error.message);
    if (!res.writableEnded) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Error interno del servidor local' }));
    }
  }
});

server.listen(3001, '127.0.0.1', () => {
  console.log('API local disponible en http://localhost:3001/api/releases y /api/rumors');
});
