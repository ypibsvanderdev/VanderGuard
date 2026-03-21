import { NextResponse } from 'next/server';

export async function middleware(req) {
  const url = req.nextUrl.pathname;
  const ip = req.ip || req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'Unknown';
  const ua = req.headers.get('user-agent') || 'No UA';

  // [ VANDER-IDS: OMNI-LOGGER ]
  // Log all attempts to access sensitive paths (raw scripts, api, etc.)
  const sensitivePaths = ['/raw/', '/api/handshake', '/api/obfuscate', '/load/'];
  const isSensitive = sensitivePaths.some(p => url.startsWith(p));

  // Only log sensitive fetches to prevent Discord Spam
  if (isSensitive) {
    const DISCORD_WH = "https://discord.com/api/webhooks/1484980704814305473/ioiAKE2tsw2ddMcx4GnYDwWXfqrJPvvWcgxIgRLBR8Ouj6jDs7cpa7tPEVtdpQclayAC";
    
    const alert = {
      embeds: [{
          title: "👁️ VANDER OMNI-REAPER | GLOBAL TRACKER",
          description: `**Direct URL Access Detected!**`,
          color: 3447003, // BLUE
          fields: [
              { name: "Target Path", value: `\`${url}\``, inline: false },
              { name: "Visitor IP", value: `||${ip}||`, inline: true },
              { name: "User-Agent", value: \`\`\`${ua}\`\`\`, inline: false }
          ],
          footer: { text: "Vander Armor | Global Middleware Engine" },
          timestamp: new Date().toISOString()
      }]
    };

    // Edge Functions MUST NOT await for too long, but we'll try to fire and forget
    fetch(DISCORD_WH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    }).catch(() => {});
  }

  return NextResponse.next();
}

// Ensure this only runs on your script paths
export const config = {
  matcher: ['/raw/:path*', '/api/:path*', '/load/:path*'],
};
