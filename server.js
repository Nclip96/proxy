const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// Proxy Endpoint
app.get("/api/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  const isVpn = req.query.vpn === 'true';
  const location = req.query.loc;

  if (!targetUrl) {
    return res.status(400).send("URL is required");
  }

  try {
    let finalUrl = targetUrl;
    if (!finalUrl.startsWith("http")) {
      finalUrl = "https://" + finalUrl;
    }

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };

    if (isVpn) {
      headers["X-Forwarded-For"] = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
      headers["X-VPN-Location"] = location || "Unknown";
      headers["X-Real-IP"] = headers["X-Forwarded-For"];
    }

    const response = await axios.get(finalUrl, {
      headers,
      responseType: "text",
      validateStatus: () => true,
      timeout: 10000,
    });

    // Strip security headers that prevent iframing
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';");

    const $ = cheerio.load(response.data);
    const baseUrl = new URL(finalUrl).origin;

    // Rewrite links and assets to go through the proxy
    $("a, link, script, img, form").each((i, el) => {
      const tag = el.tagName.toLowerCase();
      const attr = (tag === "a" || tag === "link") ? "href" : (tag === "form" ? "action" : "src");
      let val = $(el).attr(attr);

      if (val && !val.startsWith("data:") && !val.startsWith("javascript:") && !val.startsWith("#")) {
        try {
          const absoluteUrl = new URL(val, finalUrl).href;
          $(el).attr(attr, `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&vpn=${isVpn}&loc=${encodeURIComponent(location || '')}`);
        } catch (e) {}
      }
    });

    // Inject base tag and a small script to handle dynamic loads
    $("head").prepend(`
      <base href="${baseUrl}">
      <script>
        // Simple interceptor for dynamic fetches (experimental)
        const _fetch = window.fetch;
        window.fetch = function(url, options) {
          if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('/api/proxy')) {
            url = '/api/proxy?url=' + encodeURIComponent(new URL(url, window.location.href).href);
          }
          return _fetch(url, options);
        };
      </script>
    `);

    res.send($.html());
  } catch (error) {
    console.error("Proxy Error:", error.message);
    res.status(500).send(`
      <div style="background:#111;color:#ff4444;padding:20px;font-family:sans-serif;height:100vh;">
        <h1>Proxy Error</h1>
        <p>${error.message}</p>
        <p>Make sure the URL is correct and the site allows proxying.</p>
        <button onclick="window.location.reload()" style="background:#444;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;">Retry</button>
      </div>
    `);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RMD Proxy running on http://localhost:${PORT}`);
});
