import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

const ID_TYPE_OPTIONS = [
  "Barangay ID",
  "Driver's License",
  "ePhilID / Digital National ID",
  "National ID (PhilID)",
  "National Police Clearance",
  "PWD ID",
  "Postal ID",
  "Senior Citizen ID",
  "Unified Multi-purpose ID (UMID)",
];

const LOCKOUT_OPTIONS = [
  { value: "5", label: "5 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "0", label: "Until an admin unlocks it" },
];

const DEFAULT_FORM = {
  barangay_name: "",
  contact_email: "",
  contact_number: "",
  address: "",
  pending_flag_days: "3",
  required_id_type: "Barangay ID",
  covered_zones: "",
  min_password_length: "8",
  max_login_attempts: "5",
  web_session_timeout: "30",
  lockout_duration: "15",
  require_strong_password: true,
  email_notifications: true,
  announcement_alerts: true,
  maintenance_mode: false,
  maintenance_message: "The app is under maintenance. Please try again later.",
  categories: [],
};

export default function SystemSettings() {
  const navigate = useNavigate();
  const menuItems = getMenuItems("/systemsettings");

  const [settings, setSettings] = useState(DEFAULT_FORM);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");

  // ─────────────────────────────────────────────
  // LOAD
  // ─────────────────────────────────────────────
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/admin/settings");

      const boolOr = (v, fallback) => {
        if (v === true || v === 1) return true;
        if (v === false || v === 0) return false;
        return fallback;
      };

      const normalized = {
        barangay_name: data.barangay_name || "",
        contact_email: data.contact_email || "",
        contact_number: data.contact_number || "",
        address: data.address || "",
        pending_flag_days: String(data.pending_flag_days ?? "3"),
        required_id_type: data.required_id_type || "Barangay ID",
        covered_zones: data.covered_zones || "",
        min_password_length: String(data.min_password_length ?? "8"),
        max_login_attempts: String(data.max_login_attempts ?? "5"),
        web_session_timeout: String(data.web_session_timeout ?? "30"),
        lockout_duration: String(data.lockout_duration ?? "15"),
        require_strong_password: boolOr(data.require_strong_password, true),
        email_notifications: boolOr(data.email_notifications, true),
        announcement_alerts: boolOr(data.announcement_alerts, true),
        maintenance_mode: boolOr(data.maintenance_mode, false),
        maintenance_message:
          data.maintenance_message ||
          "The app is under maintenance. Please try again later.",
        categories: Array.isArray(data.categories) ? data.categories : [],
      };

      setSettings(normalized);
      setOriginalSettings(normalized);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      setError("Failed to load system settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // ─────────────────────────────────────────────
  // FIELD CHANGE
  // ─────────────────────────────────────────────
  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSavedMessage("");
  };

  // ─────────────────────────────────────────────
  // CATEGORIES
  // ─────────────────────────────────────────────
  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name) {
      setCategoryError("Enter a category name.");
      return;
    }
    const exists = settings.categories.some(
      (c) => c.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setCategoryError("That category already exists.");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      categories: [...prev.categories, name],
    }));
    setNewCategory("");
    setCategoryError("");
    setSavedMessage("");
  };

  const handleRemoveCategory = (name) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== name),
    }));
    setSavedMessage("");
  };

  const handleCategoryKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCategory();
    }
  };

  // ─────────────────────────────────────────────
  // SAVE / RESET / EXPORT
  // ─────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSavedMessage("");

    try {
      await apiFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...settings,
          pending_flag_days: parseInt(settings.pending_flag_days, 10) || 3,
          min_password_length: parseInt(settings.min_password_length, 10) || 8,
          max_login_attempts: parseInt(settings.max_login_attempts, 10) || 5,
          web_session_timeout: parseInt(settings.web_session_timeout, 10) || 30,
          lockout_duration: parseInt(settings.lockout_duration, 10) || 15,
        }),
      });
      setOriginalSettings(settings);
      setSavedMessage("Settings saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setNewCategory("");
    setCategoryError("");
    setSavedMessage("");
    setError("");
  };

  const handleExportCSV = () => {
    const rows = [
      ["Setting", "Value"],
      ...Object.entries(settings).map(([k, v]) => [
        k,
        Array.isArray(v) ? v.join("; ") : String(v),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `system-settings-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────
  // REUSABLE TOGGLE ROW
  // ─────────────────────────────────────────────
  const ToggleRow = ({ label, description, field }) => (
    <div className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        <div className="toggle-description">{description}</div>
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={settings[field]}
          onChange={(e) => handleChange(field, e.target.checked)}
        />
        <span className="slider"></span>
      </label>
    </div>
  );

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <>
      <div className="settings-page">
        <aside className="sidebar">
          <img src="/sidebar.png" alt="" className="sidebar-background" />
          <div className="sidebar-overlay"></div>
          <div className="sidebar-content">
            <div className="sidebar-brand">
              <img src="/lightleaf.png" alt="EcoReport" className="sidebar-brand-image" />
              <span className="sidebar-brand-name">EcoReport</span>
            </div>
            <div className="sidebar-barangay">Barangay Sto. Rosario Kanluran</div>
            <nav className="sidebar-menu">
              {menuItems.map((item, i) => (
                <button key={i} type="button"
                  className={`menu-item ${item.active ? "active" : ""}`}
                  onClick={() => navigate(item.path)}>
                  <img src={item.icon} alt="" className="menu-icon" />
                  <span className="menu-text">{item.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="main-content">
          <header className="top-header">
            <h2>System Settings</h2>
            <ProfileHeaderButton />
          </header>

          <section className="settings-content">
            {loading ? (
              <div className="settings-card" style={{ padding: 40, textAlign: "center", color: "#666" }}>
                Loading settings…
              </div>
            ) : (
              <>
                {/* GENERAL */}
                <div className="settings-card">
                  <h3>General</h3>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="barangayName">Barangay name</label>
                      <input id="barangayName" type="text"
                        value={settings.barangay_name}
                        onChange={(e) => handleChange("barangay_name", e.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="contactEmail">Contact email</label>
                      <input id="contactEmail" type="email"
                        placeholder="barangay@email.com"
                        value={settings.contact_email}
                        onChange={(e) => handleChange("contact_email", e.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="contactNumber">Contact number</label>
                      <input id="contactNumber" type="text"
                        placeholder="09XXXXXXXXX"
                        value={settings.contact_number}
                        onChange={(e) => handleChange("contact_number", e.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="address">Barangay hall address</label>
                      <input id="address" type="text"
                        value={settings.address}
                        onChange={(e) => handleChange("address", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* VERIFICATION */}
                <div className="settings-card">
                  <h3>Verification</h3>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="pendingFlagDays">Flag pending accounts after (days)</label>
                      <input id="pendingFlagDays" type="number" min="1"
                        value={settings.pending_flag_days}
                        onChange={(e) => handleChange("pending_flag_days", e.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="requiredIdType">Required ID type</label>
                      <select id="requiredIdType"
                        value={settings.required_id_type}
                        onChange={(e) => handleChange("required_id_type", e.target.value)}>
                        {ID_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="field field-full">
                      <label htmlFor="coveredZones">Covered purok / zones</label>
                      <input id="coveredZones" type="text"
                        placeholder="Purok 1, Purok 2, Purok 3"
                        value={settings.covered_zones}
                        onChange={(e) => handleChange("covered_zones", e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* ACCOUNT AND SECURITY */}
                <div className="settings-card">
                  <h3>Account and Security</h3>
                  <div className="form-grid form-grid-3">
                    <div className="field">
                      <label htmlFor="minPasswordLength">Minimum password length</label>
                      <input id="minPasswordLength" type="number" min="6" max="30"
                        value={settings.min_password_length}
                        onChange={(e) => handleChange("min_password_length", e.target.value)} />
                    </div>
                    <div className="field">
                      <label htmlFor="maxLoginAttempts">Lock after failed logins</label>
                      <input id="maxLoginAttempts" type="number" min="1" max="20"
                        value={settings.max_login_attempts}
                        onChange={(e) => handleChange("max_login_attempts", e.target.value)} />
                      <span style={{ fontSize: "8px", color: "#9ca3af" }}>
                        Failed attempts before the account is locked
                      </span>
                    </div>
                    <div className="field">
                      <label htmlFor="webSessionTimeout">Web session timeout (minutes)</label>
                      <input id="webSessionTimeout" type="number" min="5" max="1440"
                        value={settings.web_session_timeout}
                        onChange={(e) => handleChange("web_session_timeout", e.target.value)} />
                    </div>
                  </div>

                  <div className="field field-small security-extra">
                    <label htmlFor="lockoutDuration">Lock duration</label>
                    <select id="lockoutDuration"
                      value={settings.lockout_duration}
                      onChange={(e) => handleChange("lockout_duration", e.target.value)}>
                      {LOCKOUT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <span style={{ fontSize: "8px", color: "#9ca3af" }}>
                      How long the account stays locked. "Until admin unlocks" requires manual reset.
                    </span>
                  </div>

                  <ToggleRow
                    label="Require strong passwords"
                    description="At least 8 characters with letters and numbers."
                    field="require_strong_password"
                  />
                </div>

                {/* REPORT CATEGORIES */}
                <div className="settings-card">
                  <h3>Report Categories</h3>
                  <div className="toggle-description category-help">
                    Categories residents can choose when submitting a report.
                    Changes apply to the mobile app after saving.
                  </div>

                  <div className="category-list">
                    {settings.categories.length === 0 && (
                      <span className="category-empty">No categories yet.</span>
                    )}
                    {settings.categories.map((cat) => (
                      <span className="category-chip" key={cat}>
                        {cat}
                        <button type="button" className="category-remove"
                          onClick={() => handleRemoveCategory(cat)}
                          aria-label={`Remove ${cat}`}>×</button>
                      </span>
                    ))}
                  </div>

                  <div className="category-add-row">
                    <input type="text" placeholder="New category name"
                      value={newCategory}
                      onChange={(e) => { setNewCategory(e.target.value); setCategoryError(""); }}
                      onKeyDown={handleCategoryKeyDown} />
                    <button type="button" className="add-category-button"
                      onClick={handleAddCategory}>
                      Add category
                    </button>
                  </div>
                  {categoryError && (
                    <div className="category-error">{categoryError}</div>
                  )}
                </div>

                {/* NOTIFICATIONS */}
                <div className="settings-card">
                  <h3>Notifications</h3>
                  <ToggleRow
                    label="Email notifications"
                    description="Send system updates to the contact email."
                    field="email_notifications"
                  />
                  <ToggleRow
                    label="Announcement alerts"
                    description="Notify residents when an announcement is posted."
                    field="announcement_alerts"
                  />
                </div>

                {/* MAINTENANCE */}
                <div className="settings-card">
                  <h3>System Maintenance</h3>

                  <div className="maintenance-row">
                    <div className="maintenance-text">
                      <span className="toggle-label">Maintenance mode</span>
                      <span className="maintenance-description">
                        Residents see "Under maintenance"
                      </span>
                    </div>
                    <input type="checkbox" className="maintenance-checkbox"
                      aria-label="Maintenance mode"
                      checked={settings.maintenance_mode}
                      onChange={(e) => handleChange("maintenance_mode", e.target.checked)} />
                  </div>

                  <div className="field maintenance-field">
                    <label htmlFor="maintenanceMessage">Maintenance message</label>
                    <input id="maintenanceMessage" type="text"
                      value={settings.maintenance_message}
                      onChange={(e) => handleChange("maintenance_message", e.target.value)} />
                  </div>

                  <button type="button" className="export-button" onClick={handleExportCSV}>
                    Export settings (CSV)
                  </button>
                </div>

                {/* ACTIONS */}
                <div className="settings-actions">
                  {error && <span className="saved-message" style={{ color: "#b91c1c" }}>{error}</span>}
                  {savedMessage && !error && <span className="saved-message">{savedMessage}</span>}
                  <button type="button" className="reset-button" onClick={handleReset}>
                    Reset
                  </button>
                  <button type="button" className="save-button"
                    onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .settings-page {
          width: 100vw; height: 100vh; display: flex;
          background: #ffffff; overflow: hidden;
        }

        /* SIDEBAR */
        .sidebar {
          position: relative; width: 320px; min-width: 320px;
          height: 100vh; flex-shrink: 0; background: #13471e; overflow: hidden;
        }
        .sidebar-background {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: center; z-index: 0; pointer-events: none;
        }
        .sidebar-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(3,77,30,0.91) 0%, rgba(3,76,29,0.87) 100%);
          z-index: 1; pointer-events: none;
        }
        .sidebar-content { position: relative; z-index: 2; width: 100%; height: 100%; }
        .sidebar-brand { height: 86px; display: flex; align-items: center; padding-left: 36px; gap: 10px; }
        .sidebar-brand-image { width: 51.7px; height: 54px; object-fit: contain; display: block; flex-shrink: 0; }
        .sidebar-brand-name { color: #fff9df; font-size: 20px; font-weight: 800; line-height: 1; white-space: nowrap; }
        .sidebar-barangay {
          height: 5px; display: flex; align-items: center; padding-left: 70px;
          color: #fff9df; font-size: 11px; font-weight: 500;
          border-bottom: 1px solid rgba(255,255,255,0.14);
        }
        .sidebar-menu {
          width: 100%; padding-top: 5px;
          max-height: calc(100vh - 96px); overflow-y: auto;
        }
        .menu-item {
          width: 100%; height: 30px; border: none; margin: 0;
          padding: 0 14px 0 42px; display: flex; align-items: center; gap: 14px;
          background: transparent; color: #ffffff;
          font-family: inherit; font-size: 15px; font-weight: 500;
          text-align: left; cursor: pointer; transition: background 0.15s ease;
        }
        .menu-item:hover { background: rgba(255,255,255,0.09); }
        .menu-item.active { background: rgba(0,0,0,0.28); padding-left: 38px; font-weight: 700; }
        .menu-icon { width: 30px; height: 28px; object-fit: contain; display: block; flex-shrink: 0; }
        .menu-text { white-space: nowrap; line-height: 1; }

        /* MAIN */
        .main-content {
          width: calc(100vw - 320px); height: 100vh; min-width: 0;
          padding: 0 12px 10px 12px; overflow: hidden; background: #ffffff;
        }
        .top-header {
          width: calc(100% + 24px); height: 76px; margin-left: -12px;
          padding: 0 24px 0 18px;
          display: flex; align-items: center; justify-content: space-between;
          background: #13471e;
        }
        .top-header h2 { margin: 0; color: #ffffff; font-size: 12px; font-weight: 800; line-height: 1; }

        /* CONTENT */
        .settings-content {
          width: 100%; height: calc(100vh - 76px);
          padding: 18px 0 24px 0;
          overflow-y: auto; background: #ffffff;
        }

        .settings-card {
          width: 100%; margin-bottom: 14px;
          padding: 16px 18px;
          border: 1px solid #78957e; border-radius: 3px;
          background: #ffffff;
        }
        .settings-card h3 {
          margin: 0 0 12px 0; font-size: 11px; font-weight: 800; color: #13471e;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px 18px;
        }
        .form-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .field-full { grid-column: 1 / -1; }
        .field { display: flex; flex-direction: column; gap: 4px; }
        .field label {
          font-size: 9px; font-weight: 700; color: #333333;
        }
        .field input, .field select {
          height: 26px; padding: 0 8px;
          border: 1px solid #a9b0ad; border-radius: 3px;
          background: #ffffff; color: #333333;
          font-family: inherit; font-size: 9px;
        }
        .field input:focus, .field select:focus {
          outline: 2px solid #347145; outline-offset: 1px;
        }
        .field-small { width: 220px; }
        .security-extra { margin: 12px 0 8px 0; }

        /* CATEGORIES */
        .category-help { margin: -6px 0 10px 0; }
        .category-list {
          display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;
        }
        .category-empty { font-size: 9px; color: #666666; }
        .category-chip {
          display: inline-flex; align-items: center; gap: 6px;
          height: 24px; padding: 0 6px 0 10px;
          border: 1px solid #78957e; border-radius: 12px;
          background: #eef5f0; color: #13471e;
          font-size: 9px; font-weight: 700;
        }
        .category-remove {
          width: 16px; height: 16px; padding: 0; border: none;
          border-radius: 50%; background: transparent;
          color: #13471e; font-size: 13px; line-height: 1; cursor: pointer;
        }
        .category-remove:hover { background: #d4e3d8; color: #b00000; }
        .category-add-row {
          display: flex; gap: 8px; max-width: 420px;
        }
        .category-add-row input {
          flex: 1; height: 26px; padding: 0 8px;
          border: 1px solid #a9b0ad; border-radius: 3px;
          background: #ffffff; color: #333333;
          font-family: inherit; font-size: 9px;
        }
        .category-add-row input:focus {
          outline: 2px solid #347145; outline-offset: 1px;
        }
        .add-category-button {
          height: 26px; padding: 0 12px;
          border: none; border-radius: 3px;
          background: #347145; color: #ffffff;
          font-family: inherit; font-size: 9px; font-weight: 700;
          cursor: pointer;
        }
        .add-category-button:hover { background: #285d37; }
        .category-error {
          margin-top: 6px; font-size: 8px; font-weight: 700; color: #b00000;
        }

        /* TOGGLES */
        .toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 10px 0;
          border-top: 1px solid #e3ebe5;
        }
        .toggle-label { font-size: 9px; font-weight: 700; color: #222222; }
        .toggle-description {
          margin-top: 2px; font-size: 8px; color: #666666;
        }
        .switch {
          position: relative; display: inline-block;
          width: 30px; height: 16px; flex-shrink: 0;
        }
        .switch input {
          position: absolute; opacity: 0;
          width: 100%; height: 100%; margin: 0;
          cursor: pointer; z-index: 1;
        }
        .slider {
          position: absolute; inset: 0;
          border-radius: 16px; background: #b5bfb8;
          transition: background 0.15s ease;
        }
        .slider::before {
          content: ""; position: absolute;
          left: 2px; top: 2px; width: 12px; height: 12px;
          border-radius: 50%; background: #ffffff;
          transition: transform 0.15s ease;
        }
        .switch input:checked + .slider { background: #347145; }
        .switch input:checked + .slider::before { transform: translateX(14px); }

        /* MAINTENANCE */
        .maintenance-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; margin-bottom: 12px;
        }
        .maintenance-text { display: flex; align-items: baseline; gap: 6px; }
        .maintenance-description { font-size: 8px; color: #666666; }
        .maintenance-checkbox {
          width: 16px; height: 16px; margin: 0;
          accent-color: #347145; cursor: pointer;
        }
        .maintenance-field { margin-bottom: 12px; }
        .export-button {
          height: 26px; padding: 0 14px;
          border: 1px solid #347145; border-radius: 3px;
          background: #ffffff; color: #347145;
          font-family: inherit; font-size: 9px; font-weight: 700;
          cursor: pointer;
        }
        .export-button:hover { background: #eef5f0; }

        /* ACTIONS */
        .settings-actions {
          display: flex; align-items: center;
          justify-content: flex-end; gap: 10px;
        }
        .saved-message {
          margin-right: auto; font-size: 9px;
          font-weight: 700; color: #287128;
        }
        .reset-button, .save-button {
          height: 26px; padding: 0 14px;
          border-radius: 3px; font-family: inherit;
          font-size: 9px; font-weight: 700; cursor: pointer;
        }
        .reset-button {
          border: 1px solid #347145;
          background: #ffffff; color: #347145;
        }
        .save-button {
          border: none; background: #347145; color: #ffffff;
        }
        .save-button:hover:not(:disabled) { background: #285d37; }
        .save-button:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
        }
      `}</style>
    </>
  );
}