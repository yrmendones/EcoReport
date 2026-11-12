import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { apiFetch } from "../../api";

import ReportCard from "../../components/reports/ReportCard";
import ReportTabs from "../../components/reports/ReportTabs";
import BottomNav from "../../components/resident/BottomNav";

export default function MyReports() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tabs = [
    "All",
    "Pending",
    "Ongoing",
    "Resolved",
    "Rejected",
  ];

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        if (!user.user_id) {
          setError("Please log in to view your reports.");
          setLoading(false);
          return;
        }

        const data = await apiFetch(`/api/reports?user_id=${user.user_id}`);

        const formattedReports = await Promise.all(
          data.map(async (report) => {
            let imageUrl = null;
            try {
              const mediaData = await apiFetch(
                `/api/reports/${report.report_id}/media`
              );
              if (mediaData && mediaData.length > 0) {
                const firstImage = mediaData.find(
                  (m) => m.file_type === "image"
                );
                if (firstImage) {
                  imageUrl = firstImage.file_url;
                }
              }
            } catch (err) {
              // No media found
            }

            // Map "Assigned" to "Ongoing" for display
            let displayStatus =
              report.status.charAt(0).toUpperCase() + report.status.slice(1);
            if (displayStatus === "Assigned") {
              displayStatus = "Ongoing";
            }

            return {
              id: report.report_id,
              ref: `ER-2026-${String(report.report_id).padStart(4, "0")}`,
              title: report.category || "Environmental Concern",
              date: new Date(report.submitted_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
              status: displayStatus, // Display status (Ongoing instead of Assigned)
              rawStatus: report.status, // Keep original for filtering
              image: imageUrl,
            };
          })
        );

        setReports(formattedReports);
      } catch (err) {
        setError(err.message || "Failed to fetch reports.");
        console.error("Error fetching reports:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // FILTER: "Ongoing" tab shows both Ongoing AND Assigned
  const filtered =
    activeTab === "All"
      ? reports
      : activeTab === "Ongoing"
      ? reports.filter(
          (report) =>
            report.rawStatus === "ongoing" || report.rawStatus === "assigned"
        )
      : reports.filter((report) => report.status === activeTab);

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center sm:py-6 sm:px-3">
      {/* Full screen on phones, phone frame only on sm and up */}
      <div className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] bg-[#F8FAF8] sm:rounded-[40px] sm:border-[5px] sm:border-white sm:shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <header
          className="relative h-[82px] bg-[#0B5D2A] flex items-center justify-center shrink-0"
          style={{ padding: "0 64px" }}
        >
          <button
            type="button"
            onClick={() => navigate("/resident-dashboard")}
            aria-label="Back"
            className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white text-[20px] bg-white/10 hover:bg-white/20 active:scale-95 transition"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold text-center">
            My Reports
          </h1>
        </header>

        {/* MAIN CONTENT */}
        <main
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
          style={{
            padding: "28px 24px max(140px, calc(env(safe-area-inset-bottom) + 120px))",
            gap: "24px",
          }}
        >
          {/* TITLE */}
          <div className="flex flex-col shrink-0" style={{ gap: "8px" }}>
            <h2 className="text-[22px] font-extrabold text-[#0B5D2A] leading-tight">
              My Environmental Reports
            </h2>
            <p className="text-[14px] text-gray-600 leading-6">
              View and track the status of your submitted reports.
            </p>
          </div>

          {/* TABS — old UI (ReportTabs inside white card) */}
          <div className="bg-white rounded-2xl border border-[#D5E4D1] p-2 shadow-sm shrink-0">
            <ReportTabs
              tabs={tabs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </div>

          {/* REPORT LIST */}
          <section className="flex flex-col shrink-0" style={{ gap: "16px" }}>
            {/* LIST HEADER */}
            <div
              className="flex items-center justify-between"
              style={{ gap: "12px" }}
            >
              <p className="text-[16px] font-extrabold text-gray-900 leading-6">
                {activeTab === "All" ? "All Reports" : `${activeTab} Reports`}
              </p>
              <p className="shrink-0 text-[14px] text-[#0B5D2A] font-extrabold leading-6">
                {filtered.length} report{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>

            {loading && (
              <div
                className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm text-center"
                style={{ padding: "48px 24px" }}
              >
                <p className="text-[15px] font-bold text-gray-700 leading-6">
                  Loading reports...
                </p>
              </div>
            )}

            {error && (
              <div
                className="bg-white rounded-2xl border border-red-300 shadow-sm flex flex-col items-center text-center"
                style={{ padding: "40px 24px", gap: "16px" }}
              >
                <p className="text-[15px] font-bold text-red-600 leading-6">
                  {error}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="min-h-[44px] text-[#0B5D2A] font-bold underline"
                  style={{ padding: "0 16px" }}
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="flex flex-col" style={{ gap: "16px" }}>
                {filtered.length > 0 ? (
                  filtered.map((report) => (
                    <div
                      key={report.id}
                      className="transition hover:-translate-y-[1px] shrink-0"
                    >
                      <ReportCard
                        report={report}
                        onClick={() => navigate(`/report-details/${report.id}`)}
                      />
                    </div>
                  ))
                ) : (
                  <div
                    className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm flex flex-col items-center text-center"
                    style={{ padding: "48px 24px", gap: "8px" }}
                  >
                    <p className="text-[15px] font-bold text-gray-700 leading-6">
                      No reports found
                    </p>
                    <p className="text-[13px] text-gray-500 leading-5">
                      There are no reports under the <br />
                      "{activeTab}" category.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>

        <div className="absolute bottom-0 left-0 right-0 z-30">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}