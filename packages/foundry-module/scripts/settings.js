/**
 * Highport Bridge - Settings Registration
 * Registers module settings for server URL and API key
 */

/**
 * Register all module settings
 */
export function registerSettings() {
  game.settings.register("highport-bridge", "serverUrl", {
    name: "PLANE_SHIFT.Settings.ServerUrl.Name",
    hint: "PLANE_SHIFT.Settings.ServerUrl.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "ws://localhost:3012"
  });

  game.settings.register("highport-bridge", "apiKey", {
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
 * @returns {string} The Highport server URL
 */
export function getServerUrl() {
  return game.settings.get("highport-bridge", "serverUrl");
}

/**
 * Get the configured API key
 * @returns {string} The Highport API key
 */
export function getApiKey() {
  return game.settings.get("highport-bridge", "apiKey");
}
