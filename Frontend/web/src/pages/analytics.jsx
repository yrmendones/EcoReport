import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";
import { getCategoryColor } from "../categoryColors";

export default function Analytics() {
  const navigate = useNavigate();
  const menuItems = getMenuItems();

  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [summary, setSummary] = useState({
    total_reports: 0,
    avg_response_days: 0,
    resolution_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedYear, setSelectedYear] = useState("this");

  // ============================================================
  // FETCH ANALYTICS DATA
  // ============================================================
  const fetchAnalytics = async () => {
    try {
      setError("");

      const yearParam = selectedYear === "this"
        ? new Date().getFullYear()
        : new Date().getFullYear() - 1;

      const [catData, monthlyRes, summaryData] = await Promise.all([
        apiFetch("/api/admin/analytics/categories"),
        apiFetch(`/api/admin/analytics/monthly?year=${yearParam}`),
        apiFetch("/api/admin/analytics/summary"),
      ]);

      setCategoryData(catData);
      setMonthlyData(monthlyRes);
      setSummary(summaryData);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Failed to load analytics. Please try again.");
    } finally {
      // Only turn off loading on first fetch — subsequent fetches are silent
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  // ============================================================
  // PIE HELPERS
  // ============================================================
  const buildPieGradient = () => {
    if (categoryData.length === 0) return "conic-gradient(#e5e7eb 0deg 360deg)";
    const total = categoryData.reduce((sum, c) => sum + c.count, 0);
    if (total === 0) return "conic-gradient(#e5e7eb 0deg 360deg)";

    let currentAngle = 0;
    const segments = [];

    categoryData.forEach((cat) => {
      const angle = (cat.count / total) * 360;
      const color = getCategoryColor(cat.category);
      const start = currentAngle;
      const end = currentAngle + angle;
      segments.push(`${color} ${start}deg ${end - 1}deg`);
      segments.push(`#ffffff ${end - 1}deg ${end}deg`);
      currentAngle = end;
    });

    return `conic-gradient(from 0deg, ${segments.join(", ")})`;
  };

  const getSliceLabelPosition = (index) => {
    const total = categoryData.reduce((sum, c) => sum + c.count, 0);
    if (total === 0) return { left: "50%", top: "50%" };

    let angleBefore = 0;
    for (let i = 0; i < index; i++) {
      angleBefore += (categoryData[i].count / total) * 360;
    }
    const sliceAngle = (categoryData[index].count / total) * 360;
    const midAngle = angleBefore + sliceAngle / 2;

    const rad = (midAngle * Math.PI) / 180;
    const radiusPct = 30;
    const left = 50 + radiusPct * Math.sin(rad);
    const top = 50 - radiusPct * Math.cos(rad);

    return { left: `${left}%`, top: `${top}%` };
  };

  const totalCategoryCount = categoryData.reduce((sum, c) => sum + c.count, 0);

  const maxCount = Math.max(...monthlyData.map((m) => m.count), 1);
  const yMax = Math.max(Math.ceil(maxCount / 10) * 10, 100);

  // ============================================================
  // EXPORT CSV
  // ============================================================
  const handleExportReport = () => {
    const year = selectedYear === "this"
      ? new Date().getFullYear()
      : new Date().getFullYear() - 1;

    const lines = [];
    lines.push(`EcoReport - Analytics Report`);
    lines.push(`Barangay Sto. Rosario Kanluran`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(``);

    lines.push(`SUMMARY`);
    lines.push(`Total Reports,${summary.total_reports}`);
    lines.push(`Average Response Time (days),${summary.avg_response_days}`);
    lines.push(`Resolution Rate,${summary.resolution_rate}%`);
    lines.push(``);

    lines.push(`REPORTS BY CATEGORY`);
    lines.push(`Category,Count,Percentage`);
    if (categoryData.length === 0) {
      lines.push(`No data,0,0%`);
    } else {
      categoryData.forEach((cat) => {
        const percent = totalCategoryCount > 0
          ? ((cat.count / totalCategoryCount) * 100).toFixed(2)
          : "0.00";
        lines.push(`"${cat.category}",${cat.count},${percent}%`);
      });
    }
    lines.push(``);

    lines.push(`MONTHLY TRENDS (${year})`);
    lines.push(`Month,Count`);
    monthlyData.forEach((m) => {
      lines.push(`${m.month},${m.count}`);
    });
    lines.push(``);
    lines.push(`--- End of Report ---`);

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `EcoReport-Analytics-${year}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="analytics-page">

      <main className="main-content" style={{ backgroundColor: "#ffffff" }}>
        <header className="top-header" style={{ backgroundColor: "#13471e" }}>
          <h2>Analytics & Reports</h2>
          <ProfileHeaderButton />
        </header>

        <section className="analytics-content">
          {error && (
            <div className="error-banner">
              <p>{error}</p>
              <button onClick={fetchAnalytics}>Retry</button>
            </div>
          )}

          {/* Show loading only inside content — shell stays visible */}
          {loading ? (
            <div className="analytics-loading">Loading analytics...</div>
          ) : (
            <>
              <div className="charts-row">
                {/* PIE CHART */}
                <div className="category-section">
                  <h3>Reports by Category</h3>
                  <div className="pie-area">
                    <div
                      className="pie-chart"
                      style={{ background: buildPieGradient() }}
                    >
                      {categoryData.map((cat, idx) => {
                        const percent = totalCategoryCount > 0
                          ? Math.round((cat.count / totalCategoryCount) * 100)
                          : 0;
                        if (percent < 3) return null;
                        return (
                          <span
                            key={idx}
                            className="pie-slice-label"
                            style={getSliceLabelPosition(idx)}
                          >
                            {percent}%
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="pie-legend">
                    {categoryData.map((cat, idx) => (
                      <div key={idx} className="legend-item">
                        <span
                          className="legend-dot"
                          style={{ background: getCategoryColor(cat.category) }}
                        />
                        <span className="legend-label">
                          {cat.category} ({cat.count})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BAR CHART */}
                <div className="trends-section">
                  <div className="trends-title-row">
                    <h3>
                      Monthly Trends (
                      {selectedYear === "this"
                        ? new Date().getFullYear()
                        : new Date().getFullYear() - 1}
                      )
                    </h3>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      <option value="this">This Year</option>
                      <option value="last">Last Year</option>
                    </select>
                  </div>
                  <div className="bar-chart">
                    <div className="y-axis">
                      <span>{yMax}</span>
                      <span>{Math.round(yMax * 0.75)}</span>
                      <span>{Math.round(yMax * 0.5)}</span>
                      <span>{Math.round(yMax * 0.25)}</span>
                      <span>0</span>
                    </div>
                    <div className="chart-area">
                      <div className="grid-line line-100"></div>
                      <div className="grid-line line-75"></div>
                      <div className="grid-line line-50"></div>
                      <div className="grid-line line-25"></div>
                      <div className="grid-line line-0"></div>

                      <div className="bars">
                        {monthlyData.map((item, index) => {
                          const heightPercent = yMax > 0 ? (item.count / yMax) * 100 : 0;
                          return (
                            <div className="bar-column" key={index}>
                              <div
                                className="bar"
                                style={{
                                  height: `${heightPercent}%`,
                                  minHeight: item.count > 0 ? "4px" : "0",
                                }}
                                title={`${item.month}: ${item.count} report${item.count !== 1 ? "s" : ""}`}
                              >
                                {item.count > 0 && (
                                  <span className="bar-value">{item.count}</span>
                                )}
                              </div>
                              <span className="bar-month">{item.month}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="summary-row">
                <div className="summary-card">
                  <div className="summary-title">Total Reports</div>
                  <div className="summary-value">{summary.total_reports}</div>
                </div>
                <div className="summary-card">
                  <div className="summary-title">Avg. Response Time</div>
                  <div className="summary-value">{summary.avg_response_days} Days</div>
                </div>
                <div className="summary-card">
                  <div className="summary-title">Resolution Rate</div>
                  <div className="summary-value">{summary.resolution_rate}%</div>
                </div>
              </div>

              <div className="export-area">
                <button
                  type="button"
                  className="export-button"
                  onClick={handleExportReport}
                >
                  Export Report (CSV)
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .analytics-page { width: 100vw; height: 100vh; display: flex; background: #ffffff; overflow: hidden; }

        .sidebar { position: relative; width: 320px; min-width: 320px; height: 100vh; flex-shrink: 0; background: #13471e; overflow: hidden; }
        .sidebar-background { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0; pointer-events: none; }
        .sidebar-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,77,30,0.91) 0%, rgba(3,76,29,0.87) 100%); z-index: 1; pointer-events: none; }
        .sidebar-content { position: relative; z-index: 2; width: 100%; height: 100%; }
        .sidebar-brand { height: 86px; display: flex; align-items: center; padding-left: 36px; gap: 10px; }
        .sidebar-brand-image { width: 51.7px; height: 54px; object-fit: contain; display: block; flex-shrink: 0; }
        .sidebar-brand-name { color: #fff9df; font-size: 20px; font-weight: 800; line-height: 1; white-space: nowrap; }
        .sidebar-barangay { height: 5px; display: flex; align-items: center; padding-left: 70px; color: #fff9df; font-size: 11px; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.14); }
        .sidebar-menu { width: 100%; padding-top: 5px; }
        .menu-item { width: 100%; height: 30px; border: none; margin: 0; padding: 0 14px 0 42px; display: flex; align-items: center; gap: 14px; background: transparent; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 500; text-align: left; cursor: pointer; transition: background 0.15s ease; }
        .menu-item:hover { background: rgba(255,255,255,0.09); }
        .menu-item.active { background: rgba(0,0,0,0.28); padding-left: 38px; font-weight: 700; }
        .menu-icon { width: 30px; height: 28px; object-fit: contain; display: block; flex-shrink: 0; }
        .menu-text { white-space: nowrap; line-height: 0; }

        .main-content { width: calc(100vw - 320px); height: 100vh; min-width: 0; padding: 0 12px 10px 12px; overflow: hidden; background: #ffffff; }
        .top-header { width: calc(100% + 24px); height: 76px; margin-left: -12px; padding: 0 24px 0 18px; display: flex; align-items: center; justify-content: space-between; background: #13471e; }
        .top-header h2 { margin: 0; color: #ffffff; font-size: 12px; font-weight: 800; line-height: 1; }
        .profile-image { width: 48px; height: 48px; object-fit: cover; display: block; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.20); }

        .analytics-content { width: 100%; height: calc(100vh - 76px); padding: 14px 4px 0 4px; overflow: auto; background: #ffffff; }

        /* ✅ Loading stays inside the content — no shell unmount */
        .analytics-loading {
          width: 100%;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 14px;
        }

        .error-banner { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 10px 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 12px; }
        .error-banner button { background: #0B5D2A; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; }

        .charts-row { width: 100%; display: flex; gap: 28px; }

        .category-section { width: 45%; display: flex; flex-direction: column; }
        .trends-section { width: 55%; display: flex; flex-direction: column; }

        .category-section h3 { margin: 0 0 10px 2px; color: #111111; font-size: 11px; font-weight: 800; }

        /* PIE */
        .pie-area { width: 100%; height: 220px; display: flex; align-items: center; justify-content: center; }
        .pie-chart {
          position: relative;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .pie-slice-label {
          position: absolute;
          transform: translate(-50%, -50%);
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          text-shadow: 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.8);
          pointer-events: none;
          z-index: 5;
        }

        .pie-legend {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding-left: 20px;
          max-height: 250px;
          overflow-y: auto;
        }
        .pie-legend .legend-item { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #333; }
        .pie-legend .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .pie-legend .legend-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .trends-title-row { display: flex; align-items: center; justify-content: space-between; margin: 0 2px 10px 2px; }
        .trends-title-row h3 { margin: 0; color: #111111; font-size: 11px; font-weight: 800; }
        .trends-title-row select { width: 108px; height: 27px; padding: 0 8px; border: 1px solid #71866a; border-radius: 4px; background: #ffffff; color: #222222; font-size: 11px; font-weight: 600; outline: none; cursor: pointer; }

        /* BAR CHART */
        .bar-chart { width: 100%; height: 245px; display: flex; }
        .y-axis { width: 30px; height: 205px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-right: 6px; color: #333; font-size: 8px; }
        .chart-area { position: relative; flex: 1; height: 205px; border-bottom: 1px solid #dddddd; }
        .grid-line { position: absolute; left: 0; right: 0; height: 1px; background: #eeeeee; }
        .line-100 { top: 0; }
        .line-75 { top: 25%; }
        .line-50 { top: 50%; }
        .line-25 { top: 75%; }
        .line-0 { bottom: 0; }

        .bars { position: absolute; left: 8px; right: 8px; bottom: 0; top: 0; display: flex; align-items: flex-end; justify-content: space-around; gap: 4px; }
        .bar-column { height: 100%; flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative; }
        .bar {
          width: 100%;
          max-width: 40px;
          border-radius: 4px 4px 0 0;
          position: relative;
          background: #4d7df0;
          transition: height 0.3s ease;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 2px;
        }
        .bar-value { color: #fff; font-size: 8px; font-weight: 700; line-height: 1; }
        .bar-month { position: absolute; bottom: -14px; color: #333; font-size: 8px; font-weight: 500; }

        .bar-column:nth-child(1) .bar { background: #4d7df0; }
        .bar-column:nth-child(2) .bar { background: #a583e8; }
        .bar-column:nth-child(3) .bar { background: #f4b765; }
        .bar-column:nth-child(4) .bar { background: #ffdc55; }
        .bar-column:nth-child(5) .bar { background: #ed6f79; }
        .bar-column:nth-child(6) .bar { background: #d967b5; }
        .bar-column:nth-child(7) .bar { background: #4d7df0; }
        .bar-column:nth-child(8) .bar { background: #a583e8; }
        .bar-column:nth-child(9) .bar { background: #f4b765; }
        .bar-column:nth-child(10) .bar { background: #ffdc55; }
        .bar-column:nth-child(11) .bar { background: #ed6f79; }
        .bar-column:nth-child(12) .bar { background: #d967b5; }

        .summary-row { width: 100%; height: 68px; display: flex; gap: 10px; margin-top: 30px; padding: 0 25px; }
        .summary-card {
          flex: 1; height: 57px; border: 1px solid #8ca692; background: #ffffff;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }
        .summary-title { color: #275328; font-size: 9px; font-weight: 700; margin-bottom: 7px; }
        .summary-value { color: #194c18; font-size: 21px; font-weight: 800; line-height: 1; }

        .export-area { width: 100%; display: flex; justify-content: center; margin-top: 22px; padding-bottom: 20px; }
        .export-button {
          width: 180px; height: 32px; border: none; border-radius: 3px;
          background: #397045; color: #ffffff; font-size: 10px; font-weight: 700;
          cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.18);
        }
        .export-button:hover { background: #285d35; }

        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
        }
        @media (max-width: 850px) {
          body { overflow: auto; }
          .analytics-page { width: 1100px; min-width: 1100px; height: 100vh; }
        }
      `}</style>
    </div>
  );
}