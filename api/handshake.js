module.exports = async (req, res) => {
    const { session, h } = req.body;
    const shieldKey = req.headers['x-vander-shield-key'];

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (shieldKey !== 'VANDER_SHIELD_CORE_99') {
        // [ INTRUSION DETECTED: AUTO-BAN LOGIC ]
        console.error(`[VANDER-IDS]: UNAUTHORIZED FETCH ATTEMPT BLOCKED!`);
        
        // --- DISCORD ALARM ---
        const DISCORD_WH = "https://discord.com/api/webhooks/1484980704814305473/ioiAKE2tsw2ddMcx4GnYDwWXfqrJPvvWcgxIgRLBR8Ouj6jDs7cpa7tPEVtdpQclayAC";
        
        // Send async alert
        try {
            const data = {
                embeds: [{
                    title: "🔴 SECURITY BREACH | VANDER SHIELD",
                    description: "An unauthorized script fetch was intercepted and blocked.",
                    color: 16711680,
                    fields: [
                        { name: "Attacker IP", value: `||${ip}||`, inline: true },
                        { name: "Hardware ID (HWID)", value: `||${h || "N/A"}||`, inline: true },
                        { name: "Request Method", value: session || "Direct Probe", inline: false }
                    ],
                    footer: { text: "Vander Armor | IDS Prototype" },
                    timestamp: new Date().toISOString()
                }]
            };
            
            // Note: Since this is a serverless function, we don't always await the webhook to keep response times fast.
            fetch(DISCORD_WH, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).catch(() => {});
        } catch(e) {
            console.error("Webhook Error:", e);
        }
        
        return res.status(403).json({ 
            success: false, 
            message: 'SHIELD_MISMATCH_DETECTED | ACCESS_TERMINATED | IP_LOGGED' 
        });
    }

    // [ LOG AUTHORIZED FETCH ]
    console.log(`[VANDER-IDS]: Authorized Handshake Successful for HWID: ${h}`);
};
