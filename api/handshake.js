module.exports = async (req, res) => {
    // [ VANDER-ARMOR V4: ELITE PAYLOAD-STREAMER ]
    const { key, project } = req.query;
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const shieldKey = req.headers['x-vander-shield-key'];

    // 1. Mandatory Security Handshake
    if (shieldKey !== 'VANDER_SHIELD_CORE_99') {
        const DISCORD_WH = "https://discord.com/api/webhooks/1484980704814305473/ioiAKE2tsw2ddMcx4GnYDwWXfqrJPvvWcgxIgRLBR8Ouj6jDs7cpa7tPEVtdpQclayAC";
        const data = {
            embeds: [{
                title: "🔴 SECURITY BREACH | VANDER SHIELD",
                description: "An unauthorized script fetch was intercepted and blocked.",
                color: 16711680,
                fields: [
                    { name: "Attacker IP", value: `||${ip || "HIDDEN/PROXY"}||`, inline: true },
                    { name: "Project-Target", value: project || "ROOT_CORE", inline: true }
                ],
                timestamp: new Date().toISOString()
            }]
        };
        await fetch(DISCORD_WH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return res.status(403).send("-- [[ LUARMOR-V4 FAILURE: EXPIRED-OR-INVALID-SESSION ]]");
    }

    // 2. PROJECT REPOSITORY (GOD-MODE SCRIPTS)
    const SCRIPTS = {
        vander_duels: `print("[Vander-Shield]: Duels Core Loaded Successfully.")\n-- [[ 🌌 DUELS ELITE PAYLOAD ]] --\nloadstring(game:HttpGet("https://raw.githubusercontent.com/Vander/Scripts/main/duels.lua"))()`,
        vander_desync: `print("[Vander-Shield]: Desync V3 Active.")\n-- [[ 🌀 DESYNC PAYLOAD ]] --\nloadstring(game:HttpGet("https://raw.githubusercontent.com/Vander/Scripts/main/desync.lua"))()`,
        nemesis_hub: `print("[Vander-Shield]: Nemesis Hub Authenticated.")\n-- [[ 👺 NEMESIS PAYLOAD ]] --\nloadstring(game:HttpGet("https://raw.githubusercontent.com/Vander/Scripts/main/nemesis.lua"))()`
    };

    const payload = SCRIPTS[project] || `print("[Vander-Shield]: Welcome to the Vander Guard Matrix.")\n-- Core Engine Active.`;

    // 3. POLYMORPHIC OBFUSCATION ENGINE (V12 REAPER)
    const { obfuscate } = require('../utils/obfuscator');
    const obfuscated_payload = obfuscate(payload);

    return res.status(200).send(obfuscated_payload);
};
