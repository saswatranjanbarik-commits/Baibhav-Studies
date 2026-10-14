/**
 * Central app configuration.
 *
 * Anything that used to be hard-coded in several files lives here so it only
 * has to be changed in one place.
 */

/**
 * The primary administrator. This account:
 *  - is always given the "Admin" role on login
 *  - cannot be deleted from Manage Users
 *  - is always allowed in by the Firestore security rules (see firestore.rules)
 *
 * If you ever change this, also change the same address in firestore.rules.
 */
export const PRIMARY_ADMIN_EMAIL = 'saswatranjanbarik@gmail.com';

/** Roles used throughout the app. */
export type Role = 'Admin' | 'Teacher' | 'Student';

/**
 * Firestore's hard limit for a single document is 1 MiB (1,048,576 bytes).
 * All study data lives in ONE document (appStore/global_store), so we warn the
 * admin well before the limit is reached.
 */
export const FIRESTORE_DOC_LIMIT_BYTES = 1_048_576;
export const STORE_SIZE_WARNING_RATIO = 0.75; // warn at 75% full
