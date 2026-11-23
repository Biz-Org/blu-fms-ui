/** @odoo-module **/

/**
 * Temporary UI demonstration data for screens whose backend models/fields
 * are not complete yet. Separate from real Odoo records.
 */
export const HK_DEMO = {
    zones: {
        kpis: { total: 22, active: 18, cleaning_required: 4, unassigned: 3 },
        rows: [
            { id: 1, name: "Main Lobby", building: "Main Building", floor: "Ground Floor", area_type: "Lobby", staff: 4, status: "clean", status_label: "Clean", priority: "high", priority_label: "High" },
            { id: 2, name: "Tower A - Floor 3", building: "Tower A", floor: "Floor 3", area_type: "Common Area", staff: 2, status: "in_progress", status_label: "In Progress", priority: "medium", priority_label: "Medium" },
            { id: 3, name: "Tower B - Floor 2", building: "Tower B", floor: "Floor 2", area_type: "Washroom", staff: 1, status: "required", status_label: "Cleaning Required", priority: "high", priority_label: "High" },
            { id: 4, name: "Basement P1", building: "Basement", floor: "P1", area_type: "Parking", staff: 0, status: "required", status_label: "Cleaning Required", priority: "medium", priority_label: "Medium" },
            { id: 5, name: "Clubhouse", building: "Clubhouse", floor: "Ground", area_type: "Recreation", staff: 3, status: "clean", status_label: "Clean", priority: "low", priority_label: "Low" },
        ],
        coverage: { daily: 14, daily_width: 80, periodic: 5, periodic_width: 30 },
        alerts: [
            { level: "danger", title: "2 zones require immediate cleaning." },
            { level: "warning", title: "3 zones have no assigned staff." },
        ],
    },
    schedule: {
        kpis: { today: 24, upcoming: 48, recurring: 18, overdue: 4 },
        rows: [
            { id: 1, activity: "Lobby Cleaning", zone: "Main Lobby", freq: "Daily", staff: "Rahul S.", initials: "RS", color: "#7C5CFC", time: "08:00 AM", next: "19 Aug", status: "scheduled", status_label: "Scheduled", overdue: false },
            { id: 2, activity: "Floor Cleaning", zone: "Tower A - Fl 3", freq: "4 Hours", staff: "Sneha P.", initials: "SP", color: "#22A06B", time: "09:00 AM", next: "19 Aug", status: "in_progress", status_label: "In Prog", overdue: false },
            { id: 3, activity: "Washroom Cleaning", zone: "Tower B - Fl 2", freq: "Daily", staff: "Amit K.", initials: "AK", color: "#F5A524", time: "10:00 AM", next: "19 Aug", status: "scheduled", status_label: "Scheduled", overdue: false },
            { id: 4, activity: "Parking Cleaning", zone: "Basement P1", freq: "Weekly", staff: "Neha S.", initials: "NS", color: "#E5484D", time: "10:30 AM", next: "18 Aug", status: "overdue", status_label: "Overdue", overdue: true },
        ],
        upcoming: [
            { time: "11:00 AM", title: "Cafeteria Sanitization" },
            { time: "01:00 PM", title: "Executive Washrooms" },
            { time: "02:30 PM", title: "Meeting Rooms Detail" },
        ],
        alerts: [
            { level: "danger", title: "4 Tasks Overdue", message: "Action needed in Basement P1." },
            { level: "warning", title: "3 Unassigned Tasks", message: "Staff needed for evening shift." },
            { level: "info", title: "5 Critical Tomorrow", message: "Pre-inspection cleaning." },
        ],
    },
    tasks: {
        kpis: { today: 86, completed: 58, in_progress: 12, pending: 14, overdue: 4 },
        rows: [
            { id: 1, name: "Lobby Deep Cleaning", source: "Schedule Generated", zone: "Main Lobby", staff: "Rahul Sharma", initials: "RS", color: "#7C5CFC", time: "08:00 AM", priority: "high", priority_label: "High", status: "completed", status_label: "Completed", progress: 100 },
            { id: 2, name: "Floor Cleaning", source: "Schedule Generated", zone: "Tower A - Floor 3", staff: "Sneha Patil", initials: "SP", color: "#22A06B", time: "09:00 AM", priority: "medium", priority_label: "Medium", status: "in_progress", status_label: "In Progress", progress: 65 },
            { id: 3, name: "Washroom Cleaning", source: "Manual Task", zone: "Tower B - Floor 2", staff: "Amit Kumar", initials: "AK", color: "#F5A524", time: "10:00 AM", priority: "high", priority_label: "High", status: "assigned", status_label: "Assigned", progress: 0 },
            { id: 4, name: "Parking Cleaning", source: "Schedule Generated", zone: "Basement P1", staff: "Neha Singh", initials: "NS", color: "#E5484D", time: "10:30 AM", priority: "medium", priority_label: "Medium", status: "overdue", status_label: "Overdue", progress: 20 },
        ],
        workload: [
            { name: "Rahul Sharma", label: "4 Completed", tone: "green" },
            { name: "Sneha Patil", label: "3 Completed", tone: "green" },
            { name: "Amit Kumar", label: "2 Pending", tone: "amber" },
        ],
        alerts: [
            { level: "danger", title: "4 tasks overdue" },
            { level: "warning", title: "5 tasks unassigned" },
            { level: "info", title: "12 tasks in progress" },
        ],
    },
    checklist: {
        task: "Floor Cleaning",
        task_id: "TASK-2026-0048",
        zone: "Tower A – Floor 3",
        status: "In Progress",
        staff: "Sneha Patil",
        datetime: "18 Aug 2026, 09:00 AM",
        priority: "Medium",
        done: 6,
        total: 10,
        progress: 60,
        instructions: "Sweep and mop the entire floor area. Place caution signs at both ends of the corridor. Use dry mop only on hardwood sections near the elevators.",
        remarks: "",
        sections: [
            {
                id: "pre",
                title: "Pre-Cleaning",
                done: 3,
                total: 3,
                items: [
                    { id: 1, label: "Remove obstacles from the cleaning area", done: true },
                    { id: 2, label: "Collect and dispose of loose waste", done: true },
                    { id: 3, label: "Prepare cleaning materials and signage", done: true },
                ],
            },
            {
                id: "clean",
                title: "Cleaning",
                done: 3,
                total: 4,
                items: [
                    { id: 4, label: "Sweep entire floor area thoroughly", done: true },
                    { id: 5, label: "Mop hard floors with approved cleaner", done: true },
                    { id: 6, label: "Wipe baseboards and corners", done: true },
                    { id: 7, label: "Dry mop hardwood near elevators", done: false },
                ],
            },
        ],
    },
    verification: {
        banner: "12 tasks are waiting for your verification.",
        kpis: { pending: 12, approved: 34, rework: 3 },
        rows: [
            { id: 1, name: "Floor Cleaning", zone: "Tower A - Floor 3", staff: "Sneha Patil", completed: "Completed · 10:12 AM", progress: "10/10", status: "pending", status_label: "PENDING REVIEW" },
            { id: 2, name: "Lobby Deep Cleaning", zone: "Main Lobby", staff: "Rahul Sharma", completed: "Completed · 09:40 AM", progress: "8/8", status: "pending", status_label: "PENDING REVIEW" },
            { id: 3, name: "Clubhouse Cleaning", zone: "Clubhouse", staff: "Priya Shah", completed: "Completed · 11:20 AM", progress: "9/10", status: "rework", status_label: "REWORK REQUIRED" },
        ],
        selected: {
            name: "Floor Cleaning",
            zone: "Tower A - Floor 3",
            activity: "Routine Cleaning",
            staff: "Sneha Patil",
            priority: "Standard",
            scheduled: "09:00 AM",
            completed: "10:12 AM",
            checklist: ["Sweep and mop hard floors", "Wipe corners and baseboards", "Place wet-floor signs"],
            more: 7,
            progress: "10/10 Completed",
            issues: "No issues reported.",
            remarks: "Floor had heavy stains near the coffee machine, took extra time to scrub.",
            comment: "",
        },
    },
    performance: {
        kpis: { completed: 68, completion_rate: 79, low_stock: 3, consumables_used: 142 },
        staff: [
            { id: 1, name: "Rahul Sharma", assigned: 12, completed: 11, pending: 1, rate: 92 },
            { id: 2, name: "Sneha Patil", assigned: 10, completed: 8, pending: 2, rate: 80 },
            { id: 3, name: "Amit Kumar", assigned: 9, completed: 6, pending: 3, rate: 67 },
            { id: 4, name: "Neha Singh", assigned: 8, completed: 5, pending: 3, rate: 63 },
        ],
        consumables: [
            { id: 1, name: "Floor Cleaner", category: "Liquid", stock: 12, used: 8, unit: "L", status: "ok", status_label: "In Stock" },
            { id: 2, name: "Disinfectant", category: "Liquid", stock: 4, used: 11, unit: "L", status: "low", status_label: "Low Stock" },
            { id: 3, name: "Garbage Bags", category: "Supply", stock: 2, used: 40, unit: "Pack", status: "low", status_label: "Low Stock" },
            { id: 4, name: "Gloves", category: "PPE", stock: 18, used: 22, unit: "Pair", status: "ok", status_label: "In Stock" },
        ],
        alerts: [
            { level: "danger", title: "Disinfectant below minimum stock." },
            { level: "warning", title: "Garbage bags need reorder today." },
            { level: "info", title: "Rahul Sharma leads completion this week." },
        ],
        activities: [
            { text: "Lobby Deep Cleaning verified", time: "10 min ago" },
            { text: "Parking Cleaning marked overdue", time: "25 min ago" },
            { text: "Zone Main Lobby assigned to Rahul", time: "1 hr ago" },
        ],
    },
};
