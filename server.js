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
    });

    const $ = cheerio.load(response.data);
    const baseUrl = new URL(finalUrl).origin;

    // Rewrite links and assets
    $("a, link, script, img, form").each((i, el) => {
      const tag = el.tagName.toLowerCase();
      const attr = tag === "a" || tag === "link" ? "href" : (tag === "form" ? "action" : "src");
      let val = $(el).attr(attr);

      if (val && !val.startsWith("data:") && !val.startsWith("javascript:")) {
        try {
          const absoluteUrl = new URL(val, baseUrl).href;
          $(el).attr(attr, `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`);
        } catch (e) {}
      }
    });

    // Inject base tag
    $("head").prepend(`<base href="${baseUrl}">`);

    res.send($.html());
  } catch (error) {
    res.status(500).send(`Proxy Error: ${error.message}`);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RMD Proxy running on http://localhost:${PORT}`);
});
