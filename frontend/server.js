//simple express server to run frontend production build;
const express = require("express");
const path = require("path");
const app = express();
require('dotenv').config();

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, "dist")));

// Handle all routes by serving index.html
app.use((req, res) => {
	res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.VITE_PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});