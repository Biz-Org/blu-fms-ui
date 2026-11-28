/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component, onWillStart, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { VC_DEMO } from "./demo_data";

const NAV = [
    { id: "dashboard", label: "Dashboard", icon: "fa-th-large" },
    { id: "vendors", label: "Vendors", icon: "fa-briefcase" },
    { id: "contractors", label: "Contractors", icon: "fa-wrench" },
    { id: "contracts", label: "Contracts & AMC", icon: "fa-file-text-o" },
    { id: "workforce", label: "Workforce", icon: "fa-users" },
    { id: "attendance", label: "Attendance & Access", icon: "fa-id-card-o" },
    { id: "passes", label: "Daily Pass", icon: "fa-ticket" },
    { id: "ptw", label: "Permit to Work", icon: "fa-check-square-o" },
    { id: "documents", label: "Documents & Compliance", icon: "fa-folder-open-o" },
    { id: "performance", label: "Performance", icon: "fa-line-chart" },
    { id: "reports", label: "Reports", icon: "fa-bar-chart" },
    { id: "audit", label: "Activity / Audit", icon: "fa-history" },
];

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export class VendorContractorApp extends Component {
    static template = "vendor_and_contractor_management.App";
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
            demo: deepClone(VC_DEMO),
            vendorForm: this._blankVendorForm(),
            contractorForm: this._blankContractorForm(),
            contractForm: this._blankContractForm(),
            workerForm: this._blankWorkerForm(),
            passForm: this._blankPassForm(),
            ptwForm: this._blankPtwForm(),
            selectedVendor: null,
            vendorTab: "overview",
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
            vendors: { title: this.d.vendors.title, subtitle: this.d.vendors.subtitle },
            contractors: { title: this.d.contractors.title, subtitle: this.d.contractors.subtitle },
            contracts: { title: this.d.contracts.title, subtitle: this.d.contracts.subtitle },
            workforce: { title: this.d.workforce.title, subtitle: this.d.workforce.subtitle },
            attendance: { title: this.d.attendance.title, subtitle: this.d.attendance.subtitle },
            passes: { title: this.d.passes.title, subtitle: this.d.passes.subtitle },
            ptw: { title: this.d.ptw.title, subtitle: this.d.ptw.subtitle },
            documents: { title: this.d.documents.title, subtitle: this.d.documents.subtitle },
            performance: { title: this.d.performance.title, subtitle: this.d.performance.subtitle },
            reports: { title: this.d.reports.title, subtitle: this.d.reports.subtitle },
            audit: { title: this.d.audit.title, subtitle: this.d.audit.subtitle },
            notifications: { title: this.d.notifications.title, subtitle: this.d.notifications.subtitle },
            settings: { title: "Settings", subtitle: "Organization and module configuration." },
            vendor_create: {
                title: "Create Vendor",
                subtitle: "Add a new vendor and complete the required registration, service and compliance information.",
            },
            contractor_create: {
                title: "Create Contractor",
                subtitle: "Register a contractor company for site work authorization.",
            },
            contract_create: {
                title: "Create Contract",
                subtitle: "Add a vendor/contractor contract or AMC agreement.",
            },
            worker_create: {
                title: "Add Worker",
                subtitle: "Register a worker under an approved contractor.",
            },
            pass_create: {
                title: "Create Daily Pass",
                subtitle: "Issue a temporary visitor or worker access pass.",
            },
            ptw_create: {
                title: "Create Permit to Work",
                subtitle: "Raise a new PTW with safety and PPE requirements.",
            },
            vendor_detail: {
                title: this.state.selectedVendor?.name || "Vendor Details",
                subtitle: "Profile, contracts, documents, compliance and performance",
            },
        };
        return map[this.state.screen] || { title: "Vendor & Contractor", subtitle: "" };
    }

    async _call(method, args = []) {
        return this.orm.call("vc.dashboard", method, args);
    }

    async refreshAll() {
        this.state.loading = true;
        try {
            await Promise.all([
                this.loadDashboard(),
                this.loadVendors(),
                this.loadContractors(),
                this.loadContracts(),
                this.loadWorkforce(),
                this.loadAttendance(),
                this.loadPasses(),
                this.loadPtw(),
                this.loadDocuments(),
                this.loadPerformance(),
                this.loadReports(),
                this.loadAudit(),
                this.loadNotifications(),
            ]);
        } catch (error) {
            console.error(error);
            this.notification.add("Could not load live data; showing cached design data.", { type: "warning" });
        } finally {
            this.state.loading = false;
        }
    }

    async loadDashboard() {
        const data = await this._call("get_dashboard_data", [{}]);
        if (!data || !data.kpis) {
            return;
        }
        const k = data.kpis;
        this.state.demo.dashboard.kpis = [
            { label: "Total Vendors", value: k.total_vendors, hint: `Active: ${k.active_vendors}`, hintClass: "ok", accent: false },
            { label: "Active Contractors", value: k.active_contractors, hint: `Approved: ${k.approved_contractors}`, hintClass: "ok", accent: false },
            { label: "Pending Approvals", value: k.pending_approvals, hint: "Requires action", hintClass: "bad", accent: false },
            { label: "Compliance Issues", value: k.compliance_issues, hint: "Requires attention", hintClass: "bad", accent: false },
            { label: "Expiring Soon", value: k.expiring_soon, hint: "Contracts & docs", hintClass: "", accent: false },
            { label: "Workers On Site", value: k.workers_on_site, hint: "Currently active", hintClass: "", accent: true },
        ];
        this.state.demo.dashboard.vendorStatus = {
            total: k.total_vendors,
            active: k.active_vendors,
            pending: k.pending_vendors,
            suspended: k.suspended_vendors,
        };
        this.state.demo.dashboard.contractorStatus = {
            total: k.total_contractors || 0,
            active: k.active_contractors,
            pending: k.pending_contractors,
            suspended: k.suspended_contractors,
        };
        this.state.demo.dashboard.pendingActions = (data.pending_actions || []).map((r) => ({
            type: r.type,
            name: r.name,
            category: r.category,
            site: r.site,
            action: r.action,
            due: r.due,
            status: r.status,
            statusKey: "pending",
        }));
        this.state.demo.dashboard.alerts = (data.alerts || []).map((a, idx) => ({
            title: a.title,
            text: a.text,
            tone: idx === 2 ? "danger" : "warn",
        }));
        this.state.demo.dashboard.alertCount = (data.alerts || []).length;
    }

    async loadVendors() {
        const data = await this._call("get_vendors_data", [{}]);
        if (!data) {
            return;
        }
        const k = data.kpis || {};
        this.state.demo.vendors.kpis = [
            { label: "Total Vendors", value: k.total || 0, tone: "" },
            { label: "Active", value: k.active || 0, tone: "ok" },
            { label: "Pending Approval", value: k.pending || 0, tone: "warn" },
            { label: "Expiring / Action Required", value: k.expiring || 0, tone: "bad" },
        ];
        this.state.demo.vendors.rows = (data.rows || []).map((r) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            category: r.category,
            contact: r.contact,
            site: r.site,
            contract: r.contract_label,
            contractTone: "",
            compliance: r.compliance,
            complianceKey: r.compliance_key,
            rating: r.rating,
            state: r.state,
            state_label: r.state_label,
        }));
        this.state.demo.vendors.pageInfo = `Showing ${this.state.demo.vendors.rows.length} vendors`;
    }

    async loadContractors() {
        const data = await this._call("get_contractors_data", [{}]);
        if (!data) {
            return;
        }
        const k = data.kpis || {};
        this.state.demo.contractors.kpis = [
            { label: "Total Contractors", value: k.total || 0, tone: "" },
            { label: "Active / Approved", value: k.active || 0, tone: "ok" },
            { label: "Under Verification", value: k.pending || 0, tone: "warn" },
            { label: "Suspended", value: k.suspended || 0, tone: "bad" },
        ];
        this.state.demo.contractors.rows = (data.rows || []).map((r) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            type: r.type,
            category: r.category,
            contact: r.contact,
            site: r.site,
            workers: r.workers,
            state: r.state_label,
            stateKey: r.state,
        }));
    }

    async loadContracts() {
        const data = await this._call("get_contracts_data", [{}]);
        if (!data) {
            return;
        }
        const k = data.kpis || {};
        this.state.demo.contracts.kpis = [
            { label: "Active Contracts", value: k.active || 0, hint: "", tone: "ok" },
            { label: "Expiring Soon", value: k.expiring || 0, hint: "Next 30 days", tone: "warn" },
            { label: "Expired", value: k.expired || 0, hint: "Requires action", tone: "bad" },
            { label: "AMC Contracts", value: k.amc || 0, hint: "Active maintenance", tone: "purple" },
        ];
        this.state.demo.contracts.rows = (data.rows || []).map((r) => ({
            id: r.id,
            code: r.code,
            party: r.party,
            category: r.category,
            avatar: (r.party || "?").slice(0, 2).toUpperCase(),
            type: r.type,
            site: r.site,
            start: r.date_start,
            end: r.date_end,
            endTone: r.state === "expiring" ? "warn" : r.state === "expired" ? "bad" : "",
            amc: r.amc_label,
            sla: r.sla_label ? `SLA: ${r.sla_label}` : "—",
        }));
        this.state.demo.contracts.pageInfo = `Showing ${this.state.demo.contracts.rows.length} contracts`;
    }

    async loadWorkforce() {
        const data = await this._call("get_workforce_data", [{}]);
        if (!data) {
            return;
        }
        const k = data.kpis || {};
        this.state.demo.workforce.kpis = [
            { label: "Total Workers", value: k.total || 0, tone: "" },
            { label: "Active", value: k.active || 0, tone: "ok" },
            { label: "On Leave", value: k.on_leave || 0, tone: "warn" },
            { label: "Inactive", value: k.inactive || 0, tone: "" },
            { label: "Expiring Documents", value: k.expiring_docs || 0, tone: "bad" },
        ];
        this.state.demo.workforce.rows = (data.rows || []).map((r) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            contractor: r.contractor,
            skill: r.skill,
            state: r.state_label,
            stateKey: r.state,
            doc: r.document_label,
            docKey: r.document_status,
        }));
        this.state.demo.workforce.pageInfo = `Showing ${this.state.demo.workforce.rows.length} workers`;
    }

    async loadAttendance() {
        const data = await this._call("get_attendance_data", [{}]);
        if (!data) {
            return;
        }
        const k = data.kpis || {};
        this.state.demo.attendance.kpis = [
            { label: "Total Workers", value: k.total || 0 },
            { label: "Present Today", value: k.present || 0, tone: "ok" },
            { label: "Absent", value: k.absent || 0, tone: "bad" },
            { label: "Late", value: k.late || 0, tone: "warn" },
            { label: "On Leave", value: k.on_leave || 0 },
            { label: "Currently On Site", value: k.on_site || 0, accent: true },
        ];
        this.state.demo.attendance.rows = (data.rows || []).map((r) => ({
            id: r.id,
            code: r.worker_code,
            name: r.worker_name,
            contractor: r.contractor,
            checkIn: r.check_in,
            checkOut: r.check_out,
            state: r.state_label,
            stateKey: r.state,
        }));
        this.state.demo.attendance.overview = [
            { label: "Currently On Site", value: k.on_site || 0 },
            { label: "Present Today", value: k.present || 0 },
            { label: "Absent", value: k.absent || 0 },
            { label: "Late", value: k.late || 0 },
        ];
    }

    async loadPasses() {
        const data = await this._call("get_passes_data", [{}]);
        if (!data) {
            return;
        }
        const k = data.kpis || {};
        this.state.demo.passes.kpis = [
            { label: "Total Passes", value: k.total || 0 },
            { label: "Active Today", value: k.active || 0, tone: "ok" },
            { label: "Pending Approval", value: k.pending || 0, tone: "warn" },
            { label: "Expiring Today", value: k.expiring || 0, tone: "warn" },
            { label: "Expired", value: k.expired || 0, tone: "bad" },
        ];
        this.state.demo.passes.rows = (data.rows || []).map((r) => ({
            id: r.id,
            code: r.code,
            worker: r.worker,
            company: r.company,
            site: r.site,
            purpose: r.purpose,
            validity: r.validity,
            type: r.pass_type,
            state: r.state_label,
            stateKey: r.state,
        }));
    }

    async loadPtw() {
        const data = await this._call("get_ptw_data", [{}]);
        if (!data) {
            return;
        }
        const k = data.kpis || {};
        this.state.demo.ptw.kpis = [
            { label: "Total PTW", value: k.total || 0 },
            { label: "Active", value: k.active || 0, tone: "ok" },
            { label: "Pending", value: k.pending || 0, tone: "warn" },
            { label: "Expired", value: k.expired || 0, tone: "bad" },
            { label: "Rejected", value: k.rejected || 0, tone: "bad" },
        ];
        this.state.demo.ptw.rows = (data.rows || []).map((r) => ({
            id: r.id,
            code: r.code,
            activity: r.activity,
            party: r.party,
            site: r.site,
            risk: r.risk_label,
            riskKey: r.risk,
            validity: r.validity,
            state: r.state_label,
            stateKey: r.state,
        }));
    }

    async loadDocuments() {
        const data = await this._call("get_documents_data", [{}]);
        if (!data) {
            return;
        }
        const k = data.kpis || {};
        this.state.demo.documents.kpis = [
            { label: "Total Documents", value: k.total || 0 },
            { label: "Verified", value: k.verified || 0, tone: "ok" },
            { label: "Pending", value: k.pending || 0, tone: "warn" },
            { label: "Expiring", value: k.expiring || 0, tone: "warn" },
            { label: "Expired", value: k.expired || 0, tone: "bad" },
        ];
        this.state.demo.documents.rows = (data.rows || []).map((r) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            type: r.type,
            party: r.party,
            site: r.site,
            expiry: r.expiry,
            state: r.state_label,
            stateKey: r.state,
        }));
    }

    async loadPerformance() {
        const res = await this._call("get_performance_data", [{}]);
        const data = res && res.data ? res.data : res;
        if (!data) {
            return;
        }
        const k = data.kpis || {};
        if (this.state.demo.performance) {
            this.state.demo.performance.kpis = [
                { label: "Evaluations", value: k.total || 0 },
                { label: "Avg Score", value: k.avg_score || 0, tone: "ok" },
            ];
            this.state.demo.performance.rows = (data.rows || []).map((r) => ({
                id: r.id,
                code: r.code,
                party: r.vendor || r.contractor,
                score: r.overall_score,
                rating: r.rating_label,
                ratingKey: r.rating,
                date: r.evaluation_date,
            }));
        }
    }

    async loadReports() {
        const res = await this._call("get_report_catalog", []);
        const data = res && res.data ? res.data : res;
        if (data && data.catalog && this.state.demo.reports) {
            this.state.demo.reports.catalog = data.catalog;
            this.state.demo.reports.rows = data.catalog.map((c) => ({
                type: c.type,
                name: c.name,
            }));
        }
    }

    async loadAudit() {
        const res = await this._call("get_activity_data", [{}]);
        const data = res && res.data ? res.data : res;
        if (data && data.rows && this.state.demo.audit) {
            this.state.demo.audit.rows = data.rows.map((r) => ({
                id: r.id,
                code: r.code,
                type: r.activity_type,
                record: r.res_name,
                user: r.user,
                datetime: r.datetime,
                description: r.description,
                from: r.previous_state,
                to: r.new_state,
            }));
        }
    }

    async loadNotifications() {
        const res = await this._call("get_notifications_data", [{ is_read: false }]);
        const data = res && res.data ? res.data : res;
        if (data && data.rows && this.state.demo.notifications) {
            this.state.demo.notifications.rows = data.rows.map((r) => ({
                id: r.id,
                title: r.title,
                message: r.message,
                category: r.category,
                severity: r.severity,
            }));
            this.state.demo.dashboard.alertCount = data.rows.length;
        }
    }

    isNavActive(id) {
        const aliases = {
            vendors: ["vendor_create", "vendor_detail"],
            contractors: ["contractor_create"],
            contracts: ["contract_create"],
            workforce: ["worker_create"],
            passes: ["pass_create"],
            ptw: ["ptw_create"],
        };
        if (aliases[id] && aliases[id].includes(this.state.screen)) {
            return true;
        }
        return this.state.screen === id;
    }

    async go(screen) {
        this.state.screen = screen;
        this.state.menuOpen = false;
        this.state.search = "";
        const loaders = {
            dashboard: () => this.loadDashboard(),
            vendors: () => this.loadVendors(),
            contractors: () => this.loadContractors(),
            contracts: () => this.loadContracts(),
            workforce: () => this.loadWorkforce(),
            attendance: () => this.loadAttendance(),
            passes: () => this.loadPasses(),
            ptw: () => this.loadPtw(),
            documents: () => this.loadDocuments(),
            performance: () => this.loadPerformance(),
            reports: () => this.loadReports(),
            audit: () => this.loadAudit(),
            notifications: () => this.loadNotifications(),
        };
        if (loaders[screen]) {
            try {
                await loaders[screen]();
            } catch (error) {
                console.error(error);
            }
        }
    }

    toggleMenu() {
        this.state.menuOpen = !this.state.menuOpen;
    }

    filterRows(rows, fields) {
        const q = (this.state.search || "").trim().toLowerCase();
        if (!q) {
            return rows;
        }
        return rows.filter((row) => fields.some((f) => String(row[f] || "").toLowerCase().includes(q)));
    }

    get vendorRows() {
        return this.filterRows(this.d.vendors.rows, ["name", "code", "contact", "category", "site"]);
    }
    get contractorRows() {
        return this.filterRows(this.d.contractors.rows, ["name", "code", "category", "contact", "site"]);
    }
    get contractRows() {
        return this.filterRows(this.d.contracts.rows, ["code", "party", "category", "site"]);
    }
    get workforceRows() {
        return this.filterRows(this.d.workforce.rows, ["name", "code", "contractor", "skill"]);
    }
    get attendanceRows() {
        return this.filterRows(this.d.attendance.rows, ["name", "code", "contractor"]);
    }
    get passRows() {
        return this.filterRows(this.d.passes.rows, ["code", "worker", "company", "site"]);
    }
    get ptwRows() {
        return this.filterRows(this.d.ptw.rows, ["code", "activity", "party", "site"]);
    }
    get documentRows() {
        return this.filterRows(this.d.documents.rows, ["code", "name", "party", "type"]);
    }

    statusPct(part, total) {
        if (!total) {
            return 0;
        }
        return Math.round((part / total) * 100);
    }

    openCreateVendor() {
        this.state.vendorForm = this._blankVendorForm();
        this.state.screen = "vendor_create";
    }

    openCreateContractor() {
        this.state.contractorForm = this._blankContractorForm();
        this.state.screen = "contractor_create";
    }

    openCreateContract() {
        this.state.contractForm = this._blankContractForm();
        this.state.screen = "contract_create";
    }

    openCreateWorker() {
        this.state.workerForm = this._blankWorkerForm();
        this.state.screen = "worker_create";
    }

    openCreatePass() {
        this.state.passForm = this._blankPassForm();
        this.state.screen = "pass_create";
    }

    openCreatePtw() {
        this.state.ptwForm = this._blankPtwForm();
        this.state.screen = "ptw_create";
    }

    openVendorDetail(row) {
        this.state.selectedVendor = row;
        this.state.vendorTab = "overview";
        this.state.screen = "vendor_detail";
    }

    _blankVendorForm() {
        return {
            name: "",
            vendor_type: "",
            category: "",
            registration_date: "10/27/2023",
            contact_person: "",
            designation: "",
            phone: "",
            email: "",
            alternate: "",
            website: "",
            remarks: "",
        };
    }

    _blankContractorForm() {
        return {
            name: "",
            contact_person: "",
            contractor_type: "other",
            work_category: "",
            phone: "",
            email: "",
            site: this.d?.facility || "Main Facility",
            remarks: "",
        };
    }

    _blankContractForm() {
        const today = new Date().toISOString().slice(0, 10);
        return {
            name: "",
            contract_type: "service",
            vendor_id: "",
            contractor_id: "",
            site: this.d?.facility || "Main Facility",
            category: "",
            date_start: today,
            date_end: "",
            value: "",
            payment_terms: "",
        };
    }

    _blankWorkerForm() {
        return {
            name: "",
            contractor_id: "",
            skill: "",
            role: "",
            phone: "",
            site: this.d?.facility || "Main Facility",
            supervisor: "",
            emergency_contact: "",
        };
    }

    _blankPassForm() {
        return {
            visitor_name: "",
            company: "",
            phone: "",
            site: this.d?.facility || "Main Facility",
            purpose: "",
            validity_date: new Date().toISOString().slice(0, 10),
            pass_type: "temporary",
        };
    }

    _blankPtwForm() {
        return {
            work_activity: "",
            permit_type: "general",
            contractor_id: "",
            vendor_id: "",
            site: this.d?.facility || "Main Facility",
            location: "",
            risk_level: "medium",
            validity_date: new Date().toISOString().slice(0, 10),
            safety_checklist: "",
            ppe_checklist: "",
        };
    }

    _asInt(value) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) && n > 0 ? n : false;
    }

    async saveVendor(asDraft = true) {
        const f = this.state.vendorForm;
        if (!f.name) {
            this.notification.add("Vendor name is required", { type: "warning" });
            return;
        }
        try {
            const ids = await this.orm.create("vc.vendor", [
                {
                    name: f.name,
                    vendor_type: f.vendor_type || "company",
                    category: f.category || "other",
                    contact_person: f.contact_person,
                    designation: f.designation,
                    phone: f.phone,
                    email: f.email,
                    website: f.website,
                    remarks: f.remarks,
                    site: this.d.facility,
                    state: "draft",
                },
            ]);
            const vendorId = Array.isArray(ids) ? ids[0] : ids;
            if (!asDraft && vendorId) {
                await this.orm.call("vc.vendor", "action_submit", [[vendorId]]);
            }
            this.notification.add(asDraft ? "Vendor saved as draft" : "Vendor submitted", { type: "success" });
            await this.loadVendors();
            this.go("vendors");
        } catch (error) {
            console.error(error);
            this.notification.add(error.data?.message || error.message || "Could not save vendor", { type: "danger" });
        }
    }

    async saveContractor(asDraft = true) {
        const f = this.state.contractorForm;
        if (!f.name || !f.contact_person) {
            this.notification.add("Contractor name and contact person are required", { type: "warning" });
            return;
        }
        try {
            const ids = await this.orm.create("vc.contractor", [
                {
                    name: f.name,
                    contact_person: f.contact_person,
                    contractor_type: f.contractor_type || "other",
                    work_category: f.work_category,
                    phone: f.phone,
                    email: f.email,
                    site: f.site,
                    remarks: f.remarks,
                    state: "draft",
                },
            ]);
            const id = Array.isArray(ids) ? ids[0] : ids;
            if (!asDraft && id) {
                await this.orm.call("vc.contractor", "action_submit", [[id]]);
            }
            this.notification.add(asDraft ? "Contractor saved as draft" : "Contractor submitted", { type: "success" });
            await this.loadContractors();
            this.go("contractors");
        } catch (error) {
            console.error(error);
            this.notification.add(error.data?.message || error.message || "Could not save contractor", { type: "danger" });
        }
    }

    async saveContract(asDraft = true) {
        const f = this.state.contractForm;
        if (!f.name || !f.date_start || !f.date_end) {
            this.notification.add("Title, start date and end date are required", { type: "warning" });
            return;
        }
        try {
            const vals = {
                name: f.name,
                contract_type: f.contract_type || "service",
                site: f.site,
                category: f.category,
                date_start: f.date_start,
                date_end: f.date_end,
                value: f.value ? parseFloat(f.value) : 0,
                payment_terms: f.payment_terms,
                is_amc: f.contract_type === "amc",
                state: "draft",
            };
            const vendorId = this._asInt(f.vendor_id);
            const contractorId = this._asInt(f.contractor_id);
            if (vendorId) {
                vals.vendor_id = vendorId;
            }
            if (contractorId) {
                vals.contractor_id = contractorId;
            }
            const ids = await this.orm.create("vc.contract", [vals]);
            const id = Array.isArray(ids) ? ids[0] : ids;
            if (!asDraft && id) {
                await this.orm.call("vc.contract", "action_submit", [[id]]);
            }
            this.notification.add(asDraft ? "Contract saved as draft" : "Contract submitted", { type: "success" });
            await this.loadContracts();
            this.go("contracts");
        } catch (error) {
            console.error(error);
            this.notification.add(error.data?.message || error.message || "Could not save contract", { type: "danger" });
        }
    }

    async saveWorker(asDraft = true) {
        const f = this.state.workerForm;
        const contractorId = this._asInt(f.contractor_id);
        if (!f.name || !contractorId) {
            this.notification.add("Worker name and contractor ID are required", { type: "warning" });
            return;
        }
        if (!f.site) {
            this.notification.add("Site assignment is required", { type: "warning" });
            return;
        }
        try {
            const ids = await this.orm.create("vc.worker", [
                {
                    name: f.name,
                    contractor_id: contractorId,
                    skill: f.skill,
                    role: f.role,
                    phone: f.phone,
                    site: f.site,
                    supervisor: f.supervisor,
                    emergency_contact: f.emergency_contact,
                    state: "draft",
                },
            ]);
            const id = Array.isArray(ids) ? ids[0] : ids;
            if (!asDraft && id) {
                await this.orm.call("vc.worker", "action_submit", [[id]]);
            }
            this.notification.add(asDraft ? "Worker saved as draft" : "Worker submitted", { type: "success" });
            await this.loadWorkforce();
            this.go("workforce");
        } catch (error) {
            console.error(error);
            this.notification.add(error.data?.message || error.message || "Could not save worker", { type: "danger" });
        }
    }

    async savePass() {
        const f = this.state.passForm;
        if (!f.visitor_name || !f.site) {
            this.notification.add("Visitor name and site are required", { type: "warning" });
            return;
        }
        try {
            const res = await this._call("create_daily_pass", [
                {
                    visitor_name: f.visitor_name,
                    worker_name: f.visitor_name,
                    company: f.company,
                    phone: f.phone,
                    site: f.site,
                    purpose: f.purpose,
                    validity_date: f.validity_date,
                    pass_type: f.pass_type || "temporary",
                    state: "draft",
                },
            ]);
            if (res && res.success === false) {
                throw new Error(res.message || "Create failed");
            }
            this.notification.add("Daily pass created", { type: "success" });
            await this.loadPasses();
            this.go("passes");
        } catch (error) {
            console.error(error);
            this.notification.add(error.data?.message || error.message || "Could not create daily pass", { type: "danger" });
        }
    }

    async savePtw() {
        const f = this.state.ptwForm;
        if (!f.work_activity || !f.safety_checklist) {
            this.notification.add("Work activity and safety checklist are required", { type: "warning" });
            return;
        }
        try {
            const vals = {
                work_activity: f.work_activity,
                title: f.work_activity,
                permit_type: f.permit_type || "general",
                site: f.site,
                location: f.location,
                risk_level: f.risk_level || "medium",
                validity_date: f.validity_date,
                safety_checklist: f.safety_checklist,
                ppe_checklist: f.ppe_checklist,
                ppe_compliant: Boolean(f.ppe_checklist),
            };
            const contractorId = this._asInt(f.contractor_id);
            const vendorId = this._asInt(f.vendor_id);
            if (contractorId) {
                vals.contractor_id = contractorId;
            }
            if (vendorId) {
                vals.vendor_id = vendorId;
            }
            if (!contractorId && !vendorId) {
                this.notification.add("Provide contractor ID or vendor ID", { type: "warning" });
                return;
            }
            const res = await this._call("create_ptw", [vals]);
            if (res && res.success === false) {
                throw new Error(res.message || "Create failed");
            }
            this.notification.add("Permit created", { type: "success" });
            await this.loadPtw();
            this.go("ptw");
        } catch (error) {
            console.error(error);
            this.notification.add(error.data?.message || error.message || "Could not create PTW", { type: "danger" });
        }
    }

    badgeClass(key) {
        const map = {
            active: "vc-pill vc-pill-ok",
            present: "vc-pill vc-pill-ok",
            verified: "vc-pill vc-pill-ok",
            compliant: "vc-pill vc-pill-ok",
            valid: "vc-pill vc-pill-ok",
            excellent: "vc-pill vc-pill-ok",
            completed: "vc-pill vc-pill-ok",
            good: "vc-pill vc-pill-info",
            renewal: "vc-pill vc-pill-info",
            pending: "vc-pill vc-pill-warn",
            late: "vc-pill vc-pill-warn",
            expiring: "vc-pill vc-pill-warn",
            partial: "vc-pill vc-pill-warn",
            on_leave: "vc-pill vc-pill-warn",
            warn: "vc-pill vc-pill-warn",
            medium: "vc-pill vc-pill-warn",
            high: "vc-pill vc-pill-warn",
            action: "vc-pill vc-pill-bad",
            bad: "vc-pill vc-pill-bad",
            absent: "vc-pill vc-pill-bad",
            denied: "vc-pill vc-pill-bad",
            expired: "vc-pill vc-pill-bad",
            missing: "vc-pill vc-pill-bad",
            suspended: "vc-pill vc-pill-bad",
            critical: "vc-pill vc-pill-bad",
            rejected: "vc-pill vc-pill-bad",
            under_verification: "vc-pill vc-pill-warn",
            submitted: "vc-pill vc-pill-warn",
            draft: "vc-pill",
        };
        return map[String(key || "").toLowerCase()] || "vc-pill";
    }
}

registry.category("actions").add("vendor_and_contractor_management.app", VendorContractorApp, {
    force: true,
});
