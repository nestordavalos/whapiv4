import React from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";

import "./suppressWarnings";
import App from "./App.jsx";

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		let refreshing = false;
		navigator.serviceWorker.addEventListener("controllerchange", () => {
			if (refreshing) return;
			refreshing = true;
			window.location.reload();
		});

		navigator.serviceWorker
			.register("/sw.js", { scope: "/", updateViaCache: "none" })
			.then(registration => registration.update())
			.catch(() => undefined);
	});
}

const root = createRoot(document.getElementById("root"));
root.render(
	<CssBaseline>
		<App />
	</CssBaseline>
);
