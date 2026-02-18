import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Shield, Lock, Zap, GitBranch, Key, Activity, ChevronRight, CheckCircle2, XCircle, Eye, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const FEATURES = [
  {
    icon: Shield,
    title: 'Vander Secure Gate v4.2',
    desc: 'Multi-layer browser fingerprinting. Convincing fake scripts served to every unauthorized client.',
    color: 'cyan',
  },
  {
    icon: Lock,
    title: 'Zero Browser Access',
    desc: 'Scripts are 100% inaccessible from any browser. Only valid Roblox executor contexts receive real payloads.',
    color: 'blue',
  },
  {
    icon: Zap,
    title: 'Honeypot Traps',
    desc: 'Reverse engineers receive rotating decoy scripts — convincing enough to waste months of analysis time.',
    color: 'yellow',
  },
  {
    icon: GitBranch,
    title: 'GitHub-style Repository',
    desc: 'Manage all your Lua scripts in a clean, professional file browser with one-click loadstring URLs.',
    color: 'purple',
  },
  {
    icon: Key,
    title: 'Key-Based Access',
    desc: '$5/month or $50 lifetime. Keys are single-use, cryptographically bound to your account on redemption.',
    color: 'green',
  },
  {
    icon: Activity,
    title: 'Security Logging',
    desc: 'Every unauthorized access attempt is logged with full headers, user-agent strings, and timestamps.',
    color: 'red',
  },
];

const COLOR_MAP = {
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [key, setKey] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const me = await base44.auth.me();
          setUser(me);
          // Admin goes straight to admin panel
          if (me.role === 'admin') {
            window.location.href = createPageUrl('AdminPanel');
            return;
          }
          // Active paid/trial access goes to dashboard
          const now = new Date();
          const hasTrial = me.plan_type === 'trial' && me.trial_expires && new Date(me.trial_expires) > now;
          const hasPaid = me.has_access && me.plan_type !== 'trial' && (
            me.plan_type === 'lifetime' || (me.access_expires && new Date(me.access_expires) > now)
          );
          if (hasTrial || hasPaid) {
            window.location.href = createPageUrl('Dashboard');
            return;
          }
        }
      } catch (_e) {}
      setIsLoading(false);
    };
    init();
  }, []);

  const handleRedeem = async () => {
    if (!key.trim() || isRedeeming) return;
    setIsRedeeming(true);
    setMessage(null);
    try {
      // Try to get a hardware fingerprint (best-effort in browser)
    const hwid = btoa(`${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`).substring(0, 32);
    const res = await base44.functions.invoke('redeemKey', { key: key.trim(), hwid });
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message || 'Access granted! Redirecting...' });
        setTimeout(() => { window.location.href = createPageUrl('Dashboard'); }, 1800);
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Invalid key. Please check and try again.' });
      }
    } catch (_e) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    }
    setIsRedeeming(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070712] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070712] text-gray-100 overflow-x-hidden">
      {/* Animated grid background */}
      <div className="fixed inset-0 vh-grid-bg pointer-events-none opacity-60" />
      {/* Radial glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 border-b border-[#1a1a3e] bg-[#070712]/80 backdrop-blur-sm px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white">Vander Hub</span>
          <span className="hidden sm:inline text-[10px] text-cyan-400 font-mono bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">
            VSG v4.2
          </span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={() => base44.auth.logout()}
                className="text-gray-400 hover:text-red-400 text-xs">
                Logout
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => base44.auth.redirectToLogin(createPageUrl('Home'))}
              className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs">
              Login
            </Button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-full px-4 py-1.5 text-xs text-green-400 mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          VSG v4.2 — All Protection Layers Active
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold mb-5 leading-tight">
          <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            The Most Secure<br />Script Platform
          </span>
        </h1>

        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Host and distribute Roblox Lua scripts with multi-layer protection. Zero browser access.
          Rotating honeypot traps. Designed to take pros months to reverse engineer.
        </p>

        {/* Auth section */}
        {!user ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={() => base44.auth.redirectToLogin(createPageUrl('Home'))}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 text-sm">
              Get Access <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-yellow-500" /> $5/mo</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-cyan-400" /> $50 lifetime</span>
            </div>
          </div>
        ) : (
          <div className="max-w-sm mx-auto bg-[#0d0d1f] border border-[#1a1a3e] rounded-2xl p-6 text-left">
            <div className="text-sm font-semibold text-white mb-0.5">
              Welcome, {user.full_name || user.email?.split('@')[0]}
            </div>
            <div className="text-xs text-gray-500 mb-4">Enter your access key to unlock the dashboard</div>

            <div className="flex gap-2 mb-3">
              <Input
                value={key}
                onChange={e => setKey(e.target.value.toUpperCase())}
                placeholder="VH-XXXXXX-XXXXXX-XXXXXX"
                className="bg-black/40 border-[#1a1a3e] text-white font-mono text-xs placeholder:text-gray-700 flex-1"
                onKeyDown={e => e.key === 'Enter' && handleRedeem()}
              />
              <Button onClick={handleRedeem} disabled={!key.trim() || isRedeeming}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs px-4 flex-shrink-0">
                {isRedeeming
                  ? <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  : 'Redeem'}
              </Button>
            </div>

            {message && (
              <div className={`flex items-center gap-2 text-xs ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {message.type === 'success'
                  ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                {message.text}
              </div>
            )}

            <div className="mt-4 text-xs text-gray-600 text-center">
              No key? Contact the platform admin.
            </div>
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-8">
          <div className="text-xs text-gray-600 uppercase tracking-widest font-medium">Platform Features</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const c = COLOR_MAP[f.color];
            return (
              <div key={i} className={`bg-[#09091a] border border-[#1a1a3e] rounded-xl p-5 hover:border-cyan-500/20 transition-all hover:-translate-y-0.5`}>
                <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center mb-3`}>
                  <f.icon className={`w-4 h-4 ${c.text}`} />
                </div>
                <div className="font-semibold text-sm text-white mb-1.5">{f.title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{f.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}