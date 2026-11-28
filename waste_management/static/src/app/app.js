/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component, onWillStart, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { WM_DEMO } from "./demo_data";

const NAV = [
    { id: "dashboard", label: "Dashboard", icon: "fa-th-large" },
    { id: "entries", label: "Waste Entries", icon: "fa-list-alt" },
    { id: "segregation", label: "Segregation", icon: "fa-random" },
    { id: "schedule", label: "Collection Schedule", icon: "fa-calendar" },
    { id: "pickup", label: "Pickup Tracking", icon: "fa-truck" },
    { id: "vendors", label: "Vendors", icon: "fa-briefcase" },
    { id: "recycling", label: "Recycling", icon: "fa-recycle" },
    { id: "disposal", label: "Disposal", icon: "fa-trash" },
    { id: "compliance", label: "Compliance", icon: "fa-shield" },
    { id: "analytics", label: "Analytics & Reports", icon: "fa-bar-chart" },
];

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export class WasteManagementApp extends Component {
    static template = "waste_management.App";
    static props = ["*"];

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.nav = NAV;
        this.state = useState({
            screen: "dashboard",
            menuOpen: false,
            search: "",
            loading: false,
            entriesTab: "All Entries",
            segregationTab: "Pending Segregation",
            scheduleView: "List",
            demo: deepClone(WM_DEMO),
            entryForm: this._blankEntryForm(),
            segregationForm: this._blankSegregationForm(),
            scheduleForm: this._blankScheduleForm(),
            vendorForm: this._blankVendorForm(),
            recyclingForm: this._blankRecyclingForm(),
            disposalForm: this._blankDisposalForm(),
            complianceForm: this._blankComplianceForm(),
            selectedEntry: null,
            selectedVendor: null,
            vendorTab: "overview",
            selectedScheduleWaste: [],
            readyEntries: [],
        });
        onWillStart(async () => {
            await this.refreshAll();
        });
    }

    get d() {
        return this.state.demo;
    }

    get screenMeta() {
        const map = {
            dashboard: { title: this.d.dashboard.title, subtitle: this.d.dashboard.subtitle },
            entries: { title: this.d.entries.title, subtitle: this.d.entries.subtitle },
            entry_create: {
                title: "Add Waste Entry",
                subtitle: "Record waste generation details, classification, quantity, location and processing information.",
            },
            entry_detail: {
                title: "Waste Entry Details",
                subtitle: this.state.selectedEntry
                    ? `${this.state.selectedEntry.code} · ${this.state.selectedEntry.location || this.state.selectedEntry.site}`
                    : "",
            },
            segregation: { title: this.d.segregation.title, subtitle: this.d.segregation.subtitle },
            segregation_create: {
                title: "Start Segregation",
                subtitle: "Classify waste entry quantities and verify segregation before collection.",
            },
            schedule: { title: this.d.schedule.title, subtitle: this.d.schedule.subtitle },
            schedule_create: {
                title: "Schedule Waste Collection",
                subtitle: "Select segregated waste, set details, assign resources and confirm schedule.",
            },
            pickup: { title: this.d.pickup.title, subtitle: this.d.pickup.subtitle },
            vendors: { title: this.d.vendors.title, subtitle: this.d.vendors.subtitle },
            vendor_create: {
                title: "Add Vendor",
                subtitle: "Register a waste contractor with services, sites and compliance details.",
            },
            vendor_detail: {
                title: this.state.selectedVendor?.name || this.d.vendorDetail.name,
                subtitle: "Complete vendor profile, compliance, contract and performance information.",
            },
            recycling: { title: this.d.recycling.title, subtitle: this.d.recycling.subtitle },
            recycling_create: {
                title: "Add Recycling Record",
                subtitle: "Capture recyclable waste receipt, processing method and outcome.",
            },
            disposal: { title: this.d.disposal.title, subtitle: this.d.disposal.subtitle },
            disposal_create: {
                title: "Add Disposal Record",
                subtitle: "Create disposal request with method, vendor, schedule and documentation.",
            },
            compliance: { title: this.d.compliance.title, subtitle: this.d.compliance.subtitle },
            compliance_create: {
                title: "Add Compliance",
                subtitle: "Create a compliance requirement with authority, dates and documents.",
            },
            analytics: { title: this.d.analytics.title, subtitle: this.d.analytics.subtitle },
            settings: { title: this.d.settings.title, subtitle: this.d.settings.subtitle },
            audit: { title: this.d.audit.title, subtitle: this.d.audit.subtitle },
        };
        return map[this.state.screen] || { title: "Waste Management", subtitle: "" };
    }

    async _call(method, args = []) {
        return this.orm.call("wm.dashboard", method, args);
    }

    _unwrap(result) {
        if (result && typeof result === "object" && "success" in result) {
            if (!result.success) {
                throw new Error(result.message || "Operation failed");
            }
            return result.data;
        }
        return result;
    }

    async refreshAll() {
        this.state.loading = true;
        try {
            const boot = await this._call("get_bootstrap", []);
            if (!boot) {
                return;
            }
            this._applyDashboard(boot.dashboard || {});
            this._applyEntries(boot.entries || {});
            this._applySegregation(boot.segregation || {});
            this._applySchedule(boot.schedule || {});
            this._applyPickup(boot.pickup || {});
            this._applyVendors(boot.vendors || {});
            this._applyRecycling(boot.recycling || {});
            this._applyDisposal(boot.disposal || {});
            this._applyCompliance(boot.compliance || {});
            this._applyAnalytics(boot.analytics || {});
            this._applyAudit(boot.audit || {});
            if (boot.settings && boot.settings.sections) {
                this.state.demo.settings.sections = boot.settings.sections;
            }
        } catch (error) {
            console.error(error);
            this.notification.add("Could not load live waste data; showing cached design data.", { type: "warning" });
        } finally {
            this.state.loading = false;
        }
    }

    _applyDashboard(data) {
        if (!data) {
            return;
        }
        if (data.kpi_cards) {
            this.state.demo.dashboard.kpis = data.kpi_cards;
        }
        if (data.trend) {
            this.state.demo.dashboard.trend = data.trend;
        }
        if (data.categories) {
            this.state.demo.dashboard.categories = data.categories;
        }
        if (typeof data.efficiency === "number") {
            this.state.demo.dashboard.efficiency = data.efficiency;
        }
        if (data.recent) {
            this.state.demo.dashboard.recent = data.recent;
        }
        if (data.alerts) {
            this.state.demo.dashboard.alerts = data.alerts;
        }
        if (data.upcoming) {
            this.state.demo.dashboard.upcoming = data.upcoming;
        }
        this.state.demo.dashboard.alertCount = data.alertCount || (data.alerts || []).length;
    }

    _applyEntries(data) {
        if (data.kpis) {
            this.state.demo.entries.kpis = data.kpis;
        }
        if (data.steps) {
            this.state.demo.entries.steps = data.steps;
        }
        if (data.rows) {
            this.state.demo.entries.rows = data.rows;
        }
        if (data.activity) {
            this.state.demo.entries.activity = data.activity;
        }
        if (data.categoryBars) {
            this.state.demo.entries.categoryBars = data.categoryBars;
        }
        if (data.pageInfo) {
            this.state.demo.entries.pageInfo = data.pageInfo;
        }
    }

    _applySegregation(data) {
        if (data.kpis) {
            this.state.demo.segregation.kpis = data.kpis;
        }
        if (data.pipeline) {
            this.state.demo.segregation.pipeline = data.pipeline;
        }
        if (data.rows) {
            this.state.demo.segregation.rows = data.rows;
        }
        if (data.pageInfo) {
            this.state.demo.segregation.pageInfo = data.pageInfo;
        }
    }

    _applySchedule(data) {
        if (data.kpis) {
            this.state.demo.schedule.kpis = data.kpis;
        }
        if (data.pipeline) {
            this.state.demo.schedule.pipeline = data.pipeline;
        }
        if (data.rows) {
            this.state.demo.schedule.rows = data.rows;
        }
        if (data.pageInfo) {
            this.state.demo.schedule.pageInfo = data.pageInfo;
        }
        if (data.ready_entries) {
            this.state.readyEntries = data.ready_entries;
            if (!this.state.selectedScheduleWaste.length && data.ready_entries.length) {
                this.state.selectedScheduleWaste = [data.ready_entries[0].code];
            }
        }
    }

    _applyPickup(data) {
        if (data.kpis) {
            this.state.demo.pickup.kpis = data.kpis;
        }
        if (data.rows) {
            this.state.demo.pickup.rows = data.rows;
        }
    }

    _applyVendors(data) {
        if (data.kpis) {
            this.state.demo.vendors.kpis = data.kpis;
        }
        if (data.rows) {
            this.state.demo.vendors.rows = data.rows;
        }
    }

    _applyRecycling(data) {
        if (data.kpis) {
            this.state.demo.recycling.kpis = data.kpis;
        }
        if (data.rows) {
            this.state.demo.recycling.rows = data.rows;
        }
    }

    _applyDisposal(data) {
        if (data.kpis) {
            this.state.demo.disposal.kpis = data.kpis;
        }
        if (data.rows) {
            this.state.demo.disposal.rows = data.rows;
        }
    }

    _applyCompliance(data) {
        if (data.kpis) {
            this.state.demo.compliance.kpis = data.kpis;
        }
        if (data.rows) {
            this.state.demo.compliance.rows = data.rows;
        }
    }

    _applyAnalytics(data) {
        if (data.kpis) {
            this.state.demo.analytics.kpis = data.kpis;
        }
        if (data.reports) {
            this.state.demo.analytics.reports = data.reports;
        }
    }

    _applyAudit(data) {
        if (data.kpis) {
            this.state.demo.audit.kpis = data.kpis;
        }
        if (data.rows) {
            this.state.demo.audit.rows = data.rows;
        }
    }

    isNavActive(id) {
        const aliases = {
            entries: ["entry_create", "entry_detail"],
            segregation: ["segregation_create"],
            schedule: ["schedule_create"],
            vendors: ["vendor_create", "vendor_detail"],
            recycling: ["recycling_create"],
            disposal: ["disposal_create"],
            compliance: ["compliance_create"],
        };
        if (aliases[id] && aliases[id].includes(this.state.screen)) {
            return true;
        }
        return this.state.screen === id;
    }

    go(screen) {
        this.state.screen = screen;
        this.state.menuOpen = false;
        this.state.search = "";
    }

    toggleMenu() {
        this.state.menuOpen = !this.state.menuOpen;
    }

    notify(message, type = "success") {
        this.notification.add(message, { type });
    }

    filterRows(rows, fields) {
        const q = (this.state.search || "").trim().toLowerCase();
        if (!q) {
            return rows;
        }
        return rows.filter((row) => fields.some((f) => String(row[f] || "").toLowerCase().includes(q)));
    }

    get entryRows() {
        let rows = this.d.entries.rows;
        const tab = this.state.entriesTab;
        if (tab === "Pending Segregation") {
            rows = rows.filter((r) => r.segregationKey === "warn" || r.state === "pending_segregation");
        } else if (tab === "Pending Collection") {
            rows = rows.filter((r) => r.collectionKey === "warn");
        } else if (tab === "High Priority") {
            rows = rows.filter((r) => r.priorityKey === "bad");
        } else if (tab === "Hazardous Waste") {
            rows = rows.filter((r) => r.hazardous || String(r.category).toLowerCase().includes("hazard"));
        } else if (tab === "Recyclable Waste") {
            rows = rows.filter((r) => /dry|recycl|plastic/i.test(String(r.category)));
        }
        return this.filterRows(rows, ["code", "site", "location", "category", "type"]);
    }

    get segregationKpisPrimary() {
        return this.d.segregation.kpis.slice(0, 4);
    }

    get segregationKpisSecondary() {
        return this.d.segregation.kpis.slice(4);
    }

    get segregationRows() {
        let rows = this.d.segregation.rows;
        const tab = this.state.segregationTab;
        if (tab === "Pending Segregation") {
            rows = rows.filter((r) => r.statusKey === "warn");
        } else if (tab === "High Priority") {
            rows = rows.filter((r) => r.priorityKey === "bad");
        } else if (tab === "Hazardous") {
            rows = rows.filter((r) => String(r.category).toLowerCase().includes("hazard"));
        } else if (tab === "My Assignments") {
            rows = rows.filter((r) => r.assignee);
        }
        return this.filterRows(rows, ["code", "site", "location", "category", "type", "assignee"]);
    }

    get scheduleRows() {
        return this.filterRows(this.d.schedule.rows, ["code", "entry", "site", "vendor", "type"]);
    }

    get pickupRows() {
        return this.filterRows(this.d.pickup.rows, ["code", "collection", "vendor", "driver", "site"]);
    }

    get vendorRows() {
        return this.filterRows(this.d.vendors.rows, ["code", "name", "contact", "services"]);
    }

    get recyclingRows() {
        return this.filterRows(this.d.recycling.rows, ["code", "source", "type", "vendor"]);
    }

    get disposalRows() {
        return this.filterRows(this.d.disposal.rows, ["code", "source", "type", "vendor"]);
    }

    get complianceRows() {
        return this.filterRows(this.d.compliance.rows, ["code", "name", "authority", "site"]);
    }

    get auditRows() {
        return this.filterRows(this.d.audit.rows, ["user", "module", "activity", "record"]);
    }

    get scheduleSelectedTotal() {
        const map = {};
        for (const e of this.state.readyEntries || []) {
            map[e.code] = e.qty || 0;
            map[e.id] = e.qty || 0;
        }
        return this.state.selectedScheduleWaste.reduce((sum, id) => sum + (map[id] || 0), 0);
    }

    badgeClass(key) {
        const map = {
            ok: "wm-pill wm-pill-ok",
            active: "wm-pill wm-pill-ok",
            collected: "wm-pill wm-pill-ok",
            completed: "wm-pill wm-pill-ok",
            verified: "wm-pill wm-pill-ok",
            done: "wm-pill wm-pill-ok",
            compliant: "wm-pill wm-pill-ok",
            warn: "wm-pill wm-pill-warn",
            pending: "wm-pill wm-pill-warn",
            expiring: "wm-pill wm-pill-warn",
            delayed: "wm-pill wm-pill-warn",
            "in progress": "wm-pill wm-pill-info",
            bad: "wm-pill wm-pill-bad",
            critical: "wm-pill wm-pill-bad",
            overdue: "wm-pill wm-pill-bad",
            expired: "wm-pill wm-pill-bad",
            rejected: "wm-pill wm-pill-bad",
            suspended: "wm-pill wm-pill-bad",
            info: "wm-pill wm-pill-info",
            scheduled: "wm-pill wm-pill-info",
            "en route": "wm-pill wm-pill-info",
            processing: "wm-pill wm-pill-info",
            purple: "wm-pill wm-pill-purple",
        };
        return map[String(key || "").toLowerCase()] || "wm-pill";
    }

    categoryDot(key) {
        return `wm-dot ${key || "info"}`;
    }

    openCreateEntry() {
        this.state.entryForm = this._blankEntryForm();
        this.state.screen = "entry_create";
    }

    openCreateSegregation(row = null) {
        this.state.segregationForm = this._blankSegregationForm(row);
        this.state.screen = "segregation_create";
    }

    openBulkSegregation() {
        this.notify("Select pending entries, then use Start Segregation for each record.", "info");
        this.state.segregationTab = "Pending Segregation";
        this.go("segregation");
    }

    openCreateSchedule() {
        this.state.scheduleForm = this._blankScheduleForm();
        if (this.state.readyEntries.length) {
            this.state.selectedScheduleWaste = [this.state.readyEntries[0].code];
        } else {
            this.state.selectedScheduleWaste = [];
        }
        this.state.screen = "schedule_create";
    }

    openCreateVendor() {
        this.state.vendorForm = this._blankVendorForm();
        this.state.screen = "vendor_create";
    }

    openCreateRecycling() {
        this.state.recyclingForm = this._blankRecyclingForm();
        this.state.screen = "recycling_create";
    }

    openCreateDisposal() {
        this.state.disposalForm = this._blankDisposalForm();
        this.state.screen = "disposal_create";
    }

    openCreateCompliance() {
        this.state.complianceForm = this._blankComplianceForm();
        this.state.screen = "compliance_create";
    }

    async openEntryDetail(row) {
        this.state.selectedEntry = row;
        this.state.screen = "entry_detail";
        if (row?.id) {
            try {
                const data = this._unwrap(await this._call("get_entry_detail", [row.id]));
                if (data) {
                    this.state.selectedEntry = { ...row, ...data };
                }
            } catch (error) {
                console.error(error);
            }
        }
    }

    async openVendorDetail(row) {
        this.state.selectedVendor = row || this.d.vendors.rows[0];
        this.state.vendorTab = "overview";
        this.state.screen = "vendor_detail";
        if (this.state.selectedVendor?.id) {
            try {
                const data = this._unwrap(await this._call("get_vendor_detail", [this.state.selectedVendor.id]));
                if (data) {
                    this.state.selectedVendor = { ...this.state.selectedVendor, ...data };
                    this.state.demo.vendorDetail = {
                        ...this.state.demo.vendorDetail,
                        ...data,
                        name: data.name,
                        code: data.code,
                        status: (data.status || "").toUpperCase(),
                        rating: `${data.rating || 0} / 5`,
                        contact: data.contact,
                        phone: data.phone,
                        email: data.email,
                    };
                }
            } catch (error) {
                console.error(error);
            }
        }
    }

    editSelectedVendor() {
        const v = this.state.selectedVendor || this.d.vendors.rows[0];
        this.state.vendorForm = {
            id: v.id || false,
            name: v.name || "",
            contact: v.contact || "",
            phone: v.phone || "",
            email: v.email || "",
            services: v.services || "",
            sites: Array.isArray(v.sites) ? v.sites.join(", ") : v.sites || "",
            notes: "",
        };
        this.state.screen = "vendor_create";
    }

    setScheduleView(view) {
        this.state.scheduleView = view;
        if (view === "Calendar") {
            this.notify("Calendar view ready — showing schedule list with calendar filter applied.", "info");
        } else if (view === "Timeline") {
            this.notify("Timeline view ready — showing schedule pipeline.", "info");
        }
        this.go("schedule");
    }

    openBulkSchedule() {
        this.notify("Bulk schedule: select multiple ready entries, then confirm vendor and time window.", "info");
        this.openCreateSchedule();
    }

    async refreshPickup() {
        try {
            this._applyPickup(await this._call("get_pickup_data", [{}]));
            this.notify("Pickup tracking refreshed", "success");
        } catch (error) {
            this.notify(error.message || "Refresh failed", "danger");
        }
        this.go("pickup");
    }

    async exportData(label = "Export") {
        try {
            await this._call("get_report_data", ["summary", {}]);
            this.notify(`${label} prepared from live data`, "success");
        } catch (error) {
            this.notify(error.message || "Export failed", "danger");
        }
    }

    async generateReport(name) {
        try {
            const key = (name || "").toLowerCase().includes("recycl")
                ? "recycling"
                : (name || "").toLowerCase().includes("dispos")
                  ? "disposal"
                  : (name || "").toLowerCase().includes("vendor")
                    ? "vendors"
                    : (name || "").toLowerCase().includes("compliance")
                      ? "compliance"
                      : (name || "").toLowerCase().includes("audit")
                        ? "audit"
                        : "summary";
            await this._call("get_report_data", [key, {}]);
            this.notify(`Report generated: ${name || "Selected report"}`, "success");
        } catch (error) {
            this.notify(error.message || "Report failed", "danger");
        }
    }

    async saveSettings() {
        try {
            this._unwrap(await this._call("save_settings", [{}]));
            this.notify("Settings saved successfully", "success");
        } catch (error) {
            this.notify(error.message || "Could not save settings", "danger");
        }
    }

    toggleScheduleWaste(id) {
        const selected = [...this.state.selectedScheduleWaste];
        const idx = selected.indexOf(id);
        if (idx >= 0) {
            selected.splice(idx, 1);
        } else {
            selected.push(id);
        }
        this.state.selectedScheduleWaste = selected;
    }

    isScheduleWasteSelected(id) {
        return this.state.selectedScheduleWaste.includes(id);
    }

    _blankEntryForm() {
        return {
            date: todayISO(),
            time: nowTime(),
            site: "HQ Corporate Campus",
            building: "Building A - Main Office",
            floor: "3rd Floor",
            location: "",
            source: "Housekeeping",
            category: "Dry Recyclable",
            waste_type: "Cardboard / Paper",
            description: "",
            hazardous: false,
            amount: "",
            unit: "Kilograms (kg)",
            vendor: "",
        };
    }

    _blankSegregationForm(row = null) {
        return {
            entry_id: row?.code || row?.entry_id || "",
            entry_db_id: row?.entry_id || row?.id || false,
            category: row?.category || "Hazardous",
            original_qty: row?.qty || row?.original || "",
            dry_qty: "",
            wet_qty: "",
            hazardous_qty: "",
            residual_qty: "",
            assignee: "Housekeeping",
            notes: "",
            location: row?.location || "Waste Room",
        };
    }

    _blankScheduleForm() {
        return {
            date: todayISO(),
            time_from: "10:00",
            time_to: "11:00",
            site: "Tower A, Loading Dock 1",
            vendor: "",
            priority: "High",
            notes: "",
        };
    }

    _blankVendorForm() {
        return {
            id: false,
            name: "",
            contact: "",
            phone: "",
            email: "",
            services: "",
            sites: "Site Alpha",
            notes: "",
        };
    }

    _blankRecyclingForm() {
        return {
            source: "",
            type: "Paper",
            received: "",
            method: "Baling",
            vendor: "",
            notes: "",
        };
    }

    _blankDisposalForm() {
        return {
            source: "",
            type: "Hazardous Chemical",
            qty: "",
            method: "Incineration",
            vendor: "",
            cost: "",
            notes: "",
        };
    }

    _blankComplianceForm() {
        return {
            name: "",
            authority: "SPCB",
            site: "Site Alpha",
            expiry: "",
            owner: "Compliance Officer",
            priority: "High",
            notes: "",
        };
    }

    async saveEntry(asDraft = true) {
        const f = this.state.entryForm;
        if (!f.date || !f.time || !f.location) {
            this.notify("Date, time and specific location are required", "warning");
            return;
        }
        if (!f.amount || Number(f.amount) <= 0) {
            this.notify("Quantity must be greater than zero", "warning");
            return;
        }
        try {
            const result = this._unwrap(
                await this._call("create_entry", [
                    {
                        date: f.date,
                        time: f.time,
                        site: f.site,
                        building: f.building,
                        floor: f.floor,
                        location: f.location,
                        source: f.source,
                        category: f.category,
                        waste_type: f.waste_type,
                        description: f.description,
                        hazardous: !!f.hazardous,
                        amount: f.amount,
                        vendor: f.vendor,
                        as_draft: asDraft,
                    },
                ])
            );
            this.notify(asDraft ? "Waste entry saved as draft" : "Waste entry submitted", "success");
            this._applyEntries(await this._call("get_entries_data", [{}]));
            this._applyDashboard(await this._call("get_dashboard_data", [{}]));
            this.go("entries");
            return result;
        } catch (error) {
            this.notify(error.message || "Could not save entry", "danger");
        }
    }

    async saveSegregation() {
        const f = this.state.segregationForm;
        if (!f.entry_id || !f.original_qty) {
            this.notify("Entry ID and original quantity are required", "warning");
            return;
        }
        const dry = parseFloat(f.dry_qty || 0);
        const wet = parseFloat(f.wet_qty || 0);
        const haz = parseFloat(f.hazardous_qty || 0);
        const residual = parseFloat(f.residual_qty || 0);
        const total = dry + wet + haz + residual;
        const original = parseFloat(String(f.original_qty).replace(/[^\d.]/g, "")) || 0;
        if (total > original && original > 0) {
            this.notify("Segregated quantity cannot exceed original quantity", "danger");
            return;
        }
        try {
            this._unwrap(
                await this._call("create_segregation", [
                    {
                        entry_id: f.entry_db_id || f.entry_id,
                        original_qty: original,
                        dry_qty: dry,
                        wet_qty: wet,
                        hazardous_qty: haz,
                        residual_qty: residual,
                        assignee: f.assignee,
                        notes: f.notes,
                        location: f.location,
                        start: true,
                    },
                ])
            );
            this.notify("Segregation started successfully", "success");
            this._applySegregation(await this._call("get_segregation_data", [{}]));
            this._applyEntries(await this._call("get_entries_data", [{}]));
            this.go("segregation");
        } catch (error) {
            this.notify(error.message || "Could not start segregation", "danger");
        }
    }

    async saveSchedule() {
        const f = this.state.scheduleForm;
        if (!this.state.selectedScheduleWaste.length) {
            this.notify("Select at least one segregated waste entry", "warning");
            return;
        }
        if (!f.date || !f.vendor) {
            this.notify("Date and vendor are required", "warning");
            return;
        }
        try {
            this._unwrap(
                await this._call("create_schedule", [
                    {
                        selected: this.state.selectedScheduleWaste,
                        date: f.date,
                        time_from: f.time_from,
                        time_to: f.time_to,
                        site: f.site,
                        vendor: f.vendor,
                        priority: f.priority,
                        notes: f.notes,
                        quantity: this.scheduleSelectedTotal || undefined,
                        confirm: true,
                    },
                ])
            );
            this.notify("Collection scheduled successfully", "success");
            this._applySchedule(await this._call("get_schedule_data", [{}]));
            this._applyPickup(await this._call("get_pickup_data", [{}]));
            this.go("schedule");
        } catch (error) {
            this.notify(error.message || "Could not schedule collection", "danger");
        }
    }

    async saveVendor() {
        const f = this.state.vendorForm;
        if (!f.name || !f.contact) {
            this.notify("Vendor name and contact person are required", "warning");
            return;
        }
        try {
            if (f.id) {
                this._unwrap(
                    await this._call("update_vendor", [
                        f.id,
                        {
                            name: f.name,
                            phone: f.phone,
                            email: f.email,
                            services: f.services || "General",
                            notes: f.notes,
                        },
                    ])
                );
            } else {
                this._unwrap(
                    await this._call("create_vendor", [
                        {
                            name: f.name,
                            contact: f.contact,
                            phone: f.phone,
                            email: f.email,
                            services: f.services || "General",
                            sites: f.sites,
                            notes: f.notes,
                        },
                    ])
                );
            }
            this.notify("Vendor saved successfully", "success");
            this._applyVendors(await this._call("get_vendors_data", [{}]));
            this.go("vendors");
        } catch (error) {
            this.notify(error.message || "Could not save vendor", "danger");
        }
    }

    async saveRecycling() {
        const f = this.state.recyclingForm;
        if (!f.source || !f.received) {
            this.notify("Source and received quantity are required", "warning");
            return;
        }
        try {
            this._unwrap(
                await this._call("create_recycling", [
                    {
                        source: f.source,
                        type: f.type,
                        received: f.received,
                        method: f.method,
                        vendor: f.vendor,
                        notes: f.notes,
                    },
                ])
            );
            this.notify("Recycling record created", "success");
            this._applyRecycling(await this._call("get_recycling_data", [{}]));
            this.go("recycling");
        } catch (error) {
            this.notify(error.message || "Could not create recycling record", "danger");
        }
    }

    async saveDisposal() {
        const f = this.state.disposalForm;
        if (!f.source || !f.qty) {
            this.notify("Source and quantity are required", "warning");
            return;
        }
        try {
            this._unwrap(
                await this._call("create_disposal", [
                    {
                        source: f.source,
                        type: f.type,
                        qty: f.qty,
                        method: f.method,
                        vendor: f.vendor,
                        cost: f.cost,
                        notes: f.notes,
                    },
                ])
            );
            this.notify("Disposal record created", "success");
            this._applyDisposal(await this._call("get_disposal_data", [{}]));
            this.go("disposal");
        } catch (error) {
            this.notify(error.message || "Could not create disposal record", "danger");
        }
    }

    async saveCompliance() {
        const f = this.state.complianceForm;
        if (!f.name || !f.expiry) {
            this.notify("Compliance name and expiry date are required", "warning");
            return;
        }
        try {
            this._unwrap(
                await this._call("create_compliance", [
                    {
                        name: f.name,
                        authority: f.authority,
                        site: f.site,
                        expiry: f.expiry,
                        notes: f.notes,
                    },
                ])
            );
            this.notify("Compliance record created", "success");
            this._applyCompliance(await this._call("get_compliance_data", [{}]));
            this.go("compliance");
        } catch (error) {
            this.notify(error.message || "Could not create compliance record", "danger");
        }
    }

    barHeight(value, max = 500) {
        return `${Math.max(8, Math.round((value / max) * 140))}px`;
    }
}

registry.category("actions").add("waste_management.app", WasteManagementApp, { force: true });
