/** @odoo-module **/
/**
 * In-Odoo Helpdesk UI. Screens call `fms.helpdesk.ui` through session ORM RPC.
 * External Mobile Helpdesk clients use `/fms/helpdesk/api/v1/*` instead
 * (see Document/Helpdesk_API.md). Do not reimplement routing/SLA here.
 */

import { Component, onMounted, onWillStart, onWillUnmount, onWillUpdateProps, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

// Nav follows real user workflow: configure once → daily work → close loop → reports.
const NAV = [
    { section: "1. SETUP" },
    { id: "teams", label: "Support Teams", icon: "fa-users" },
    { id: "categories", label: "Categories", icon: "fa-th" },
    { id: "routing", label: "Routing Rules", icon: "fa-random" },
    { id: "sla", label: "Priority & SLA", icon: "fa-clock-o" },
    { section: "2. WORK" },
    { id: "dashboard", label: "Dashboard", icon: "fa-th-large" },
    { id: "complaints", label: "Complaints", icon: "fa-exclamation-triangle" },
    { id: "my_complaints", label: "My Complaints", icon: "fa-user" },
    { id: "work_queue", label: "Work Queue", icon: "fa-briefcase" },
    { id: "assignments", label: "Assignments", icon: "fa-user-plus" },
    { id: "escalations", label: "Escalations", icon: "fa-level-up" },
    { section: "3. CLOSE" },
    { id: "resolution", label: "Resolution & Closure", icon: "fa-check-circle" },
    { id: "feedback", label: "Feedback", icon: "fa-commenting-o" },
    { section: "4. REPORTS" },
    { id: "reports", label: "Reports & Analytics", icon: "fa-bar-chart" },
];

const TITLES = {
    dashboard: "Dashboard",
    complaints: "Complaints",
    create: "Create Complaint",
    my_complaints: "My Complaints",
    work_queue: "Work Queue",
    assignments: "Assignments",
    teams: "Support Teams",
    categories: "Categories & Routing Rules",
    routing: "Routing Rules",
    sla: "Priority & SLA",
    escalations: "Escalations",
    resolution: "Resolution & Closure",
    feedback: "Feedback",
    reports: "Reports & Analytics",
    ticket: "Complaint Details",
    settings: "Settings",
};

const TABS = {
    work_queue: "mine",
    assignments: "unassigned",
    sla: "levels",
    escalations: "needs",
    resolution: "needs",
    feedback: "pending",
};

export class FmsHelpdeskApp extends Component {
    static template = "fms_helpdesk.HelpdeskApp";
    static props = { "*": true };

    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.navItems = NAV;
        this.state = useState({
            screen: this._screenFromProps(this.props),
            ticketId: this.props.action?.context?.ticket_id || false,
            loading: true,
            error: "",
            bootstrap: { user: {}, app_name: "FMS Helpdesk", masters: { categories: [], priorities: [], teams: [], users: [], sla_policies: [], escalation_levels: [] } },
            data: {},
            filters: {},
            form: this._emptyCreateForm(),
            preview: {},
            residents: [],
            modal: null,
            modalVals: {},
            tab: "mine",
            selectedCategoryId: false,
            globalSearch: "",
            datePreset: "all",
            page: 1,
            slaSettings: { at_risk: 80, critical_warning: 90, pause_awaiting: true, pause_vendor: true },
            simulator: false,
            mobileNavOpen: false,
        });
        this._onResizeCloseNav = () => {
            if (window.innerWidth > 992 && this.state.mobileNavOpen) {
                this.state.mobileNavOpen = false;
            }
        };
        this._onEscCloseNav = (ev) => {
            if (ev.key === "Escape" && this.state.mobileNavOpen) {
                this.state.mobileNavOpen = false;
            }
        };
        onMounted(() => {
            document.body.classList.add("o_fms_hd_open");
            window.addEventListener("resize", this._onResizeCloseNav);
            window.addEventListener("keydown", this._onEscCloseNav);
        });
        onWillUnmount(() => {
            document.body.classList.remove("o_fms_hd_open");
            window.removeEventListener("resize", this._onResizeCloseNav);
            window.removeEventListener("keydown", this._onEscCloseNav);
        });
        onWillStart(() => this._boot());
        onWillUpdateProps((next) => {
            const screen = this._screenFromProps(next);
            const ticketId = next.action?.context?.ticket_id || false;
            if (screen !== this.state.screen || ticketId !== this.state.ticketId) {
                this.state.screen = screen;
                this.state.ticketId = ticketId;
                return this.reload();
            }
        });
    }

    get masters() {
        return this.state.bootstrap.masters || { categories: [], priorities: [], teams: [], users: [], sla_policies: [], escalation_levels: [] };
    }

    get screenTitle() {
        return TITLES[this.state.screen] || "Helpdesk";
    }

    get userInitial() {
        const name = this.state.bootstrap.user?.name || "U";
        return name.charAt(0).toUpperCase();
    }

    get userName() {
        return this.state.bootstrap.user?.name || "";
    }

    get userLogin() {
        return this.state.bootstrap.user?.login || "";
    }

    get isAdmin() {
        return Boolean(this.state.bootstrap.user?.is_admin);
    }

    async confirmDelete(message) {
        return window.confirm(message);
    }

    async deleteRecord(method, id, label, afterScreen = null) {
        if (!this.isAdmin) {
            this.notification.add("Only Helpdesk Administrators can delete records.", { type: "danger" });
            return;
        }
        if (!id) {
            return;
        }
        const ok = await this.confirmDelete(`Delete ${label || "this record"}? This cannot be undone.`);
        if (!ok) {
            return;
        }
        try {
            const result = await this.orm.call("fms.helpdesk.ui", method, [Number(id)]);
            this.notification.add(`${result?.name || label || "Record"} deleted.`, { type: "success" });
            this.state.bootstrap = await this.orm.call("fms.helpdesk.ui", "bootstrap", []);
            if (afterScreen) {
                this.setScreen(afterScreen);
            } else {
                this.reload();
            }
        } catch (error) {
            this.notification.add(error.data?.message || error.message, { type: "danger" });
        }
    }

    deleteTicket(ev) {
        ev?.stopPropagation?.();
        const id = Number(ev?.currentTarget?.dataset?.id) || this.state.ticketId;
        this.deleteRecord("delete_ticket", id, "this complaint", "complaints");
    }

    deleteTeam(ev) {
        ev.stopPropagation();
        this.deleteRecord("delete_team", Number(ev.currentTarget.dataset.id), "this support team");
    }

    deleteCategory(ev) {
        ev.stopPropagation();
        this.deleteRecord("delete_category", Number(ev.currentTarget.dataset.id), "this category");
    }

    deleteRule(ev) {
        ev.stopPropagation();
        this.deleteRecord("delete_routing_rule", Number(ev.currentTarget.dataset.id), "this routing rule");
    }

    deleteSlaPolicy(ev) {
        ev.stopPropagation();
        this.deleteRecord("delete_sla_policy", Number(ev.currentTarget.dataset.id), "this SLA policy");
    }

    deletePriority(ev) {
        ev.stopPropagation();
        this.deleteRecord("delete_priority", Number(ev.currentTarget.dataset.id), "this priority level");
    }

    get headerSearchPlaceholder() {
        if (this.state.screen === "routing") {
            return "Search rules...";
        }
        if (this.state.screen === "categories") {
            return "Search categories...";
        }
        if (this.state.screen === "sla") {
            return "Search SLAs, policies...";
        }
        if (this.state.screen === "escalations") {
            return "Search tickets...";
        }
        if (this.state.screen === "resolution") {
            return "Search complaint ID, title...";
        }
        return "Global search...";
    }

    get slaTracker() {
        return this.state.simulator || null;
    }

    get responseBar() {
        return (this.slaTracker && this.slaTracker.response_bar) || {};
    }

    get resolutionBar() {
        return (this.slaTracker && this.slaTracker.resolution_bar) || {};
    }

    isSlaTab(name) {
        return (this.state.tab || "levels") === name;
    }

    slaBarStyle(bar) {
        const pct = Math.max(0, Math.min(100, parseInt(bar && bar.pct, 10) || 0));
        return "width:" + pct + "%";
    }

    thresholdStyle(pct) {
        return "width:" + (parseInt(pct, 10) || 0) + "%";
    }

    slaPauseOn(key) {
        return Boolean(this.state.slaSettings && this.state.slaSettings[key]);
    }

    toggleSlaPause(ev) {
        const key = ev.currentTarget.dataset.key;
        this.state.slaSettings[key] = !this.state.slaSettings[key];
    }

    get routingTableTitle() {
        const n = this.kpi("active");
        return "Active Routing Rules (" + n + " active)";
    }

    get starLevels() {
        return [5, 4, 3, 2, 1];
    }

    isPriority(id) {
        return String(this.state.form.priority_id || "") === String(id);
    }

    starText(rating) {
        const n = parseInt(rating, 10) || 0;
        return "★".repeat(Math.max(0, Math.min(5, n)));
    }

    get currentSubs() {
        const id = Number(this.state.form.category_id || 0);
        return (this.masters.categories.find((c) => c.id === id) || {}).subcategories || [];
    }

    get modalSubs() {
        const id = Number(this.state.modalVals.category_id || 0);
        return (this.masters.categories.find((c) => c.id === id) || {}).subcategories || [];
    }

    get selectedCategory() {
        const rows = this.state.data.categories || [];
        if (!rows.length) {
            return null;
        }
        return rows.find((c) => String(c.id) === String(this.state.selectedCategoryId || "")) || rows[0];
    }

    get selectedRuleCount() {
        return (this.selectedCategory && this.selectedCategory.rules || []).length;
    }

    kpi(name) {
        const kpis = this.state.data.kpis || this.state.data || {};
        return kpis[name] ?? 0;
    }

    get pagedTickets() {
        const rows = this.state.data.tickets || [];
        const start = ((this.state.page || 1) - 1) * 5;
        return rows.slice(start, start + 5);
    }

    get pageInfo() {
        const total = (this.state.data.tickets || []).length;
        const page = this.state.page || 1;
        const pages = Math.max(1, Math.ceil(total / 5) || 1);
        return {
            total,
            page,
            pages,
            start: total ? (page - 1) * 5 + 1 : 0,
            end: Math.min(page * 5, total),
        };
    }

    get pageNumbers() {
        const pages = this.pageInfo.pages;
        const list = [];
        for (let i = 1; i <= pages && i <= 7; i++) {
            list.push(i);
        }
        return list;
    }

    isPage(n) {
        return this.pageInfo.page === n;
    }

    goPage(ev) {
        const page = parseInt(ev.currentTarget.dataset.page, 10) || 1;
        this.state.page = Math.min(Math.max(1, page), this.pageInfo.pages);
    }

    prevPage() {
        this.state.page = Math.max(1, (this.state.page || 1) - 1);
    }

    nextPage() {
        this.state.page = Math.min(this.pageInfo.pages, (this.state.page || 1) + 1);
    }

    onFilterChange() {
        this.state.page = 1;
        return this.reload();
    }

    onHeaderSearch() {
        this.state.page = 1;
        const searchable = [
            "complaints", "my_complaints", "work_queue", "assignments",
            "routing", "categories", "sla", "escalations", "resolution", "feedback", "reports",
        ];
        if (searchable.includes(this.state.screen)) {
            return this.reload();
        }
    }

    onNotificationsHint() {
        this.notification.add(
            "SLA, escalation and assignment alerts appear on the ticket chatter and activities.",
            { type: "info" }
        );
    }

    resetFilters() {
        this.state.filters = {};
        this.state.datePreset = "all";
        this.state.page = 1;
        return this.reload();
    }

    slaClass(ticket) {
        if (ticket.state === "closed" || ticket.sla_status === "completed") {
            return "completed";
        }
        return ticket.sla_status || "on_track";
    }

    slaDisplay(ticket) {
        if (ticket.state === "closed" || ticket.sla_status === "completed") {
            return "Completed";
        }
        if (ticket.sla_breached) {
            return "Breached";
        }
        return ticket.sla || "On Track";
    }

    barHeight(count) {
        const max = Math.max(...(this.state.data.trend || []).map((b) => b.count), 1);
        return Math.max(8, Math.round((count / max) * 100));
    }

    pct(value, total) {
        if (!total) {
            return 0;
        }
        return Math.min(100, Math.round((value / total) * 100));
    }

    starCount(n) {
        const stars = this.state.data.stars || {};
        return stars[n] || stars[String(n)] || 0;
    }

    starPct(n) {
        const stars = this.state.data.stars || {};
        const total = Object.values(stars).reduce((a, b) => a + Number(b), 0) || 1;
        return Math.round((this.starCount(n) / total) * 100);
    }

    _screenFromProps(props) {
        return props.action?.context?.screen || props.action?.params?.screen || "dashboard";
    }

    _emptyCreateForm() {
        return {
            title: "",
            description: "",
            resident_id: false,
            contact_name: "",
            resident_query: "",
            unit_name: "",
            building_name: "",
            location_type: "apartment_inside",
            category_id: "",
            subcategory_id: "",
            priority_id: "",
            preferred_contact_method: "app",
            attachments: [],
        };
    }

    async _boot() {
        try {
            this.state.bootstrap = await this.orm.call("fms.helpdesk.ui", "bootstrap", []);
            const medium = (this.masters.priorities || []).find((p) => p.code === "medium");
            if (medium && !this.state.form.priority_id) {
                this.state.form.priority_id = medium.id;
            }
            await this.reload();
        } catch (error) {
            this.state.error = error.message || error.data?.message || String(error);
            this.state.loading = false;
        }
    }

    async reload() {
        this.state.loading = true;
        this.state.error = "";
        try {
            this._applyDatePreset();
            const params = {
                ...this.state.filters,
                tab: this.state.tab,
                ticket_id: this.state.ticketId,
                global_search: this.state.globalSearch || "",
            };
            if (this.state.filters.state === "open") {
                params.state = ["new", "open", "assigned"];
            } else if (this.state.filters.state) {
                params.state = this.state.filters.state;
            }
            const data = await this.orm.call("fms.helpdesk.ui", "load_screen", [this.state.screen, params]);
            this.state.data = data || {};
            if (this.state.screen === "create") {
                this.state.preview = data.preview || {};
                if (data.defaults?.priority_id && !this.state.form.priority_id) {
                    this.state.form.priority_id = data.defaults.priority_id;
                }
            }
            if (this.state.screen === "settings") {
                this.state.form = {
                    app_name: data.app_name,
                    default_priority_id: data.default_priority_id || "",
                    auto_routing: String(Boolean(data.auto_routing)),
                    require_verification: String(Boolean(data.require_verification)),
                    allow_reopen: String(Boolean(data.allow_reopen)),
                    reopen_days: data.reopen_days || 7,
                    feedback_enabled: String(Boolean(data.feedback_enabled)),
                    low_rating_threshold: data.low_rating_threshold || 2,
                    allow_resident_attachments: String(Boolean(data.allow_resident_attachments)),
                    allow_multiple_attachments: String(Boolean(data.allow_multiple_attachments)),
                };
            }
            if (this.state.screen === "categories") {
                const ids = (data.categories || []).map((c) => c.id);
                if (!ids.includes(this.state.selectedCategoryId)) {
                    this.state.selectedCategoryId = ids[0] || false;
                }
            }
            if (this.state.screen === "sla") {
                this.state.slaSettings = data.settings || this.state.slaSettings;
            }
        } catch (error) {
            this.state.error = error.message || error.data?.message || String(error);
            this.state.data = {};
        }
        this.state.loading = false;
    }

    _applyDatePreset() {
        // Reports uses manual date inputs; do not wipe them when preset is "all".
        if (this.state.screen === "reports") {
            return;
        }
        const preset = this.state.datePreset;
        const now = new Date();
        const iso = (d) => d.toISOString().slice(0, 19).replace("T", " ");
        if (preset === "month") {
            this.state.filters.date_from = iso(new Date(now.getFullYear(), now.getMonth(), 1));
            this.state.filters.date_to = iso(now);
        } else if (preset === "week") {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            this.state.filters.date_from = iso(start);
            this.state.filters.date_to = iso(now);
        } else {
            delete this.state.filters.date_from;
            delete this.state.filters.date_to;
        }
    }

    logout() {
        window.location.href = "/web/session/logout";
    }

    exportComplaints() {
        const rows = this.state.data.tickets || [];
        const header = ["Ticket ID", "Complaint", "Resident", "Category", "Priority", "Assigned To", "SLA", "Status"];
        const lines = [header.join(",")].concat(rows.map((t) =>
            [t.name, t.title, t.resident, t.category, t.priority, t.assignee, t.sla, t.state_label]
                .map((v) => `"${String(v || "").replace(/"/g, '""')}"`)
                .join(",")
        ));
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
        link.download = "complaints.csv";
        link.click();
    }

    async exportReport() {
        try {
            const params = { ...this.state.filters };
            if (this.state.filters.state === "open") {
                params.state = ["new", "open", "assigned"];
            }
            let rows = this.state.data.export_rows || [];
            if (!rows.length) {
                rows = await this.orm.call("fms.helpdesk.ui", "export_report_rows", [params]) || [];
            }
            const header = [
                "Ticket ID", "Title", "Category", "Priority", "Team", "Assignee",
                "Status", "SLA Status", "SLA Breached", "Resolution Hours", "Created",
            ];
            const lines = [header.join(",")].concat(rows.map((r) =>
                [r.name, r.title, r.category, r.priority, r.team, r.assignee,
                    r.state, r.sla_status, r.sla_breached, r.resolution_hours, r.created]
                    .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
                    .join(",")
            ));
            const link = document.createElement("a");
            link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
            link.download = "helpdesk_report.csv";
            link.click();
            this.notification.add("Report exported.", { type: "success" });
        } catch (error) {
            this.notification.add(error.message || String(error), { type: "danger" });
        }
    }

    volumeBarHeight(count) {
        const max = Math.max(...(this.state.data.volume || []).map((b) => b.created), 1);
        return Math.max(8, Math.round((count / max) * 100));
    }

    toggleMobileNav() {
        this.state.mobileNavOpen = !this.state.mobileNavOpen;
    }

    closeMobileNav() {
        this.state.mobileNavOpen = false;
    }

    onNav(ev) {
        this.closeMobileNav();
        this.setScreen(ev.currentTarget.dataset.screen);
    }

    setScreen(screen, ticketId = false) {
        this.closeMobileNav();
        this.state.screen = screen;
        this.state.ticketId = ticketId;
        this.state.tab = TABS[screen] || this.state.tab;
        this.state.filters = {};
        this.state.page = 1;
        this.state.simulator = false;
        if (screen === "create") {
            this.state.form = this._emptyCreateForm();
            const medium = (this.masters.priorities || []).find((p) => p.code === "medium");
            if (medium) {
                this.state.form.priority_id = medium.id;
            }
        }
        return this.reload();
    }

    setTab(tab) {
        this.state.tab = tab;
        if (this.state.screen === "sla") {
            return;
        }
        return this.reload();
    }

    onOpenTicket(ev) {
        ev.stopPropagation();
        const id = Number(ev.currentTarget.dataset.id);
        if (id) {
            this.setScreen("ticket", id);
        }
    }

    selectCategory(ev) {
        this.state.selectedCategoryId = Number(ev.currentTarget.dataset.id);
    }

    isSelectedCategory(id) {
        return String(this.state.selectedCategoryId || "") === String(id);
    }

    ruleLine(rule) {
        return [rule.subcategory, rule.team, rule.user].filter(Boolean).join(" → ");
    }

    catStatusLabel(active) {
        return active ? "Active" : "Inactive";
    }

    async onResidentQuery() {
        const name = (this.state.form.resident_query || "").trim();
        // Typing a name (without picking a DB resident) still counts as Contact Name.
        if (!this.state.form.resident_id) {
            this.state.form.contact_name = name;
        }
        if (!name) {
            this.state.residents = [];
            return;
        }
        this.state.residents = await this.orm.call("fms.helpdesk.ui", "search_residents", [name]);
    }

    pickResident(ev) {
        const id = Number(ev.currentTarget.dataset.id);
        const resident = this.state.residents.find((r) => r.id === id);
        if (!resident) {
            return;
        }
        this.state.form.resident_id = resident.id;
        this.state.form.resident_query = resident.name;
        this.state.form.contact_name = resident.name;
        this.state.form.unit_name = resident.unit;
        this.state.form.building_name = resident.building;
        this.state.residents = [];
    }

    pickPriority(ev) {
        this.state.form.priority_id = Number(ev.currentTarget.dataset.id);
        this.onCreateChange();
    }

    async onCreateChange() {
        const vals = this._createVals(true);
        this.state.preview = await this.orm.call("fms.helpdesk.ui", "preview_ticket", [vals]);
    }

    _createVals(forPreview = false) {
        const f = this.state.form;
        const vals = {
            title: f.title || (forPreview ? "Preview" : ""),
            description: f.description,
            resident_id: f.resident_id || false,
            contact_name: (f.contact_name || f.resident_query || "").trim() || false,
            unit_name: f.unit_name,
            building_name: f.building_name,
            location_type: f.location_type,
            category_id: Number(f.category_id) || false,
            subcategory_id: Number(f.subcategory_id) || false,
            priority_id: Number(f.priority_id) || false,
            preferred_contact_method: f.preferred_contact_method,
        };
        if (!forPreview) {
            vals.attachments = f.attachments || [];
        }
        return vals;
    }

    onCreateFiles(ev) {
        const input = ev.currentTarget;
        const files = Array.from(input.files || []);
        input.value = "";
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = String(reader.result || "");
                const datas = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
                this.state.form.attachments = [
                    ...(this.state.form.attachments || []),
                    { name: file.name, mimetype: file.type, datas, size: file.size },
                ];
            };
            reader.readAsDataURL(file);
        });
    }

    removeCreateFile(ev) {
        const index = parseInt(ev.currentTarget.dataset.index, 10);
        this.state.form.attachments = (this.state.form.attachments || []).filter((_, i) => i !== index);
    }

    async saveTicket(submit) {
        if (!this.state.form.title) {
            this.notification.add("Enter a complaint title.", { type: "warning" });
            return;
        }
        const contact = (this.state.form.contact_name || this.state.form.resident_query || "").trim();
        if (!this.state.form.resident_id) {
            this.state.form.contact_name = contact;
        }
        if (submit && !this.state.form.resident_id && !contact) {
            this.notification.add("Enter Contact Name, or search and pick a Resident.", { type: "danger" });
            return;
        }
        try {
            const result = await this.orm.call("fms.helpdesk.ui", "save_ticket", [this._createVals(), submit]);
            this.notification.add(submit ? `Complaint ${result.name} created` : "Draft saved", { type: "success" });
            this.setScreen(submit ? "ticket" : "complaints", submit ? result.id : false);
        } catch (error) {
            this.notification.add(error.data?.message || error.message, { type: "danger" });
        }
    }

    openModal(name, extra = {}) {
        const defaults = {
            active: "true",
            subcategory_names: [],
            sub_input: "",
            response_target: "30",
            response_unit: "minutes",
            resolution_target: "4",
            resolution_unit: "hours",
            warning_threshold: "80",
            coverage: "business_hours",
            reason: "manual",
            assignment_method: "round_robin",
            member_ids: [],
            category_id: "",
            subcategory_id: "",
            priority_id: "",
            summary: "",
        };
        // Pre-select first category for Test Routing so the required field is never blank.
        if (name === "routingTest" && !extra.category_id) {
            const first = (this.masters.categories || [])[0];
            if (first) {
                defaults.category_id = String(first.id);
            }
        }
        this.state.modal = name;
        this.state.modalVals = { ...defaults, ...extra };
    }

    closeModal() {
        this.state.modal = null;
    }

    onOverlay(ev) {
        if (ev.target.classList.contains("hd-overlay")) {
            this.closeModal();
        }
    }

    addSub() {
        const name = (this.state.modalVals.sub_input || "").trim();
        if (!name) {
            return;
        }
        const names = this.state.modalVals.subcategory_names || [];
        names.push(name);
        this.state.modalVals.subcategory_names = names;
        this.state.modalVals.sub_input = "";
    }

    removeSub(ev) {
        const name = ev.currentTarget.dataset.name;
        this.state.modalVals.subcategory_names = (this.state.modalVals.subcategory_names || []).filter((s) => s !== name);
    }

    isTeamMemberSelected(userId) {
        const ids = this.state.modalVals?.member_ids || [];
        return ids.some((id) => Number(id) === Number(userId));
    }

    onTeamMemberToggle(ev) {
        const userId = Number(ev.target.value);
        const checked = Boolean(ev.target.checked);
        const current = (this.state.modalVals.member_ids || []).map((id) => Number(id));
        const next = checked
            ? [...new Set([...current, userId])]
            : current.filter((id) => id !== userId);
        this.state.modalVals.member_ids = next;
    }

    editTeam(ev) {
        ev.stopPropagation();
        const id = Number(ev.currentTarget.dataset.id);
        const team = (this.state.data.teams || []).find((t) => t.id === id);
        if (!team) {
            return;
        }
        this.openModal("team", {
            id: team.id,
            name: team.name,
            description: team.description || "",
            leader_id: team.leader_id || "",
            member_ids: team.member_ids || [],
            assignment_method: team.assignment_method || "round_robin",
            active: String(Boolean(team.active)),
        });
    }

    async saveTeam() {
        const v = this.state.modalVals;
        if (!(v.name || "").trim()) {
            this.notification.add("Team name is required.", { type: "danger" });
            return;
        }
        await this.orm.call("fms.helpdesk.ui", "save_team", [{
            id: v.id || false,
            name: v.name,
            description: v.description || "",
            leader_id: Number(v.leader_id) || false,
            member_ids: v.member_ids || [],
            assignment_method: v.assignment_method || "manual",
            active: v.active !== "false",
        }]);
        this.closeModal();
        this.notification.add("Support team saved.", { type: "success" });
        this.state.bootstrap = await this.orm.call("fms.helpdesk.ui", "bootstrap", []);
        this.reload();
    }

    async saveCategory() {
        const v = this.state.modalVals;
        await this.orm.call("fms.helpdesk.ui", "save_category", [{
            id: v.id || false,
            name: v.name,
            description: v.description,
            active: v.active !== "false",
            default_team_id: Number(v.default_team_id) || false,
            default_user_id: Number(v.default_user_id) || false,
            subcategory_names: v.subcategory_names || [],
        }]);
        this.closeModal();
        this.state.bootstrap = await this.orm.call("fms.helpdesk.ui", "bootstrap", []);
        this.reload();
    }

    editCategory(ev) {
        ev.stopPropagation();
        const id = Number(ev.currentTarget.dataset.id);
        const cat = (this.state.data.categories || []).find((c) => c.id === id);
        this.openModal("category", {
            id: cat.id,
            name: cat.name,
            description: cat.description,
            active: String(cat.active),
            default_team_id: cat.default_team_id || "",
            default_user_id: cat.default_user_id || "",
            subcategory_names: cat.subcategories.slice(),
        });
    }

    async saveRule() {
        const v = this.state.modalVals;
        if (!(v.name || "").trim()) {
            this.notification.add("Rule name is required.", { type: "danger" });
            return;
        }
        if (!Number(v.team_id)) {
            this.notification.add("Support team is required.", { type: "danger" });
            return;
        }
        if (!Number(v.category_id) && !Number(v.subcategory_id) && !Number(v.priority_id)) {
            this.notification.add("Add at least one condition (category, subcategory or priority).", { type: "danger" });
            return;
        }
        await this.orm.call("fms.helpdesk.ui", "save_routing_rule", [{
            id: v.id || false,
            name: v.name,
            category_id: Number(v.category_id) || false,
            subcategory_id: Number(v.subcategory_id) || false,
            priority_id: Number(v.priority_id) || false,
            team_id: Number(v.team_id) || false,
            user_id: Number(v.user_id) || false,
            sla_policy_id: Number(v.sla_policy_id) || false,
        }]);
        this.closeModal();
        this.state.bootstrap = await this.orm.call("fms.helpdesk.ui", "bootstrap", []);
        this.reload();
    }

    editRule(ev) {
        ev.stopPropagation();
        const id = Number(ev.currentTarget.dataset.id);
        const rule = (this.state.data.rules || []).find((r) => r.id === id);
        if (rule) {
            this.openModal("routing", { ...rule });
        }
    }

    onModalNumberInput(ev) {
        const field = ev.currentTarget.dataset.field;
        if (!field) {
            return;
        }
        // Keep digits only so typing works reliably in OWL modals.
        const raw = String(ev.target.value || "").replace(/[^\d.]/g, "");
        this.state.modalVals[field] = raw;
        if (ev.target.value !== raw) {
            ev.target.value = raw;
        }
    }

    async saveSla() {
        const v = this.state.modalVals;
        if (!(v.name || "").trim()) {
            this.notification.add("Policy name is required.", { type: "danger" });
            return;
        }
        if (!Number(v.priority_id)) {
            this.notification.add("Select a complaint priority.", { type: "danger" });
            return;
        }
        if (!Number(v.response_target) || !Number(v.resolution_target)) {
            this.notification.add("Enter response and resolution target numbers.", { type: "danger" });
            return;
        }
        await this.orm.call("fms.helpdesk.ui", "save_sla_policy", [{
            id: v.id || false,
            name: v.name,
            description: v.description,
            priority_id: Number(v.priority_id) || false,
            response_target: Number(v.response_target),
            response_unit: v.response_unit || "minutes",
            resolution_target: Number(v.resolution_target),
            resolution_unit: v.resolution_unit || "hours",
            coverage: v.coverage || "business_hours",
            warning_threshold: Number(v.warning_threshold) || 80,
            escalation_level_id: Number(v.escalation_level_id) || false,
            active: v.active !== "false",
        }]);
        this.closeModal();
        this.notification.add("SLA policy saved.", { type: "success" });
        this.reload();
    }

    editSlaLevel(ev) {
        ev.stopPropagation();
        const id = Number(ev.currentTarget.dataset.id);
        const level = (this.state.data.levels || []).find((l) => l.id === id);
        if (!level) {
            return;
        }
        this.openModal("priority", { ...level, active: String(Boolean(level.active)) });
    }

    editSlaPolicy(ev) {
        ev.stopPropagation();
        const id = Number(ev.currentTarget.dataset.id);
        const policy = (this.state.data.policies || []).find((p) => p.id === id);
        if (!policy) {
            return;
        }
        this.openModal("sla", {
            ...policy,
            coverage: policy.coverage_code || "business_hours",
            response_target: String(policy.response_target ?? "30"),
            resolution_target: String(policy.resolution_target ?? "4"),
            warning_threshold: String(policy.warning_threshold ?? "80"),
            response_unit: policy.response_unit || "minutes",
            resolution_unit: policy.resolution_unit || "hours",
            active: String(Boolean(policy.active)),
        });
    }

    async savePriority() {
        const v = this.state.modalVals;
        await this.orm.call("fms.helpdesk.ui", "save_priority", [{
            id: v.id || false,
            name: v.name,
            description: v.description,
            active: v.active !== "false",
            escalation_level_id: Number(v.escalation_level_id) || false,
            policy_id: Number(v.policy_id) || false,
            response_target: Number(v.response_target),
            response_unit: v.response_unit,
            resolution_target: Number(v.resolution_target),
            resolution_unit: v.resolution_unit,
        }]);
        this.closeModal();
        this.state.bootstrap = await this.orm.call("fms.helpdesk.ui", "bootstrap", []);
        this.reload();
    }

    async saveSlaSettings() {
        const s = this.state.slaSettings;
        await this.orm.call("fms.helpdesk.ui", "save_sla_settings", [{
            at_risk: Number(s.at_risk),
            critical_warning: Number(s.critical_warning),
            pause_awaiting: s.pause_awaiting === true || s.pause_awaiting === "true",
            pause_vendor: s.pause_vendor === true || s.pause_vendor === "true",
        }]);
        this.notification.add("SLA settings saved", { type: "success" });
        this.reload();
    }

    openSlaSimulator() {
        const sample = this.slaTracker;
        this.openModal("slaSimulator", {
            ticket_id: sample && sample.id ? sample.id : "",
        });
    }

    async doSimulateSla() {
        try {
            const id = Number(this.state.modalVals.ticket_id);
            this.state.simulator = await this.orm.call("fms.helpdesk.ui", "simulate_sla", [id]);
            this.closeModal();
        } catch (error) {
            this.notification.add(error.data?.message || error.message, { type: "danger" });
        }
    }

    get assignTicketOptions() {
        const rows = this.state.data.assignable_tickets || this.state.data.tickets || [];
        return rows.map((t) => ({
            id: t.id,
            name: `${t.name || ""} — ${t.title || ""}`.trim(),
        }));
    }

    openAssignModal(ev) {
        ev?.stopPropagation?.();
        const id = Number(ev?.currentTarget?.dataset?.id) || this.state.ticketId || "";
        const rows = this.state.data.assignable_tickets || this.state.data.tickets || [];
        const ticket = rows.find((t) => Number(t.id) === Number(id));
        this.openModal("assign", {
            ticket_id: id ? String(id) : "",
            team_id: ticket?.team_id ? String(ticket.team_id) : "",
            user_id: ticket?.user_id ? String(ticket.user_id) : "",
            reason: "",
        });
    }

    async doAssign() {
        const v = this.state.modalVals;
        if (!Number(v.ticket_id)) {
            this.notification.add("Select a ticket to assign.", { type: "danger" });
            return;
        }
        await this.orm.call("fms.helpdesk.ui", "assign_ticket", [
            Number(v.ticket_id),
            Number(v.team_id) || false,
            Number(v.user_id) || false,
            v.reason || false,
        ]);
        this.closeModal();
        this.reload();
    }

    exportFeedback() {
        const rows = this.state.data.rows || [];
        const header = ["Ticket", "Complaint", "Category", "Resolved By", "Date", "Rating", "State"];
        const lines = [header.join(",")].concat(rows.map((f) =>
            [f.ticket, f.title, f.category, f.resolved_by, f.date, f.rating || "pending", f.state]
                .map((v) => `"${String(v || "").replace(/"/g, '""')}"`)
                .join(",")
        ));
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
        link.download = "feedback.csv";
        link.click();
    }

    openFeedbackModal(ev) {
        ev.stopPropagation();
        const id = Number(ev.currentTarget.dataset.id);
        this.openModal("feedback", { feedback_id: id, rating: "", comment: "" });
    }

    async doSubmitFeedback() {
        const v = this.state.modalVals;
        if (!v.rating) {
            this.notification.add("Rating is required.", { type: "danger" });
            return;
        }
        await this.orm.call("fms.helpdesk.ui", "submit_feedback", [
            Number(v.feedback_id), v.rating, v.comment || false,
        ]);
        this.closeModal();
        this.notification.add("Feedback submitted.", { type: "success" });
        this.reload();
    }

    isEscTab(name) {
        return (this.state.tab || "needs") === name;
    }

    get escalateTicketOptions() {
        const rows = this.state.data.escalate_tickets || [];
        const id = Number(this.state.modalVals.ticket_id);
        if (id && !rows.some((row) => Number(row.id) === id)) {
            return [{ id, name: "Selected ticket" }, ...rows];
        }
        return rows;
    }

    async openCreateEscalation() {
        const tickets = await this.orm.call("fms.helpdesk.ui", "list_escalatable_tickets", []);
        this.state.data = { ...this.state.data, escalate_tickets: tickets };
        if (!tickets.length) {
            this.notification.add(
                "No open tickets to escalate. Create a new complaint first (closed tickets cannot be escalated).",
                { type: "warning" }
            );
            return;
        }
        const level = (this.masters.escalation_levels || [])[0];
        this.openModal("escalate", {
            ticket_id: String(tickets[0].id),
            level_id: level?.id ? String(level.id) : "",
            reason: "manual",
            comment: "",
        });
    }

    async openEscalateModal(ev) {
        if (ev) {
            ev.stopPropagation();
        }
        const tickets = await this.orm.call("fms.helpdesk.ui", "list_escalatable_tickets", []);
        this.state.data = { ...this.state.data, escalate_tickets: tickets };
        const id = Number(ev?.currentTarget?.dataset?.id) || this.state.ticketId;
        const level = (this.masters.escalation_levels || [])[0];
        this.openModal("escalate", {
            ticket_id: id ? String(id) : (tickets[0] ? String(tickets[0].id) : ""),
            level_id: level?.id ? String(level.id) : "",
            reason: "manual",
            comment: "",
        });
    }

    reviewEscalation(ev) {
        ev.stopPropagation();
        const id = Number(ev.currentTarget.dataset.id);
        if (id) {
            this.setScreen("ticket", id);
        }
    }

    async doEscalate() {
        const v = this.state.modalVals;
        if (!Number(v.ticket_id)) {
            this.notification.add("Select a ticket to escalate.", { type: "danger" });
            return;
        }
        if (!Number(v.level_id)) {
            this.notification.add("Select an escalation level.", { type: "danger" });
            return;
        }
        try {
            await this.orm.call("fms.helpdesk.ui", "escalate_ticket", [
                Number(v.ticket_id), Number(v.level_id) || false, v.reason || "manual", v.comment || false,
            ]);
            this.closeModal();
            this.notification.add("Ticket escalated.", { type: "success" });
            this.reload();
        } catch (error) {
            this.notification.add(error.data?.message || error.message, { type: "danger" });
        }
    }

    isResTab(name) {
        return (this.state.tab || "needs") === name;
    }

    get resolveTicketOptions() {
        const rows = this.state.data.resolve_tickets || [];
        const id = Number(this.state.modalVals.ticket_id);
        if (id && !rows.some((row) => Number(row.id) === id)) {
            return [{ id, name: "Selected ticket" }, ...rows];
        }
        return rows;
    }

    openCreateResolution() {
        this.openModal("resolve", { ticket_id: "", description: "", work_performed: "" });
    }

    openResolveModal(ev) {
        if (ev) {
            ev.stopPropagation();
        }
        const id = Number(ev?.currentTarget?.dataset?.id) || this.state.ticketId;
        this.openModal("resolve", { ticket_id: id || "", description: "", work_performed: "" });
    }

    async doResolve() {
        const v = this.state.modalVals;
        await this.orm.call("fms.helpdesk.ui", "resolve_ticket", [Number(v.ticket_id), v.description, v.work_performed]);
        this.closeModal();
        this.reload();
    }

    async onCloseTicket(ev) {
        ev.stopPropagation();
        await this.orm.call("fms.helpdesk.ui", "close_ticket", [Number(ev.currentTarget.dataset.id), "resolved", false]);
        this.reload();
    }

    async onVerify(ev) {
        ev.stopPropagation();
        await this.orm.call("fms.helpdesk.ui", "verify_resolution", [Number(ev.currentTarget.dataset.id)]);
        this.reload();
    }

    openWorkQueueTab(tab) {
        this.state.screen = "work_queue";
        this.state.tab = tab || "mine";
        this.state.filters = {};
        this.state.page = 1;
        return this.reload();
    }

    openReopenModal(ev) {
        ev.stopPropagation();
        const id = Number(ev.currentTarget.dataset.id);
        this.openModal("reopen", { ticket_id: id || "", reason: "" });
    }

    async doReopen() {
        const v = this.state.modalVals;
        if (!(v.reason || "").trim()) {
            this.notification.add("Reopen reason is required.", { type: "danger" });
            return;
        }
        await this.orm.call("fms.helpdesk.ui", "reopen_ticket", [Number(v.ticket_id), v.reason]);
        this.closeModal();
        this.reload();
    }

    isRoutingTestSelected(field, id) {
        return Number(this.state.modalVals?.[field] || 0) === Number(id);
    }

    onRoutingTestCategoryChange(ev) {
        this.state.modalVals.category_id = ev?.target?.value || "";
        this.state.modalVals.subcategory_id = "";
        this.state.modalVals.summary = "";
    }

    onRoutingTestFieldChange(ev) {
        const field = ev.currentTarget.dataset.field;
        if (field) {
            this.state.modalVals[field] = ev.target.value || "";
        }
    }

    async doTestRouting() {
        // Refresh masters in case category was just created.
        this.state.bootstrap = await this.orm.call("fms.helpdesk.ui", "bootstrap", []);
        const v = this.state.modalVals;
        let categoryId = Number(v.category_id) || 0;
        if (!categoryId && (this.masters.categories || []).length === 1) {
            categoryId = Number(this.masters.categories[0].id);
            this.state.modalVals.category_id = String(categoryId);
        }
        if (!categoryId) {
            this.notification.add("Select a Category before testing routing.", { type: "danger" });
            return;
        }
        try {
            const result = await this.orm.call("fms.helpdesk.ui", "test_routing", [{
                category_id: categoryId,
                subcategory_id: Number(v.subcategory_id) || false,
                priority_id: Number(v.priority_id) || false,
            }]);
            this.state.modalVals.summary = result.summary || "";
            this.notification.add(result.summary || "Routing tested.", { type: "success" });
        } catch (error) {
            this.notification.add(error.data?.message || error.message, { type: "danger" });
        }
    }

    async saveSettings() {
        const f = this.state.form;
        await this.orm.call("fms.helpdesk.ui", "save_settings", [{
            app_name: f.app_name,
            default_priority_id: Number(f.default_priority_id) || false,
            auto_routing: f.auto_routing === "true",
            require_verification: f.require_verification === "true",
            allow_reopen: f.allow_reopen === "true",
            reopen_days: Number(f.reopen_days) || 7,
            feedback_enabled: f.feedback_enabled === "true",
            low_rating_threshold: Number(f.low_rating_threshold) || 2,
            allow_resident_attachments: f.allow_resident_attachments === "true",
            allow_multiple_attachments: f.allow_multiple_attachments === "true",
        }]);
        this.notification.add("Settings saved", { type: "success" });
        this.state.bootstrap = await this.orm.call("fms.helpdesk.ui", "bootstrap", []);
    }
}

registry.category("actions").add("fms_helpdesk.app", FmsHelpdeskApp, { force: true });
