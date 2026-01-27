import { registerSettings, getServerUrl, getApiKey } from "./scripts/settings.js";
import { FoundryBridge } from "./scripts/socket.js";
import "./scripts/sync.js";

let bridge = null;

Hooks.once("init", () => {
  console.log("PlaneShift Bridge: Initializing");
  registerSettings();
});

Hooks.once("ready", () => {
  console.log("PlaneShift Bridge initialized");
  
  const serverUrl = getServerUrl();
  const apiKey = getApiKey();
  
  if (!serverUrl) {
    console.warn("PlaneShift Bridge: No server URL configured");
    return;
  }
  
  bridge = new FoundryBridge(serverUrl, apiKey);
  bridge.connect();
});

export { bridge, FoundryBridge };
