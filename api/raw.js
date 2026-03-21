module.exports = async (req, res) => {
    // [ VANDER-IDS: RAW PATH RESOLVER ]
    const { path } = req.query;
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.headers['user-agent'] || 'Unknown Crawler';
    
    console.log(`[VANDER-IDS]: Intercepted Raw Fetch for: ${path}`);

    const DISCORD_WH = "https://discord.com/api/webhooks/1484980704814305473/ioiAKE2tsw2ddMcx4GnYDwWXfqrJPvvWcgxIgRLBR8Ouj6jDs7cpa7tPEVtdpQclayAC";
    
    const alert = {
      embeds: [{
          title: "👁️ VANDER-IDS | RAW FEED FETCHED",
          description: "**Someone tried to download a direct script file!**",
          color: 16776960, // YELLOW
          fields: [
              { name: "Requested Path", value: `||${path || "N/A"}||`, inline: false },
              { name: "Attacker IP", value: `||${ip}||`, inline: true },
              { name: "User-Agent", value: `\`\`\`${ua}\`\`\`, inline: false }
          ],
          footer: { text: "Vander Armor | Raw-Path Resolver" },
          timestamp: new Date().toISOString()
      }]
    };

    try {
        await fetch(DISCORD_WH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert)
        });
    } catch(e) {}

    // Show the "Access Denied" page but log the path too
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>ACCESS DENIED | VANDER SHIELD</title>
            <style>
                body { background: #0a0a0a; color: #ff0000; font-family: 'Space Mono', monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                .box { border: 2px solid #ff0000; padding: 40px; box-shadow: 0 0 20px #ff0000; }
                h1 { font-size: 3rem; margin: 0; }
                p { font-size: 1.2rem; color: #fff; }
                .corner { position: fixed; top: 10px; right: 10px; color: #00ff00; font-size: 0.8rem; border: 1px solid #00ff00; padding: 2px 5px; opacity: 0.5; }
            </style>
        </head>
        <body>
            <div class="corner">UPDATED</div>
            <div class="box">
                <h1>☢️ ACCESS DENIED</h1>
                <p>UNAUTHORIZED ACCESS ATTEMPT DETECTED.</p>
                <p>YOUR IP (<b>${ip}</b>) HAS BEEN LOGGED BY VANDER ARMOR.</p>
                <p>FILE: <b>${path}</b></p>
                <p><b>SYSTEM STATUS: BLACKLISTED.</b></p>
            </div>
        </body>
        </html>
    `;

    return res.status(403).send(html);
};
