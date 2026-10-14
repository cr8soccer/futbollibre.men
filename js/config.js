/**
 * ========================================================
 * 🔒 FÚTBOL LIBRE TV - PRIVATE CONFIGURATION
 * ========================================================
 *
 * SCHEDULE ON / OFF CONTROLLER (Sirf code se control):
 *
 *  - true  => Schedule website pe show hoga (ON)
 *  - false => Schedule website pe bilkul nahi aayega (OFF)
 */

window.FBL_CONFIG = {
  // 👇 Yahan se Schedule ko ON (true) ya OFF (false) karein:
  showSchedule: true,

  // Ovogoal API endpoint
  apiEndpoint: "https://ovogoal.cyou/api/v2/flyembed2.json",

  // Auto-refresh interval (60 seconds)
  autoRefreshInterval: 60000
};
