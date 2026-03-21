module.exports = async (req, res) => {
    // [ VANDER-IDS: MANUAL TEST PROTOCOL ]
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const DISCORD_WH = "https://discord.com/api/webhooks/1484980704814305473/ioiAKE2tsw2ddMcx4GnYDwWXfqrJPvvWcgxIgRLBR8Ouj6jDs7cpa7tPEVtdpQclayAC";
    
    const data = {
        embeds: [{
            title: "🧪 SELF-TEST | VANDER SHIELD IDS",
            description: "If you are reading this, your IP Logging system is **SUCCESSFULLY** delivering alerts to Discord.",
            color: 65280, // GREEN
            fields: [
                { name: "Your Current IP", value: `||${ip}||`, inline: true },
                { name: "Capture Method", value: req.headers['x-real-ip'] ? "Vercel Direct" : "Forwarded/Socket", inline: true }
            ],
            footer: { text: "Vander Armor | Verifier Node" },
            timestamp: new Date().toISOString()
        }]
    };
    
    try {
        await fetch(DISCORD_WH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        return res.status(200).send(`
            <h1>✅ VANDER SHIELD: TEST SUCCESSFUL</h1>
            <p>Your IP has been captured as: <b>${ip}</b></p>
            <p>Check your Discord channel. If you see a green "SELF-TEST" alert, your system is 100% operational.</p>
        `);
    } catch(e) {
        return res.status(500).send(`<h1>❌ TEST FAILED: ${e.message}</h1>`);
    }
};
