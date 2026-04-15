// Device-local settings for the Apple Reminders integration.
// The reminders themselves live on-device (EventKit), so it makes sense
// to store which list we sync with per-device as well.

export const REMINDERS_SETTINGS_KEY = 'choremax.remindersSettings'

const DEFAULTS = {
  enabled: false,
  shoppingListId: '',      // Calendar identifier of the list used for shopping
  todoListIds: [],         // Calendar identifiers of lists surfaced in the To-Do page
}

export function getRemindersSettings() {
  try {
    const raw = localStorage.getItem(REMINDERS_SETTINGS_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setRemindersSettings(next) {
  const merged = { ...getRemindersSettings(), ...next }
  localStorage.setItem(REMINDERS_SETTINGS_KEY, JSON.stringify(merged))
  return merged
}
