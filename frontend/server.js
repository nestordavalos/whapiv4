//simple express server to run frontend production build;
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const app = express();
require('dotenv').config();

// Security headers
app.use(helmet({
	contentSecurityPolicy: false, // CSP managed by meta tags in index.html
}));

// Gzip compression
app.use(compression());

// Serve static files from dist directory with cache headers
app.use(express.static(path.join(__dirname, "dist"), {
	maxAge: "7d",          // Cache static assets for 7 days
	immutable: true,       // Vite hashed filenames are immutable
	etag: true,
}));

// Handle all routes by serving index.html (no cache for HTML)
app.use((req, res) => {
	res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
	res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.VITE_PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});