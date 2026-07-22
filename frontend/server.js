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
// deployment. Only /assets contains Vite content-hashed files and is safe to
// retain for a long period. This server is used by the PM2 deployment path.
app.use(express.static(distPath, {
	maxAge: 0,
	etag: true,
	setHeaders: (res, filePath) => {
		if (noCacheFiles.has(path.basename(filePath))) {
			res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
		} else if (filePath.startsWith(`${distPath}${path.sep}assets${path.sep}`)) {
			res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
		} else {
			res.setHeader("Cache-Control", "no-cache, must-revalidate");
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
