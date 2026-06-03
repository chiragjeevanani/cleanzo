/**
 * Feature flags.
 *
 * These let us turn whole features on/off from a single place without
 * ripping out code. Flip a flag to `false` to hide the feature everywhere
 * it is gated.
 *
 * ─────────────────────────────────────────────────────────────────────
 * ACCOUNT_DELETION
 * ─────────────────────────────────────────────────────────────────────
 * Apple App Store & Google Play require apps that let users create an
 * account to also let them delete it from inside the app. This flag gates
 * the "Delete Account" UI for both the Customer (car owner) and Cleaner
 * (crew) apps.
 *
 * After the app is approved/published and you no longer want to expose
 * account deletion, set ACCOUNT_DELETION to `false` (or `VITE_ENABLE_ACCOUNT_DELETION=false`
 * in the environment). That hides every Delete Account entry point without
 * touching the rest of the code.
 */

// An env override wins when present; otherwise default to enabled.
const envFlag = import.meta.env?.VITE_ENABLE_ACCOUNT_DELETION;

export const FEATURES = {
  ACCOUNT_DELETION: envFlag === undefined ? true : envFlag !== 'false',
};

export default FEATURES;
