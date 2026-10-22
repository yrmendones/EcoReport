import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { apiFetch } from "../../api";

import ReportCard from "../../components/reports/ReportCard";
import ReportTabs from "../../components/reports/ReportTabs";

export default function MyReports() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("All");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // TABS – "Ongoing" tab now includes both Ongoing and Assigned
  const tabs = [
    "All",
    "Pending",
    "Ongoing",   // Will show both Ongoing and Assigned
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
              const mediaData = await apiFetch(`/api/reports/${report.report_id}/media`);
              if (mediaData && mediaData.length > 0) {
                const firstImage = mediaData.find((m) => m.file_type === "image");
                if (firstImage) {
                  imageUrl = firstImage.file_url;
                }
              }
            } catch (err) {
              // No media found
            }

            // ✅ Map "Assigned" to "Ongoing" for display
            let displayStatus = report.status.charAt(0).toUpperCase() + report.status.slice(1);
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
              status: displayStatus,      // Display status (Ongoing instead of Assigned)
              rawStatus: report.status,   // Keep original for filtering
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

  // FILTER: "Ongoing" tab shows both Ongoing AND Assigned (using rawStatus)
  const filtered =
    activeTab === "All"
      ? reports
      : activeTab === "Ongoing"
      ? reports.filter((report) => report.rawStatus === "ongoing" || report.rawStatus === "assigned")
      : reports.filter((report) => report.status === activeTab);

  return (
    <div
      className="
        min-h-screen
        bg-[#E5E7EB]
        flex
        justify-center
        items-center
        py-6
        px-3
      "
    >
      <div
        className="
          relative
          w-[390px]
          h-[844px]
          bg-[#F8FAF8]
          rounded-[40px]
          border-[5px]
          border-white
          shadow-2xl
          overflow-hidden
          flex
          flex-col
        "
      >
        {/* HEADER */}
        <header
          className="
            relative
            h-[82px]
            bg-[#0B5D2A]
            flex
            items-center
            justify-center
            shrink-0
          "
        >
          <button
            type="button"
            onClick={() => navigate("/resident-dashboard")}
            className="
              absolute
              left-6
              top-1/2
              -translate-y-1/2
              w-11
              h-11
              rounded-full
              flex
              items-center
              justify-center
              text-white
              text-[20px]
              bg-white/10
              hover:bg-white/20
              active:scale-95
              transition
            "
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-white text-[22px] font-extrabold">My Reports</h1>
        </header>

        {/* MAIN CONTENT */}
        <main
          className="
            flex-1
            overflow-y-auto
            px-5
            pt-7
            pb-8
            no-scrollbar
          "
        >
          <div className="mb-6">
            <h2 className="text-[20px] font-extrabold text-[#0B5D2A]">
              My Environmental Reports
            </h2>
            <p className="text-[11px] text-gray-500 mt-2">
              View and track the status of your submitted reports.
            </p>
          </div>

          {/* TABS */}
          <div
            className="
              bg-white
              rounded-2xl
              border
              border-[#D5E4D1]
              p-2
              shadow-sm
            "
          >
            <ReportTabs
              tabs={tabs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </div>

          {/* REPORT LIST */}
          <div className="mt-7">
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-[12px] font-bold text-gray-700">
                {activeTab === "All" ? "All Reports" : `${activeTab} Reports`}
              </p>
              <p className="text-[11px] text-[#0B5D2A] font-semibold">
                {filtered.length} report{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>

            {loading && (
              <div className="bg-white rounded-2xl border border-[#D5E4D1] shadow-sm px-5 py-12 text-center">
                <p className="text-[15px] font-bold text-gray-700">
                  Loading reports...
                </p>
              </div>
            )}

            {error && (
              <div className="bg-white rounded-2xl border border-red-300 shadow-sm px-5 py-12 text-center">
                <p className="text-[15px] font-bold text-red-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 text-[#0B5D2A] font-bold underline"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="flex flex-col gap-2">
                {filtered.length > 0 ? (
                  filtered.map((report) => (
                    <div
                      key={report.id}
                      className="transition hover:-translate-y-[1px]"
                    >
                      <ReportCard
                        report={report}
                        onClick={() => navigate(`/report-details/${report.id}`)}
                      />
                    </div>
                  ))
                ) : (
                  <div
                    className="
                      bg-white
                      rounded-2xl
                      border
                      border-[#D5E4D1]
                      shadow-sm
                      px-5
                      py-12
                      text-center
                    "
                  >
                    <p className="text-[15px] font-bold text-gray-700">
                      No reports found
                    </p>
                    <p className="text-[11px] text-gray-500 mt-2">
                      There are no reports under the <br />
                      "{activeTab}" category.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="h-8" />
          </div>
        </main>

        {/* ANDROID HOME BAR */}
        <div
          className="
            absolute
            bottom-3
            left-0
            right-0
            flex
            justify-center
            pointer-events-none
            z-20
          "
        >
          <div className="w-[70px] h-[5px] rounded-full bg-gray-800 opacity-70" />
        </div>
      </div>
    </div>
  );
}