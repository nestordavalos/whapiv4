import React from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";

import "./suppressWarnings";
import App from "./App.jsx";

const root = createRoot(document.getElementById("root"));
root.render(
	<CssBaseline>
		<App />
	</CssBaseline>
);
