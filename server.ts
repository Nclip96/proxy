import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Proxy Endpoint
  app.all("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    const isVpn = req.query.vpn === 'true';
    const location = req.query.loc as string;

    if (!targetUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      let finalUrl = targetUrl;
      if (!finalUrl.startsWith("http")) {
        finalUrl = "https://" + finalUrl;
      }

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      };

      if (isVpn) {
        headers["X-Forwarded-For"] = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
        headers["X-VPN-Location"] = location || "Unknown";
        headers["X-Real-IP"] = headers["X-Forwarded-For"];
      }

      const axiosConfig: any = {
        method: req.method,
        url: finalUrl,
        headers,
        responseType: "arraybuffer",
        validateStatus: () => true,
        timeout: 15000,
      };

      if (req.method === 'POST') {
        axiosConfig.data = req.body;
      }

      const response = await axios(axiosConfig);

      const forbiddenHeaders = ['content-security-policy', 'x-frame-options', 'content-encoding', 'transfer-encoding', 'content-length'];
      Object.keys(response.headers).forEach(key => {
        if (!forbiddenHeaders.includes(key.toLowerCase())) {
          res.setHeader(key, response.headers[key]);
        }
      });

      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data:;");

      const contentType = response.headers['content-type'] || '';

      if (contentType.includes('text/html')) {
        const html = response.data.toString('utf8');
        const $ = cheerio.load(html);
        const baseUrl = new URL(finalUrl).origin;

        $("a, link, script, img, form, source, video, audio").each((i, el) => {
          const tag = el.tagName.toLowerCase();
          let attr = 'src';
          if (tag === 'a' || tag === 'link') attr = 'href';
          if (tag === 'form') attr = 'action';
          
          let val = $(el).attr(attr);

          if (val && !val.startsWith("data:") && !val.startsWith("javascript:") && !val.startsWith("#")) {
            try {
              const absoluteUrl = new URL(val, finalUrl).href;
              $(el).attr(attr, `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&vpn=${isVpn}&loc=${encodeURIComponent(location || '')}`);
            } catch (e) {}
          }
        });

        $("head").prepend(`
          <base href="${baseUrl}">
          <script>
            (function() {
              const _fetch = window.fetch;
              window.fetch = function(url, options) {
                if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('/api/proxy')) {
                  url = '/api/proxy?url=' + encodeURIComponent(new URL(url, window.location.href).href);
                }
                return _fetch(url, options);
              };

              const _open = XMLHttpRequest.prototype.open;
              XMLHttpRequest.prototype.open = function(method, url) {
                if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('/api/proxy')) {
                  url = '/api/proxy?url=' + encodeURIComponent(new URL(url, window.location.href).href);
                }
                return _open.apply(this, arguments);
              };
            })();
          </script>
        `);

        res.send($.html());
      } else if (contentType.includes('text/css')) {
        let css = response.data.toString('utf8');
        css = css.replace(/url\(['"]?([^'")]*)['"]?\)/g, (match, p1) => {
          if (p1.startsWith('data:') || p1.startsWith('http') || p1.startsWith('/api/proxy')) return match;
          try {
            const absoluteUrl = new URL(p1, finalUrl).href;
            return `url("/api/proxy?url=${encodeURIComponent(absoluteUrl)}")`;
          } catch (e) {
            return match;
          }
        });
        res.send(css);
      } else {
        res.send(response.data);
      }
    } catch (error: any) {
      console.error("Proxy Error:", error.message);
      res.status(500).send(`
        <div style="background:#111;color:#ff4444;padding:20px;font-family:sans-serif;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
          <h1 style="font-size:3rem;margin-bottom:10px;">Oops!</h1>
          <p style="font-size:1.2rem;opacity:0.8;">Proxy Error: ${error.message}</p>
          <p style="margin-top:20px;opacity:0.5;">The site might be blocking proxy requests or is currently down.</p>
          <button onclick="window.location.reload()" style="margin-top:30px;background:#3b82f6;color:white;border:none;padding:12px 24px;border-radius:10px;cursor:pointer;font-weight:bold;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">Try Again</button>
        </div>
      `);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
