/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component, onWillStart, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

const EMPTY_UI = {
    zones: { kpis: {}, rows: [], coverage: {}, alerts: [] },
    schedule: { kpis: {}, rows: [], upcoming: [], alerts: [], masters: {} },
    tasks: { kpis: {}, rows: [], workload: [], alerts: [], masters: {} },
    checklist: { task: "", task_id: "", zone: "", status: "", staff: "", datetime: "", priority: "", done: 0, total: 0, progress: 0, instructions: "", remarks: "", sections: [] },
    verification: { banner: "", kpis: {}, rows: [], selected: {} },
    performance: { kpis: {}, staff: [], consumables: [], alerts: [], activities: [] },
};

export class HousekeepingDashboard extends Component {
    static template = "housekeeping_management.Dashboard";
    static props = ["*"];

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.state = useState({
            screen: "dashboard",
            menuOpen: false,
            loading: true,
            data: null,
            roster: null,
            rosterSearch: "",
            rosterFilter: "all",
            rosterFilterOpen: false,
            weekDays: ["S", "M", "T", "W", "T2", "F", "S2"],
            demo: JSON.parse(JSON.stringify(EMPTY_UI)),
            zoneSearch: "",
            scheduleSearch: "",
            scheduleView: "list",
            taskSearch: "",
            taskTab: "all",
            verifyTab: "pending",
            verifySelected: {},
            zoneForm: this._blankZoneForm(),
            scheduleForm: this._blankScheduleForm(),
            taskForm: this._blankTaskForm(),
            checklistRemarks: "",
            supervisorComment: "",
            masters: { activities: [], zones: [], staff: [], shifts: [], checklists: [] },
        });
        onWillStart(async () => {
            await this.refreshAll();
        });
    }

    async refreshAll() {
        this.state.loading = true;
        try {
            await Promise.all([
                this.loadDashboard(),
                this.loadRoster(),
                this.loadZones(),
                this.loadSchedule(),
                this.loadTasks(),
                this.loadChecklist(),
                this.loadVerification(),
                this.loadPerformance(),
            ]);
        } catch (error) {
            console.error(error);
            this.notify(error.message || "Failed to load housekeeping data", "danger");
        } finally {
            this.state.loading = false;
        }
    }

    _blankZoneForm() {
        return {
            name: "",
            code: "",
            building: "",
            floor: "",
            area_type: "public",
            frequency: "daily",
            priority: "medium",
            cleaning_type: "routine",
            staff_ids: [],
            primary_staff_id: false,
        };
    }

    _blankScheduleForm() {
        return {
            activity_id: false,
            description: "",
            zone_id: false,
            building: "",
            floor: "",
            mode: "recurring",
            frequency: "weekly",
            time_start: 8.0,
            time_end: 10.0,
            days: ["M", "T", "W", "T2", "F"],
            start_date: "",
            end_date: "",
            staff_ids: [],
            primary_staff_id: false,
            shift_id: false,
            checklist_template_id: false,
            priority: "medium",
            instructions: "",
            assign_later: false,
        };
    }

    _blankTaskForm() {
        return {
            mode: "manual",
            name: "",
            activity_id: false,
            description: "",
            zone_id: false,
            building: "",
            floor: "",
            priority: "high",
            staff_id: false,
            shift_id: false,
            checklist_template_id: false,
            time_start: 8.0,
            time_end: 10.0,
        };
    }

    get title() {
        return {
            dashboard: "Housekeeping Dashboard",
            roster: "Staff & Roster",
            zones: "Zones",
            zone_form: "Add Zone",
            schedule: "Schedule",
            schedule_form: "Create Schedule",
            tasks: "Tasks",
            task_form: "Create Task",
            checklist: "Checklist",
            verification: "Verification",
            performance: "Performance",
            settings: "Settings",
            support: "Support",
        }[this.state.screen];
    }

    async loadDashboard() {
        this.state.data = await this.orm.call("hk.dashboard", "get_dashboard_data", []);
    }

    async loadRoster() {
        this.state.roster = await this.orm.call("hk.dashboard", "get_roster_data", []);
    }

    async loadZones() {
        const data = await this.orm.call("hk.dashboard", "get_zones_data", []);
        this.state.demo.zones = data;
        if (data.masters) {
            this.state.masters = { ...this.state.masters, ...data.masters };
        }
    }

    async loadSchedule() {
        const data = await this.orm.call("hk.dashboard", "get_schedule_data", []);
        this.state.demo.schedule = data;
        if (data.masters) {
            this.state.masters = data.masters;
        }
    }

    async loadTasks() {
        const data = await this.orm.call("hk.dashboard", "get_tasks_data", []);
        this.state.demo.tasks = data;
        if (data.masters) {
            this.state.masters = { ...this.state.masters, ...data.masters };
        }
    }

    async loadChecklist(taskId = null) {
        const data = await this.orm.call("hk.dashboard", "get_checklist_data", [taskId]);
        if (data.empty) {
            return;
        }
        this.state.demo.checklist = {
            ...data,
            task_id: data.task_id_code || data.task_id,
        };
        this.state.checklistRemarks = data.remarks || "";
        this.state.currentChecklistTaskId = data.task_id;
    }

    async loadVerification() {
        const data = await this.orm.call("hk.dashboard", "get_verification_data", []);
        this.state.demo.verification = data;
        this.state.verifySelected = data.selected || {};
        this.state.supervisorComment = (data.selected && data.selected.comment) || "";
    }

    async loadPerformance() {
        this.state.demo.performance = await this.orm.call("hk.dashboard", "get_performance_data", []);
    }

    toggleMenu() {
        this.state.menuOpen = !this.state.menuOpen;
    }

    closeMenu() {
        this.state.menuOpen = false;
    }

    async selectScreen(screen) {
        this.state.screen = screen;
        this.state.menuOpen = false;
        if (screen === "zone_form") {
            this.state.zoneForm = this._blankZoneForm();
        }
        if (screen === "schedule_form") {
            this.state.scheduleForm = this._blankScheduleForm();
            if (!this.state.masters.activities || !this.state.masters.activities.length) {
                await this.loadSchedule();
            }
        }
        if (screen === "task_form") {
            this.state.taskForm = this._blankTaskForm();
            if (!this.state.masters.zones || !this.state.masters.zones.length) {
                await this.loadTasks();
            }
        }
        if (screen === "zones") {
            await this.loadZones();
        }
        if (screen === "schedule") {
            await this.loadSchedule();
        }
        if (screen === "tasks") {
            await this.loadTasks();
        }
        if (screen === "checklist") {
            await this.loadChecklist();
        }
        if (screen === "verification") {
            await this.loadVerification();
        }
        if (screen === "performance") {
            await this.loadPerformance();
        }
        if (screen === "roster") {
            await this.loadRoster();
        }
        if (screen === "dashboard") {
            await this.loadDashboard();
        }
    }

    toggleRosterFilter() {
        this.state.rosterFilterOpen = !this.state.rosterFilterOpen;
    }

    setRosterFilter(value) {
        this.state.rosterFilter = value;
        this.state.rosterFilterOpen = false;
    }

    setScheduleView(view) {
        this.state.scheduleView = view;
    }

    setScheduleMode(mode) {
        this.state.scheduleForm.mode = mode;
    }

    setTaskMode(mode) {
        this.state.taskForm.mode = mode;
    }

    isZonesActive() {
        return ["zones", "zone_form"].includes(this.state.screen);
    }

    isScheduleActive() {
        return ["schedule", "schedule_form"].includes(this.state.screen);
    }

    isTasksActive() {
        return ["tasks", "task_form"].includes(this.state.screen);
    }

    setTaskTab(tab) {
        this.state.taskTab = tab;
    }

    setVerifyTab(tab) {
        this.state.verifyTab = tab;
    }

    async selectVerifyRow(row) {
        const detail = await this.orm.call("hk.dashboard", "get_verification_detail", [row.id]);
        this.state.verifySelected = detail;
        this.state.supervisorComment = detail.comment || "";
    }

    toggleScheduleDay(day) {
        const days = this.state.scheduleForm.days;
        const index = days.indexOf(day);
        if (index >= 0) {
            days.splice(index, 1);
        } else {
            days.push(day);
        }
    }

    isScheduleDayActive(day) {
        return this.state.scheduleForm.days.includes(day);
    }

    onZoneStaffChange() {
        const staffId = this.state.zoneForm.primary_staff_id;
        this.state.zoneForm.staff_ids = staffId ? [staffId] : [];
    }

    onScheduleZoneChange() {
        const zone = (this.state.masters.zones || []).find((z) => z.id === this.state.scheduleForm.zone_id);
        if (zone) {
            this.state.scheduleForm.building = zone.building || "";
            this.state.scheduleForm.floor = zone.floor || "";
        }
    }

    onScheduleStaffChange() {
        const staffId = this.state.scheduleForm.primary_staff_id;
        this.state.scheduleForm.staff_ids = staffId ? [staffId] : [];
        this.state.scheduleForm.assign_later = !staffId;
    }

    onTaskZoneChange() {
        const zone = (this.state.masters.zones || []).find((z) => z.id === this.state.taskForm.zone_id);
        if (zone) {
            this.state.taskForm.building = zone.building || "";
            this.state.taskForm.floor = zone.floor || "";
        }
    }

    async toggleChecklistItem(sectionId, itemId) {
        const section = this.state.demo.checklist.sections.find((s) => s.id === sectionId);
        if (!section) {
            return;
        }
        const item = section.items.find((i) => i.id === itemId);
        if (!item) {
            return;
        }
        item.done = !item.done;
        section.done = section.items.filter((i) => i.done).length;
        const allItems = this.state.demo.checklist.sections.flatMap((s) => s.items);
        const done = allItems.filter((i) => i.done).length;
        this.state.demo.checklist.done = done;
        this.state.demo.checklist.total = allItems.length;
        this.state.demo.checklist.progress = Math.round((done * 100) / (allItems.length || 1));
        await this.orm.call("hk.dashboard", "action_save_checklist_progress", [
            this.state.currentChecklistTaskId,
            allItems.map((i) => ({ id: i.id, done: i.done })),
            this.state.checklistRemarks,
        ]);
    }

    notify(message, type = "success") {
        this.notification.add(message, { type });
    }

    async saveDraft(entity) {
        try {
            if (entity === "Zone") {
                await this.orm.call("hk.dashboard", "action_save_zone", [this._zoneVals(), true]);
                this.notify("Zone saved as draft.");
                await this.loadZones();
                this.selectScreen("zones");
            } else if (entity === "Schedule") {
                await this.orm.call("hk.dashboard", "action_save_schedule", [this._scheduleVals(), true]);
                this.notify("Schedule saved as draft.");
                await this.loadSchedule();
                this.selectScreen("schedule");
            } else if (entity === "Task") {
                await this.orm.call("hk.dashboard", "action_save_task", [this._taskVals(), true]);
                this.notify("Task saved as draft.");
                await this.loadTasks();
                this.selectScreen("tasks");
            } else if (entity === "Checklist") {
                const allItems = this.state.demo.checklist.sections.flatMap((s) => s.items);
                await this.orm.call("hk.dashboard", "action_save_checklist_progress", [
                    this.state.currentChecklistTaskId,
                    allItems.map((i) => ({ id: i.id, done: i.done })),
                    this.state.checklistRemarks,
                ]);
                this.notify("Checklist progress saved.");
            }
        } catch (error) {
            this.notify(error.data?.message || error.message || "Save failed", "danger");
        }
    }

    async createEntity(entity) {
        try {
            if (entity === "Zone") {
                const res = await this.orm.call("hk.dashboard", "action_save_zone", [this._zoneVals(), false]);
                this.notify(`Zone created (${res.code}).`);
                await this.loadZones();
                this.selectScreen("zones");
            } else if (entity === "Schedule") {
                const res = await this.orm.call("hk.dashboard", "action_save_schedule", [this._scheduleVals(), false]);
                this.notify(`Schedule created (${res.code}).`);
                await Promise.all([this.loadSchedule(), this.loadTasks()]);
                this.selectScreen("schedule");
            } else if (entity === "Task") {
                const res = await this.orm.call("hk.dashboard", "action_save_task", [this._taskVals(), false]);
                this.notify(`Task created (${res.code}).`);
                await this.loadTasks();
                this.selectScreen("tasks");
            }
        } catch (error) {
            this.notify(error.data?.message || error.message || "Create failed", "danger");
        }
    }

    _zoneVals() {
        const f = this.state.zoneForm;
        return {
            name: f.name,
            code: f.code || false,
            building: f.building,
            floor: f.floor,
            area_type: f.area_type,
            frequency: f.frequency,
            priority: f.priority,
            cleaning_type: f.cleaning_type,
            staff_ids: f.staff_ids || [],
        };
    }

    _scheduleVals() {
        const f = this.state.scheduleForm;
        return {
            activity_id: f.activity_id,
            description: f.description,
            zone_id: f.zone_id,
            mode: f.mode,
            frequency: f.frequency,
            days: f.days,
            start_date: f.start_date || false,
            end_date: f.end_date || false,
            time_start: f.time_start,
            time_end: f.time_end,
            staff_ids: f.assign_later ? [] : (f.staff_ids || []),
            shift_id: f.shift_id || false,
            checklist_template_id: f.checklist_template_id || false,
            priority: f.priority,
            instructions: f.instructions,
        };
    }

    _taskVals() {
        const f = this.state.taskForm;
        return {
            mode: f.mode,
            name: f.name,
            activity_id: f.activity_id || false,
            description: f.description,
            zone_id: f.zone_id,
            staff_id: f.staff_id || false,
            shift_id: f.shift_id || false,
            priority: f.priority,
            time_start: f.time_start,
            time_end: f.time_end,
            checklist_template_id: f.checklist_template_id || false,
        };
    }

    async submitChecklist() {
        try {
            await this.orm.call("hk.dashboard", "action_submit_checklist", [
                this.state.currentChecklistTaskId,
                this.state.checklistRemarks,
            ]);
            this.notify("Checklist submitted for verification.");
            await Promise.all([this.loadVerification(), this.loadTasks(), this.loadDashboard()]);
            this.selectScreen("verification");
        } catch (error) {
            this.notify(error.data?.message || error.message || "Submit failed", "danger");
        }
    }

    async approveTask() {
        try {
            const taskId = this.state.verifySelected.id;
            await this.orm.call("hk.dashboard", "action_task_workflow", [taskId, "approve"], {
                comment: this.state.supervisorComment,
            });
            this.notify("Task approved.");
            await Promise.all([this.loadVerification(), this.loadTasks(), this.loadDashboard()]);
        } catch (error) {
            this.notify(error.data?.message || error.message || "Approve failed", "danger");
        }
    }

    async rejectTask() {
        try {
            const taskId = this.state.verifySelected.id;
            await this.orm.call("hk.dashboard", "action_task_workflow", [taskId, "reject"], {
                reason: "inadequate",
                comment: this.state.supervisorComment || "Needs rework",
            });
            this.notify("Task sent for rework.", "warning");
            await Promise.all([this.loadVerification(), this.loadTasks(), this.loadDashboard()]);
        } catch (error) {
            this.notify(error.data?.message || error.message || "Reject failed", "danger");
        }
    }

    async addStaff() {
        const name = window.prompt("Staff name");
        if (!name) {
            return;
        }
        try {
            await this.orm.call("hk.dashboard", "action_create_staff", [{ name }]);
            this.notify("Staff created.");
            await this.loadRoster();
        } catch (error) {
            this.notify(error.data?.message || error.message || "Create staff failed", "danger");
        }
    }

    async assignShiftPrompt() {
        const roster = this.state.roster;
        if (!roster || !roster.masters) {
            return;
        }
        const staffName = window.prompt("Staff name to assign (exact)");
        const staff = (roster.masters.staff || []).find((s) => s.name.toLowerCase() === (staffName || "").toLowerCase());
        if (!staff) {
            this.notify("Staff not found", "warning");
            return;
        }
        const shiftName = window.prompt("Shift name (Morning/Evening/Night)", "Morning");
        const shift = (roster.masters.shifts || []).find((s) => s.name.toLowerCase().includes((shiftName || "").toLowerCase()));
        if (!shift) {
            this.notify("Shift not found", "warning");
            return;
        }
        try {
            await this.orm.call("hk.dashboard", "action_assign_shift", [], {
                staff_id: staff.id,
                shift_id: shift.id,
            });
            this.notify("Shift assigned.");
            await this.loadRoster();
        } catch (error) {
            this.notify(error.data?.message || error.message || "Assign failed", "danger");
        }
    }

    async emergencyAlert() {
        try {
            const res = await this.orm.call("hk.dashboard", "action_emergency_alert", []);
            this.notify(`Emergency alert sent to ${res.sent} user(s).`);
        } catch (error) {
            this.notify(error.data?.message || error.message || "Alert failed", "danger");
        }
    }

    get rosterRows() {
        const roster = this.state.roster;
        const rows = (roster && roster.rows) || [];
        const query = (this.state.rosterSearch || "").trim().toLowerCase();
        return rows.filter((row) => {
            const matchesQuery = !query || row.name.toLowerCase().includes(query) || row.zone.toLowerCase().includes(query);
            const matchesFilter = this.state.rosterFilter === "all" || row.state === this.state.rosterFilter;
            return matchesQuery && matchesFilter;
        });
    }

    get rosterKpis() {
        return this.state.roster && this.state.roster.kpis;
    }

    get kpis() {
        return this.state.data && this.state.data.kpis;
    }

    get summary() {
        return this.state.data && this.state.data.summary;
    }

    get zoneRows() {
        const query = (this.state.zoneSearch || "").trim().toLowerCase();
        const rows = (this.state.demo.zones && this.state.demo.zones.rows) || [];
        return rows.filter((row) =>
            !query || row.name.toLowerCase().includes(query) || (row.building || "").toLowerCase().includes(query)
        );
    }

    get scheduleRows() {
        const query = (this.state.scheduleSearch || "").trim().toLowerCase();
        const rows = (this.state.demo.schedule && this.state.demo.schedule.rows) || [];
        return rows.filter((row) =>
            !query || row.activity.toLowerCase().includes(query) || row.zone.toLowerCase().includes(query)
        );
    }

    get taskRows() {
        const query = (this.state.taskSearch || "").trim().toLowerCase();
        const rows = (this.state.demo.tasks && this.state.demo.tasks.rows) || [];
        return rows.filter((row) => {
            const matchesQuery = !query || row.name.toLowerCase().includes(query) || row.zone.toLowerCase().includes(query);
            const matchesTab = this.state.taskTab === "all" || row.status === this.state.taskTab ||
                (this.state.taskTab === "pending" && ["assigned", "not_started"].includes(row.state || row.status));
            return matchesQuery && matchesTab;
        });
    }

    get verifyRows() {
        const rows = (this.state.demo.verification && this.state.demo.verification.rows) || [];
        return rows.filter((row) => {
            if (this.state.verifyTab === "all") {
                return true;
            }
            if (this.state.verifyTab === "pending") {
                return row.status === "pending";
            }
            if (this.state.verifyTab === "approved") {
                return row.status === "approved";
            }
            return row.status === "rework";
        });
    }
}

registry.category("actions").add("housekeeping_management.dashboard", HousekeepingDashboard, { force: true });
