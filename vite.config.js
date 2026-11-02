import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function localServerlessApiPlugin() {
  return {
    name: 'cetep-local-serverless-api',
    configureServer(server) {
      server.middlewares.use('/api/class-students', async (req, res) => {
        try {
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const rawBody = Buffer.concat(chunks).toString('utf8');
          req.body = rawBody ? JSON.parse(rawBody) : {};

          const resWrapper = {
            statusCode: 200,
            setHeader: (k, v) => res.setHeader(k, v),
            status(code) {
              this.statusCode = code;
              res.statusCode = code;
              return this;
            },
            json(payload) {
              res.statusCode = this.statusCode;
              if (!res.getHeader('Content-Type')) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
              }
              res.end(JSON.stringify(payload));
              return this;
            },
            end(body = '') {
              res.statusCode = this.statusCode;
              res.end(body);
              return this;
            },
          };

          const mod = await import('./api/class-students.js');
          await mod.default(req, resWrapper);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: err.message || 'Erro interno no servidor local.' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith('FIREBASE_ADMIN_') && !process.env[k]) {
      process.env[k] = v;
    }
  }
  return {
    plugins: [react(), localServerlessApiPlugin()],
  };
});
