import { config } from "../../package.json";

/**
 * Get preference value.
 * Wrapper of `Zotero.Prefs.get`.
 * @param key
 */
export function getPref(key: string) {
  return Zotero.Prefs.get(`${config.prefsPrefix}.${key}`, true);
}

/**
 * Set preference value.
 * Wrapper of `Zotero.Prefs.set`.
 * @param key
 * @param value
 */
export function setPref(key: string, value: string | number | boolean) {
  return Zotero.Prefs.set(`${config.prefsPrefix}.${key}`, value, true);
}

/**
 * Clear preference value.
 * Wrapper of `Zotero.Prefs.clear`.
 * @param key
 */
export function clearPref(key: string) {
  return Zotero.Prefs.clear(`${config.prefsPrefix}.${key}`, true);
}

/**
 * Get the configured LLM model identifier with a sensible fallback.
 */
export function getLlmModel(defaultModel = "gpt-4o") {
  const value = getPref("OPENAI_MODEL")
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }
  const baseUrl = getPref("OPENAI_BASE_URL")
  if (typeof baseUrl === "string" && baseUrl.toLowerCase().includes("deepseek")) {
    return "deepseek-chat"
  }
  return defaultModel
}

/**
 * Get the configured LLM base URL with a sensible fallback.
 */
export function getLlmBaseUrl(defaultBaseUrl = "https://api.openai.com/v1") {
  const value = getPref("OPENAI_BASE_URL")
  return typeof value === "string" && value.trim() ? value.trim() : defaultBaseUrl
}

/**
 * Derive a friendly provider name from the configured base URL.
 */
export function getLlmProviderName(defaultName = "OpenAI") {
  const baseUrl = getLlmBaseUrl()
  if (baseUrl.toLowerCase().includes("deepseek")) {
    return "DeepSeek"
  }
  return defaultName
}
