// Reminders.js
//
// JS bridge for the native iOS Apple Reminders (EventKit) plugin. On web / Android
// it falls back to a stub that reports as unsupported, so the rest of the app can
// treat Reminders as an optional capability without feature-detecting everywhere.
//
// Native plugin: ios/App/CapApp-SPM/Sources/CapApp-SPM/RemindersPlugin.swift

import { Capacitor, registerPlugin } from '@capacitor/core'

const nativePlugin = registerPlugin('Reminders', {
  // Web fallback - all methods report unsupported
  web: () => ({
    isSupported: async () => ({ supported: false }),
    checkPermission: async () => ({ status: 'unsupported' }),
    requestPermission: async () => ({ granted: false, status: 'unsupported' }),
    getLists: async () => ({ lists: [] }),
    createList: async () => { throw new Error('Reminders not supported on this platform') },
    getReminders: async () => ({ reminders: [] }),
    createReminder: async () => { throw new Error('Reminders not supported on this platform') },
    updateReminder: async () => ({ ok: false }),
    completeReminder: async () => ({ ok: false }),
    deleteReminder: async () => ({ ok: false }),
  }),
})

export function isRemindersSupported() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

export const Reminders = {
  isSupported: async () => {
    if (!isRemindersSupported()) return { supported: false }
    return nativePlugin.isSupported()
  },
  checkPermission: async () => {
    if (!isRemindersSupported()) return { status: 'unsupported' }
    return nativePlugin.checkPermission()
  },
  requestPermission: async () => {
    if (!isRemindersSupported()) return { granted: false, status: 'unsupported' }
    return nativePlugin.requestPermission()
  },
  getLists: async () => {
    if (!isRemindersSupported()) return { lists: [] }
    return nativePlugin.getLists()
  },
  createList: async (title) => {
    if (!isRemindersSupported()) throw new Error('Reminders not supported on this platform')
    return nativePlugin.createList({ title })
  },
  getReminders: async ({ listIds = [], includeCompleted = false } = {}) => {
    if (!isRemindersSupported()) return { reminders: [] }
    return nativePlugin.getReminders({ listIds, includeCompleted })
  },
  createReminder: async ({ title, listId, notes, dueDate } = {}) => {
    if (!isRemindersSupported()) throw new Error('Reminders not supported on this platform')
    const args = { title }
    if (listId) args.listId = listId
    if (notes) args.notes = notes
    if (dueDate) args.dueDate = dueDate
    return nativePlugin.createReminder(args)
  },
  updateReminder: async ({ id, title, notes, completed } = {}) => {
    if (!isRemindersSupported()) return { ok: false }
    const args = { id }
    if (title !== undefined) args.title = title
    if (notes !== undefined) args.notes = notes
    if (completed !== undefined) args.completed = completed
    return nativePlugin.updateReminder(args)
  },
  completeReminder: async ({ id, completed = true } = {}) => {
    if (!isRemindersSupported()) return { ok: false }
    return nativePlugin.completeReminder({ id, completed })
  },
  deleteReminder: async ({ id } = {}) => {
    if (!isRemindersSupported()) return { ok: false }
    return nativePlugin.deleteReminder({ id })
  },
}

export default Reminders
