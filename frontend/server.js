//simple express server to run frontend production build;
const express = require("express");
const path = require("path");
const app = express();
require('dotenv').config();

app.use(express.static(path.join(__dirname, "dist")));
app.get("*", function (req, res) {
	res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(process.env.SERVER_PORT || 3000);