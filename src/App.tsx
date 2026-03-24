import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowLeft, ArrowRight, RotateCw, Shield, Globe, Settings, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [url, setUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isVpnConnected, setIsVpnConnected] = useState(false);
  const [vpnLocation, setVpnLocation] = useState('USA - New York');
  const [virtualIp, setVirtualIp] = useState('192.168.1.1');
  const [showVpnPanel, setShowVpnPanel] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const locations = [
    'USA - New York',
    'UK - London',
    'Japan - Tokyo',
    'Germany - Frankfurt',
    'Singapore - Central'
  ];

  // Handle initial URL from query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialUrl = params.get('url');
    if (initialUrl) {
      navigate(initialUrl);
    }
  }, []);

  const generateIp = () => {
    return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
  };

  const toggleVpn = () => {
    if (!isVpnConnected) {
      setIsLoading(true);
      setTimeout(() => {
        setIsVpnConnected(true);
        setVirtualIp(generateIp());
        setIsLoading(false);
      }, 1500);
    } else {
      setIsVpnConnected(false);
    }
  };

  const navigate = (targetUrl: string) => {
    let formattedUrl = targetUrl.trim();
    if (!formattedUrl) return;

    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      if (formattedUrl.includes('.') && !formattedUrl.includes(' ')) {
        formattedUrl = 'https://' + formattedUrl;
      } else {
        formattedUrl = `https://www.google.com/search?q=${encodeURIComponent(formattedUrl)}`;
      }
    }

    const proxyUrl = `/api/proxy?url=${encodeURIComponent(formattedUrl)}&vpn=${isVpnConnected}&loc=${encodeURIComponent(vpnLocation)}`;
    setUrl(proxyUrl);
    setInputUrl(formattedUrl);
    setIsLoading(true);

    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(formattedUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(inputUrl);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const prevUrl = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(prevUrl)}`;
      setUrl(proxyUrl);
      setInputUrl(prevUrl);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const nextUrl = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(nextUrl)}`;
      setUrl(proxyUrl);
      setInputUrl(nextUrl);
    }
  };

  const refresh = () => {
    if (url) {
      setIsLoading(true);
      const currentUrl = url;
      setUrl('');
      setTimeout(() => setUrl(currentUrl), 10);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {/* Browser Header */}
      <header className="flex items-center gap-4 px-4 py-2 bg-[#141414] border-b border-white/10 shadow-xl z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={goBack}
            disabled={historyIndex <= 0}
            className="p-2 hover:bg-white/5 rounded-full disabled:opacity-30 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <button 
            onClick={goForward}
            disabled={historyIndex >= history.length - 1}
            className="p-2 hover:bg-white/5 rounded-full disabled:opacity-30 transition-colors"
          >
            <ArrowRight size={18} />
          </button>
          <button 
            onClick={refresh}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <RotateCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <form onSubmit={handleGo} className="flex-1 relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-blue-400 transition-colors">
            <Shield size={16} />
          </div>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Search or enter URL"
            className="w-full bg-[#1e1e1e] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-lg py-2 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-white/20"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                />
              )}
            </AnimatePresence>
          </div>
        </form>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowVpnPanel(!showVpnPanel)}
            className={`p-2 rounded-full transition-all ${isVpnConnected ? 'text-blue-400 bg-blue-500/10' : 'text-white/60 hover:bg-white/5'}`}
          >
            <Shield size={18} />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60">
            <Settings size={18} />
          </button>
          <div className="h-6 w-[1px] bg-white/10 mx-1" />
          <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs font-medium transition-all ${isVpnConnected ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
            <Globe size={14} />
            <span>{isVpnConnected ? 'VPN Protected' : 'RMD Proxy'}</span>
          </div>
        </div>
      </header>

      {/* VPN Panel Overlay */}
      <AnimatePresence>
        {showVpnPanel && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 right-4 w-72 bg-[#141414] border border-white/10 rounded-2xl shadow-2xl z-50 p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">VPN Settings</h3>
              <div className={`w-2 h-2 rounded-full ${isVpnConnected ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`} />
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/60">Connection Status</span>
                  <button 
                    onClick={toggleVpn}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${isVpnConnected ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                  >
                    {isVpnConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
                {isVpnConnected && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-white/30">Virtual IP</span>
                      <span className="text-blue-400 font-mono">{virtualIp}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-white/30">Encryption</span>
                      <span className="text-blue-400">AES-256-GCM</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-white/30 px-1">Location</span>
                <div className="grid grid-cols-1 gap-1">
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setVpnLocation(loc)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${vpnLocation === loc ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'hover:bg-white/5 text-white/60 border border-transparent'}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Viewport */}
      <main className="flex-1 relative bg-white">
        {!url ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] z-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-8 max-w-2xl px-6"
            >
              <div className="relative inline-block">
                <div className="absolute inset-0 blur-3xl bg-blue-600/20 rounded-full" />
                <h1 className="text-7xl font-bold tracking-tighter relative">
                  RMD<span className="text-blue-500">.</span>
                </h1>
              </div>
              
              <p className="text-white/40 text-lg font-light leading-relaxed">
                A high-performance web proxy designed for speed, privacy, and simplicity. 
                Experience the web without boundaries.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
                {[
                  { icon: Shield, title: 'Secure', desc: 'Encrypted traffic' },
                  { icon: Globe, title: 'Global', desc: 'Bypass restrictions' },
                  { icon: ExternalLink, title: 'Fast', desc: 'Optimized delivery' }
                ].map((feature, i) => (
                  <div key={i} className="p-4 bg-[#141414] border border-white/5 rounded-2xl text-left hover:border-white/10 transition-colors">
                    <feature.icon className="text-blue-500 mb-3" size={24} />
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-xs text-white/40">{feature.desc}</p>
                  </div>
                ))}
              </div>

              <div className="pt-8">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold">
                  Quick Access
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {['google.com', 'youtube.com', 'github.com', 'discord.com'].map((site) => (
                    <button
                      key={site}
                      onClick={() => navigate(site)}
                      className="px-4 py-2 bg-[#141414] hover:bg-[#1e1e1e] border border-white/5 rounded-xl text-sm transition-all"
                    >
                      {site}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-none"
            onLoad={() => setIsLoading(false)}
            title="Browser Viewport"
          />
        )}
      </main>

      {/* Status Bar */}
      <footer className="px-4 py-1 bg-[#141414] border-t border-white/5 flex items-center justify-between text-[10px] text-white/30 uppercase tracking-widest font-bold">
        <div className="flex items-center gap-4">
          <span>Status: {isLoading ? 'Loading...' : 'Ready'}</span>
          <span>Region: US-WEST</span>
        </div>
        <div className="flex items-center gap-4">
          <span>v1.0.4-rmd</span>
          <span className="text-blue-500/50">Secure Connection</span>
        </div>
      </footer>
    </div>
  );
}
