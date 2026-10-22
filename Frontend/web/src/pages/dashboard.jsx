import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { getMenuItems } from "../menu";
import ProfileHeaderButton from "../components/ProfileHeaderButton";
import { getCategoryColor } from "../categoryColors";

export default function Dashboard() {
  const navigate = useNavigate();
  const menuItems = getMenuItems();

  const [stats, setStats] = useState({
    total: 0, pending: 0, ongoing: 0, resolved: 0, rejected: 0,
  });
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminName, setAdminName] = useState("Admin");
  const [selectedYear, setSelectedYear] = useState("this");

    const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const admin = JSON.parse(localStorage.getItem("admin") || "{}");
      if (admin.full_name) setAdminName(admin.full_name);

      const yearParam = selectedYear === "this"
        ? new Date().getFullYear()
        : new Date().getFullYear() - 1;

      const [statsData, catData, monthlyRes] = await Promise.all([
        apiFetch("/api/admin/stats"),
        apiFetch("/api/admin/analytics/categories"),
        apiFetch(`/api/admin/analytics/monthly?year=${yearParam}`),
      ]);

      setStats(statsData);
      setCategoryData(catData);
      setMonthlyData(monthlyRes);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const reportCards = [
    { title: "Total Reports", number: stats.total, description: "All reports submitted" },
    { title: "Pending Reports", number: stats.pending, description: "Awaiting action" },
    { title: "Ongoing Reports", number: stats.ongoing, description: "In progress" },
    { title: "Resolved Reports", number: stats.resolved, description: "Completed" },
    { title: "Rejected Reports", number: stats.rejected, description: "Not approved" },
  ];

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
    const radiusPct = 32;
    const left = 50 + radiusPct * Math.sin(rad);
    const top = 50 - radiusPct * Math.cos(rad);

    return { left: `${left}%`, top: `${top}%` };
  };

  const totalCategoryCount = categoryData.reduce((sum, c) => sum + c.count, 0);

  // Dynamic Y-axis: round max count up to the nearest 10, minimum 100
  const maxMonthlyCount = Math.max(...monthlyData.map((m) => m.count), 0);
  const yMax = Math.max(Math.ceil(maxMonthlyCount / 10) * 10, 100);

  // Y-axis tick labels (100%, 80%, 60%, 40%, 20%, 0%)
  const yTicks = [
    yMax,
    Math.round(yMax * 0.8),
    Math.round(yMax * 0.6),
    Math.round(yMax * 0.4),
    Math.round(yMax * 0.2),
    0,
  ];

  return (
    <>
      <div className="dashboard-page">

        <main className="main-content" style={{ backgroundColor: "#ffffff" }}>
          <header className="top-header" style={{ backgroundColor: "#13471e" }}>
            <h2>Dashboard Overview</h2>
            <ProfileHeaderButton />
          </header>

          <section className="welcome-section">
            <img
              src="/bgdashboard.png"
              alt=""
              className="welcome-background"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <div className="welcome-overlay"></div>

            <div className="welcome-content">
              <div className="welcome-text">
                <h1>{getGreeting()}, {adminName}!</h1>
                <p>Barangay Sto. Rosario Kanluran</p>
              </div>
            </div>

          <div className="report-cards">
            {reportCards.map((card, index) => (
              <div className="report-card" key={index}>
                <div className="report-title">{card.title}</div>
                <div className="report-number">{loading ? "..." : card.number}</div>
                <div className="report-description">{card.description}</div>
              </div>
           ))}
         </div>
       </section>

          <div className="dashboard-lower">
            <section className="category-panel">
              <h3>Reports by Category</h3>

              {loading ? (
                <div className="flex items-center justify-center h-full text-white">
                  <p>Loading categories...</p>
                </div>
              ) : categoryData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-white">
                  <p>No category data available</p>
                </div>
              ) : (
                <div className="category-content">
                  <div className="pie-wrapper">
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

                  <div className="category-legend">
                    {categoryData.map((item, index) => (
                      <div className="legend-item" key={index}>
                        <span
                          className="legend-dot"
                          style={{ background: getCategoryColor(item.category) }}
                        />
                        <span className="legend-text">
                          {item.category} ({item.count})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="monthly-panel">
              <div className="monthly-title-row">
                <h3>Monthly Reports Overview</h3>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="this">This Year</option>
                  <option value="last">Last Year</option>
                </select>
              </div>

              <div className="chart-container">
                {/* Y-axis with dynamic labels */}
                <div className="y-axis">
                  {loading ? (
                    <span>...</span>
                  ) : (
                    yTicks.map((tick, i) => (
                      <span key={i}>{tick}</span>
                    ))
                  )}
                </div>

                <div className="graph-container">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <p>Loading chart...</p>
                    </div>
                  ) : monthlyData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <p>No monthly data available</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid-line line-100"></div>
                      <div className="grid-line line-80"></div>
                      <div className="grid-line line-60"></div>
                      <div className="grid-line line-40"></div>
                      <div className="grid-line line-20"></div>
                      <div className="grid-line line-0"></div>

                      <svg
                        className="line-chart"
                        viewBox="0 0 600 200"
                        preserveAspectRatio="none"
                      >
                        {monthlyData.length > 1 && (
                          <>
                            <polyline
                              points={monthlyData
                                .map((item, index) => {
                                  const x = (index / (monthlyData.length - 1)) * 600 + 10;
                                  // Dynamic scaling: use yMax instead of hardcoded 100
                                  const y = 200 - (item.count / yMax) * 200;
                                  return `${x},${y}`;
                                })
                                .join(" ")}
                              fill="none"
                              stroke="#4a82ff"
                              strokeWidth="2"
                            />
                            {monthlyData.map((item, index) => {
                              const x = (index / (monthlyData.length - 1)) * 600 + 10;
                              // Same dynamic scaling for point dots
                              const y = 200 - (item.count / yMax) * 200;
                              return <circle key={index} cx={x} cy={y} r="4" fill="#4a82ff" />;
                            })}
                          </>
                        )}
                      </svg>

                      <div className="month-labels">
                        {monthlyData.map((item, index) => (
                          <span key={index}>{item.month}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; overflow: hidden; }

        .dashboard-page { width: 100vw; height: 100vh; display: flex; background: #ffffff; overflow: hidden; }

        .sidebar { position: relative; width: 320px; min-width: 320px; height: 100vh; flex-shrink: 0; background: #13471e; overflow: hidden; }
        .sidebar-background { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; opacity: 1; z-index: 0; pointer-events: none; }
        .sidebar-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,77,30,0.91) 0%, rgba(3,76,29,0.87) 100%); z-index: 1; pointer-events: none; }
        .sidebar-content { position: relative; z-index: 2; width: 100%; height: 100%; }
        .sidebar-brand { height: 86px; display: flex; align-items: center; padding-left: 36px; gap: 10px; }
        .sidebar-brand-image { width: 51.7px; height: 54px; object-fit: contain; display: block; flex-shrink: 0; }
        .sidebar-brand-name { color: #fff9df; font-size: 20px; font-weight: 800; line-height: 1; white-space: nowrap; }
        .sidebar-barangay { height: 5px; display: flex; align-items: center; padding-left: 70px; color: #fff9df; font-size: 11px; font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.14); }
        .sidebar-menu { width: 100%; padding-top: 5px; }
        .menu-item { width: 100%; height: 30px; border: none; margin: 0; padding: 0 14px 0 42px; display: flex; align-items: center; gap: 14px; background: transparent; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 50; text-align: left; cursor: pointer; transition: background 0.15s ease; }
        .menu-item:hover { background: rgba(255,255,255,0.09); }
        .menu-item.active { background: rgba(0,0,0,0.28); padding-left: 38px; font-weight: 700; }
        .menu-icon { width: 30px; height: 28px; object-fit: contain; display: block; flex-shrink: 0; }
        .menu-text { white-space: nowrap; line-height: 0; }

        .main-content { width: calc(100vw - 320px); height: 100vh; min-width: 0; padding: 0 12px 10px 12px; overflow: hidden; background: #ffffff; }
        .top-header { width: calc(100% + 24px); height: 76px; margin-left: -12px; padding: 0 24px 0 18px; display: flex; align-items: center; justify-content: space-between; background: #13471e; }
        .top-header h2 { margin: 0; color: #ffffff; font-size: 12px; font-weight: 800; line-height: 1; }
        .profile-image { width: 48px; height: 48px; object-fit: cover; display: block; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.20); }

        .welcome-section { position: relative; width: 100%; height: 240px; margin-top: 10px; margin-bottom: 12px; overflow: hidden; border-radius: 3px; background: linear-gradient(135deg, #2f6206 0%, #4a8715 55%, #6ba52a 100%); }
        .welcome-background { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; object-fit: cover; object-position: center center; z-index: 0; pointer-events: none; }
        .welcome-overlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(54,135,14,0.12), rgba(82,159,22,0.03)); z-index: 1; pointer-events: none; }

        .welcome-content { position: absolute; top: 29px; left: 122px; z-index: 2; }
        .welcome-text h1 { margin: 0; color: #ffffff; font-size: 17px; font-weight: 800; line-height: 1.05; }
        .welcome-text p { margin: 6px 0 0 0; color: #ffffff; font-size: 11px; font-weight: 500; }

        .report-cards {
          position: absolute;
          left: 112px;
          right: 112px;
          bottom: 16px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 24px;
          z-index: 3;
        }
        .report-card {
          height: 104px;
          padding: 12px 11px;
          background: #fffcf0;
          border: 1px solid #1c4000;
          border-radius: 2px;
          box-shadow: 0 2px 3px rgba(0,0,0,0.16);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .report-title { color: #13471e; font-size: 10px; font-weight: 900; line-height: 1.4; margin-bottom: 4px; }
        .report-number { color: #13471e; font-size: 22px; font-weight: 900; line-height: 1.3; }
        .report-description { margin-top: 6px; color: #13471e; font-size: 7px; text-align: center; line-height: 1.2; }

        .dashboard-lower { width: 100%; height: calc(100vh - 338px); min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; overflow: hidden; }

        .category-panel { min-width: 0; min-height: 0; background: #376b43; border-radius: 4px; padding: 20px 22px; overflow: hidden; }
        .category-panel h3 { margin: 0 0 10px 0; color: #ffffff; font-size: 14px; font-weight: 800; }
        .category-content { width: 100%; height: calc(100% - 28px); display: flex; align-items: center; justify-content: center; gap: 20px; min-width: 0; overflow: hidden; }

        .pie-wrapper { width: 170px; height: 170px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pie-chart {
          position: relative;
          width: 170px;
          height: 170px;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
          flex-shrink: 0;
        }
        .pie-slice-label {
          position: absolute;
          transform: translate(-50%, -50%);
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          text-shadow: 0 0 3px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.8);
          pointer-events: none;
          z-index: 5;
        }

        .category-legend {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          overflow-y: auto;
          max-height: 100%;
          padding-right: 4px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ffffff;
          font-size: 10px;
          font-weight: 500;
          white-space: nowrap;
        }
        .legend-dot { width: 12px; height: 12px; border-radius: 50%; display: block; flex-shrink: 0; }
        .legend-text { overflow: hidden; text-overflow: ellipsis; }

        .monthly-panel { min-width: 0; min-height: 0; background: #ffffff; border: 1px solid #66814f; border-radius: 4px; padding: 18px 20px; overflow: hidden; box-shadow: 0 2px 3px rgba(0,0,0,0.15); }
        .monthly-title-row { width: 100%; height: 32px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .monthly-title-row h3 { margin: 0; color: #222222; font-size: 14px; font-weight: 800; }
        .monthly-title-row select { width: 108px; height: 27px; padding: 0 8px; border: 1px solid #71866a; border-radius: 4px; background: #ffffff; color: #222222; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 600; outline: none; cursor: pointer; }

        .chart-container { width: 100%; height: calc(100% - 42px); display: flex; min-height: 0; }
        .y-axis { width: 35px; height: 83%; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-right: 6px; color: #555555; font-size: 9px; }
        .graph-container { position: relative; flex: 1; height: 100%; margin-left: 8px; min-width: 0; min-height: 0; }
        .grid-line { position: absolute; left: 0; right: 0; height: 1px; background: #e5e5e5; }
        .line-100 { top: 0; }
        .line-80 { top: 16.5%; }
        .line-60 { top: 33%; }
        .line-40 { top: 49.5%; }
        .line-20 { top: 66%; }
        .line-0 { top: 82.5%; }
        .line-chart { position: absolute; top: 0; left: 0; width: 100%; height: 83%; overflow: visible; display: block; }
        .month-labels { position: absolute; top: 86%; left: 0; right: 0; display: flex; justify-content: space-between; color: #555555; font-size: 9px; }

        @media (max-width: 1100px) {
          .sidebar { width: 300px; min-width: 300px; }
          .main-content { width: calc(100vw - 300px); }
          .report-cards { left: 45px; right: 45px; gap: 10px; }
          .category-content { gap: 12px; }
          .pie-wrapper, .pie-chart { width: 140px; height: 140px; }
        }
        @media (max-width: 850px) {
          body { overflow: auto; }
          .dashboard-page { width: 1100px; min-width: 1100px; height: 100vh; }
        }
      `}</style>
    </>
  );
}