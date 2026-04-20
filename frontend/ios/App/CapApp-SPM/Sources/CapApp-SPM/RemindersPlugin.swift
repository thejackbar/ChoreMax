//
//  RemindersPlugin.swift
//  ChoreMax
//
//  Capacitor plugin that bridges Apple Reminders (EventKit) into the
//  ChoreMax web app. Lets users view / create / complete / delete
//  reminders from their device. JS side: registerPlugin('Reminders').
//

import Foundation
import Capacitor
import EventKit

@objc(RemindersPlugin)
public class RemindersPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RemindersPlugin"
    public let jsName = "Reminders"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermission",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLists",          returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "createList",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getReminders",      returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "createReminder",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateReminder",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "completeReminder",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteReminder",    returnType: CAPPluginReturnPromise),
    ]

    // One shared store across calls - EventKit docs recommend this.
    private let store = EKEventStore()

    // MARK: - Permissions

    @objc func isSupported(_ call: CAPPluginCall) {
        call.resolve(["supported": true])
    }

    @objc func checkPermission(_ call: CAPPluginCall) {
        let status = EKEventStore.authorizationStatus(for: .reminder)
        call.resolve(["status": statusString(status)])
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            store.requestFullAccessToReminders { [weak self] granted, error in
                if let error = error {
                    call.reject("Permission request failed: \(error.localizedDescription)")
                    return
                }
                let status = EKEventStore.authorizationStatus(for: .reminder)
                call.resolve([
                    "granted": granted,
                    "status": self?.statusString(status) ?? "unknown",
                ])
            }
        } else {
            store.requestAccess(to: .reminder) { [weak self] granted, error in
                if let error = error {
                    call.reject("Permission request failed: \(error.localizedDescription)")
                    return
                }
                let status = EKEventStore.authorizationStatus(for: .reminder)
                call.resolve([
                    "granted": granted,
                    "status": self?.statusString(status) ?? "unknown",
                ])
            }
        }
    }

    private func statusString(_ status: EKAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .denied:        return "denied"
        case .restricted:    return "restricted"
        case .authorized:    return "authorized"
        @unknown default:
            if #available(iOS 17.0, *) {
                // Handle iOS 17+ cases
                if status.rawValue == 3 { return "fullAccess" }
                if status.rawValue == 4 { return "writeOnly" }
            }
            return "unknown"
        }
    }

    private func ensureAuthorized(_ call: CAPPluginCall) -> Bool {
        let status = EKEventStore.authorizationStatus(for: .reminder)
        // Accept any of the "we can read/write" states
        if status == .authorized { return true }
        if #available(iOS 17.0, *), status.rawValue == 3 { return true } // fullAccess
        call.reject("Reminders access not granted. Ask the user to enable it in Settings > Privacy > Reminders.")
        return false
    }

    // MARK: - Lists

    @objc func getLists(_ call: CAPPluginCall) {
        guard ensureAuthorized(call) else { return }
        let calendars = store.calendars(for: .reminder)
        let lists = calendars.map { cal -> [String: Any] in
            [
                "id": cal.calendarIdentifier,
                "title": cal.title,
                "color": hexString(from: cal.cgColor),
                "isSubscribed": cal.isSubscribed,
                "allowsModifications": cal.allowsContentModifications,
                "source": cal.source?.title ?? "",
            ]
        }
        call.resolve(["lists": lists])
    }

    @objc func createList(_ call: CAPPluginCall) {
        guard ensureAuthorized(call) else { return }
        guard let title = call.getString("title"), !title.isEmpty else {
            call.reject("title is required")
            return
        }
        let calendar = EKCalendar(for: .reminder, eventStore: store)
        calendar.title = title
        // Pick the first writeable source (iCloud preferred, else local)
        let sources = store.sources.filter { $0.sourceType == .calDAV || $0.sourceType == .local }
        guard let source = sources.first(where: { $0.title.lowercased().contains("icloud") })
                ?? sources.first else {
            call.reject("No writable source found for Reminders")
            return
        }
        calendar.source = source
        do {
            try store.saveCalendar(calendar, commit: true)
            call.resolve([
                "id": calendar.calendarIdentifier,
                "title": calendar.title,
            ])
        } catch {
            call.reject("Failed to create list: \(error.localizedDescription)")
        }
    }

    // MARK: - Reminders

    @objc func getReminders(_ call: CAPPluginCall) {
        guard ensureAuthorized(call) else { return }
        let listIds = call.getArray("listIds", String.self) ?? []
        let includeCompleted = call.getBool("includeCompleted") ?? false

        var calendars: [EKCalendar]? = nil
        if !listIds.isEmpty {
            calendars = store.calendars(for: .reminder).filter { listIds.contains($0.calendarIdentifier) }
        }

        let predicate: NSPredicate = includeCompleted
            ? store.predicateForReminders(in: calendars)
            : store.predicateForIncompleteReminders(withDueDateStarting: nil, ending: nil, calendars: calendars)

        store.fetchReminders(matching: predicate) { reminders in
            let payload = (reminders ?? []).map { r -> [String: Any] in
                var item: [String: Any] = [
                    "id": r.calendarItemIdentifier,
                    "title": r.title ?? "",
                    "completed": r.isCompleted,
                    "listId": r.calendar.calendarIdentifier,
                    "listTitle": r.calendar.title,
                    "priority": r.priority,
                ]
                if let notes = r.notes { item["notes"] = notes }
                if let due = r.dueDateComponents?.date {
                    item["dueDate"] = ISO8601DateFormatter().string(from: due)
                }
                if let completedAt = r.completionDate {
                    item["completedAt"] = ISO8601DateFormatter().string(from: completedAt)
                }
                return item
            }
            call.resolve(["reminders": payload])
        }
    }

    @objc func createReminder(_ call: CAPPluginCall) {
        guard ensureAuthorized(call) else { return }
        guard let title = call.getString("title"), !title.isEmpty else {
            call.reject("title is required")
            return
        }
        let listId = call.getString("listId")
        let notes = call.getString("notes")
        let dueDateStr = call.getString("dueDate")

        let reminder = EKReminder(eventStore: store)
        reminder.title = title
        if let notes = notes { reminder.notes = notes }

        // Target calendar: named list, else the default
        if let listId = listId,
           let cal = store.calendars(for: .reminder).first(where: { $0.calendarIdentifier == listId }) {
            reminder.calendar = cal
        } else {
            reminder.calendar = store.defaultCalendarForNewReminders()
        }

        if let dueDateStr = dueDateStr, let date = ISO8601DateFormatter().date(from: dueDateStr) {
            let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
            reminder.dueDateComponents = comps
        }

        do {
            try store.save(reminder, commit: true)
            call.resolve([
                "id": reminder.calendarItemIdentifier,
                "title": reminder.title ?? "",
                "listId": reminder.calendar.calendarIdentifier,
            ])
        } catch {
            call.reject("Failed to create reminder: \(error.localizedDescription)")
        }
    }

    @objc func updateReminder(_ call: CAPPluginCall) {
        guard ensureAuthorized(call) else { return }
        guard let id = call.getString("id"), !id.isEmpty else {
            call.reject("id is required")
            return
        }
        guard let reminder = findReminder(id: id) else {
            call.reject("Reminder not found")
            return
        }
        if let title = call.getString("title") { reminder.title = title }
        if let notes = call.getString("notes") { reminder.notes = notes }
        if let completed = call.getBool("completed") { reminder.isCompleted = completed }
        if let priority = call.getInt("priority") { reminder.priority = priority }
        if let dueDateStr = call.getString("dueDate") {
            if dueDateStr.isEmpty {
                reminder.dueDateComponents = nil
            } else if let date = ISO8601DateFormatter().date(from: dueDateStr) {
                reminder.dueDateComponents = Calendar.current.dateComponents(
                    [.year, .month, .day, .hour, .minute], from: date)
            }
        }
        do {
            try store.save(reminder, commit: true)
            call.resolve(["ok": true])
        } catch {
            call.reject("Failed to update reminder: \(error.localizedDescription)")
        }
    }

    @objc func completeReminder(_ call: CAPPluginCall) {
        guard ensureAuthorized(call) else { return }
        guard let id = call.getString("id"), !id.isEmpty else {
            call.reject("id is required")
            return
        }
        guard let reminder = findReminder(id: id) else {
            call.reject("Reminder not found")
            return
        }
        reminder.isCompleted = call.getBool("completed") ?? true
        do {
            try store.save(reminder, commit: true)
            call.resolve(["ok": true])
        } catch {
            call.reject("Failed to complete reminder: \(error.localizedDescription)")
        }
    }

    @objc func deleteReminder(_ call: CAPPluginCall) {
        guard ensureAuthorized(call) else { return }
        guard let id = call.getString("id"), !id.isEmpty else {
            call.reject("id is required")
            return
        }
        guard let reminder = findReminder(id: id) else {
            call.reject("Reminder not found")
            return
        }
        do {
            try store.remove(reminder, commit: true)
            call.resolve(["ok": true])
        } catch {
            call.reject("Failed to delete reminder: \(error.localizedDescription)")
        }
    }

    // MARK: - Helpers

    private func findReminder(id: String) -> EKReminder? {
        guard let item = store.calendarItem(withIdentifier: id) as? EKReminder else {
            return nil
        }
        return item
    }

    private func hexString(from color: CGColor) -> String {
        let comps = color.components ?? [0, 0, 0]
        let r = Int((comps.count > 0 ? comps[0] : 0) * 255)
        let g = Int((comps.count > 1 ? comps[1] : 0) * 255)
        let b = Int((comps.count > 2 ? comps[2] : 0) * 255)
        return String(format: "#%02X%02X%02X", r, g, b)
    }
}
