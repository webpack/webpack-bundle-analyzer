import { render } from "preact";

import ModulesTreemap from "./components/ModulesTreemap.jsx";
import { store } from "./store.js";

import "./viewer.css";

// Initializing WebSocket for live treemap updates
let ws;
try {
  if (globalThis.enableWebSocket) {
    ws = new WebSocket(`ws://${location.host}`);
  }
} catch {
  // eslint-disable-next-line no-console
  console.warn(
    "Couldn't connect to analyzer websocket server so you'll have to reload page manually to see updates in the treemap",
  );
}

window.addEventListener(
  "load",
  () => {
    store.defaultSize = `${globalThis.defaultSizes}Size`;
    store.setModules(globalThis.chartData);
    store.setEntrypoints(globalThis.entrypoints);
    store.updateTheme();
    render(<ModulesTreemap />, document.querySelector("#app"));

    if (ws) {
      ws.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data);

        if (msg.event === "chartDataUpdated") {
          store.setModules(msg.data);
        }
      });
    }
  },
  false,
);
