import React from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";

import "./suppressWarnings";
import App from "./App.jsx";

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		let refreshing = false;
		let registration;
		const checkForUpdate = () => registration?.update().catch(() => undefined);
		navigator.serviceWorker.addEventListener("controllerchange", () => {
			if (refreshing) return;
			refreshing = true;
			window.location.reload();
		});

		navigator.serviceWorker
			.register("/sw.js", { scope: "/", updateViaCache: "none" })
			.then(currentRegistration => {
				registration = currentRegistration;
				checkForUpdate();
				// A tab can remain open for days. Revalidate the worker on focus and
				// periodically so a deployment never requires a hard refresh.
				window.addEventListener("focus", checkForUpdate);
				document.addEventListener("visibilitychange", () => {
					if (document.visibilityState === "visible") checkForUpdate();
				});
				window.setInterval(checkForUpdate, 60 * 1000);
			})
			.catch(() => undefined);
	});
}

const root = createRoot(document.getElementById("root"));
root.render(
	<CssBaseline>
		<App />
	</CssBaseline>
);
