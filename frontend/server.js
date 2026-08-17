//simple express server to run frontend production build;
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const app = express();
require('dotenv').config();

// Security headers
app.use(helmet({
	contentSecurityPolicy: false, // frame-ancestors is set on the app shell below
	xFrameOptions: false,
}));

const configuredBackendUrl =
	process.env.BACKEND_FRAME_ORIGIN ||
	process.env.VITE_BACKEND_URL ||
	process.env.REACT_APP_BACKEND_URL;
let backendFrameOrigin;
try {
	backendFrameOrigin = configuredBackendUrl && new URL(configuredBackendUrl).origin;
} catch (_error) {
	backendFrameOrigin = undefined;
}
const setAppFramePolicy = (res, allowEmbedAncestors = false) => {
	res.setHeader(
		"Content-Security-Policy",
		allowEmbedAncestors
			? "frame-ancestors *"
			: `frame-ancestors 'self'${backendFrameOrigin ? ` ${backendFrameOrigin}` : ""}`
	);
};

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
			if (path.basename(filePath) === "index.html") setAppFramePolicy(res);
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
	// The backend wrapper is the security boundary for embedded sessions: it
	// restricts frame-ancestors to the origins configured in /settings and only
	// then passes the credential to this inner frame. CSP checks every ancestor
	// in a nested frame, so this route must also accept the authorized portal.
	setAppFramePolicy(res, req.path.startsWith("/embed/session/"));
	res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.VITE_PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
