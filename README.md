# RMD Proxy + VPN

A lightweight, browser-like web proxy and VPN simulator designed for speed and privacy.

## Features
- **VPN Simulator**: Toggle a secure connection with simulated global locations (USA, UK, Japan, etc.).
- **Proxy Engine**: High-performance web proxy with HTML rewriting.
- **Modern UI**: Clean, dark interface with real-time status updates.
- **SPCK Optimized**: Minimal dependencies and flat structure for mobile editing.

## How to Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the App URL provided by your hosting environment.

## SPCK Editor Tips
- **Node.js Required**: This project uses a backend (`server.ts`). Ensure your hosting environment (AI Studio, Replit, etc.) supports Node.js.
- **Lightweight**: The total project size is kept small for fast loading in mobile editors.
- **Customization**: You can easily add more VPN locations in `src/App.tsx`.
