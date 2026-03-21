const express = require('express');
const app = express();
const path = require('path');

// [ VANDER ARMOR: EXPRESS HYPER-PULSE ] 🦾
// This core satisfies the Vercel "Gatsby/Express" build requirements.

// Serve the static frontend (index.html, css, etc.)
app.use(express.static(path.join(__dirname, '/')));

// Serve the Landing Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// The Vercel Builder requires the app to be exported
module.exports = app;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[VANDER-ARMOR] Hyper-Pulse Core Active on ${PORT}`);
});
