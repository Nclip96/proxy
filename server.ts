import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Proxy Endpoint
  app.get("/api/proxy", async (req, res) => {
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

      // Simulate VPN headers
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      };

      if (isVpn) {
        // Add simulated location headers
        headers["X-Forwarded-For"] = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
        headers["X-VPN-Location"] = location || "Unknown";
        headers["X-Real-IP"] = headers["X-Forwarded-For"];
      }

      const response = await axios.get(finalUrl, {
        headers,
        responseType: "text",
        validateStatus: () => true,
      });

      const contentType = response.headers["content-type"];
      res.setHeader("Content-Type", contentType || "text/html");

      if (contentType && contentType.includes("text/html")) {
        const $ = cheerio.load(response.data);
        const baseUrl = new URL(finalUrl);

        // Rewrite links, scripts, and styles to be absolute or proxied
        // This is a basic implementation
        $("a, link, script, img, iframe, form").each((_, el) => {
          const attr = el.name === "a" || el.name === "link" ? "href" : 
                       el.name === "form" ? "action" : "src";
          const val = $(el).attr(attr);

          if (val) {
            try {
              const absoluteUrl = new URL(val, finalUrl).href;
              // For now, we just make them absolute so they load, 
              // but clicking links won't stay in proxy unless we route them back.
              // A better proxy would rewrite them to /api/proxy?url=...
              if (el.name === "a") {
                $(el).attr(attr, `/?url=${encodeURIComponent(absoluteUrl)}`);
              } else {
                $(el).attr(attr, absoluteUrl);
              }
            } catch (e) {
              // Ignore invalid URLs
            }
          }
        });

        // Inject a small script to handle internal navigation if possible
        // (Simplified for this basic version)

        res.send($.html());
      } else {
        res.send(response.data);
      }
    } catch (error: any) {
      res.status(500).send(`Proxy error: ${error.message}`);
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
