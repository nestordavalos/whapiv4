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

const distPath = path.join(__dirname, "dist");
const noCacheFiles = new Set([
	"index.html",
	"sw.js",
	"registerSW.js",
	"manifest.webmanifest"
]);

// The app shell and service-worker must always be fetched again after a
// deployment. Vite assets use content hashes, so only those may be immutable.
app.use(express.static(distPath, {
	maxAge: "7d",          // Cache static assets for 7 days
	immutable: true,       // Vite hashed filenames are immutable
	etag: true,
	setHeaders: (res, filePath) => {
		if (noCacheFiles.has(path.basename(filePath))) {
			res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
		}
	},
}));

// Handle all routes by serving index.html (no cache for HTML)
app.use((req, res) => {
	res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
	res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.VITE_PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
