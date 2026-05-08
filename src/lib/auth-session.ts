export const SESSION_MODE_KEY = 'synap_session_mode'
export const SESSION_ACTIVE_KEY = 'synap_session_active'

export function clearSessionPersistenceFlags() {
  try {
    localStorage.removeItem(SESSION_MODE_KEY)
    localStorage.removeItem('synap_remember_me')
    sessionStorage.removeItem(SESSION_ACTIVE_KEY)
  } catch {}
}
