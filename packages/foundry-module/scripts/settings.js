/**
 * PlaneShift Bridge - Settings Registration
 * Registers module settings for server URL and API key
 */

/**
 * Register all module settings
 */
export function registerSettings() {
  game.settings.register("plane-shift-bridge", "serverUrl", {
    name: "PLANE_SHIFT.Settings.ServerUrl.Name",
    hint: "PLANE_SHIFT.Settings.ServerUrl.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "ws://localhost:3012"
  });

  game.settings.register("plane-shift-bridge", "apiKey", {
    name: "PLANE_SHIFT.Settings.ApiKey.Name",
    hint: "PLANE_SHIFT.Settings.ApiKey.Hint",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });
}

/**
 * Get the configured server URL
 * @returns {string} The PlaneShift server URL
 */
export function getServerUrl() {
  return game.settings.get("plane-shift-bridge", "serverUrl");
}

/**
 * Get the configured API key
 * @returns {string} The PlaneShift API key
 */
export function getApiKey() {
  return game.settings.get("plane-shift-bridge", "apiKey");
}
