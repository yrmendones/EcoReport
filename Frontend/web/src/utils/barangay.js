// Barangay info helper — fetches the current barangay name, address, and
// contact details set in System Settings

export const DEFAULT_BARANGAY = {
  name: "Barangay Sto. Rosario Kanluran",
  address: "P. Sto. Rosario Kanluran, Pateros",
  contactEmail: "",
  contactNumber: "",
};

let cached = null;
let inflight = null;

export const fetchBarangayInfo = async (apiFetch) => {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const data = await apiFetch("/api/public/status");
      cached = {
        name: data.barangay_name || DEFAULT_BARANGAY.name,
        address: data.address || DEFAULT_BARANGAY.address,
        contactEmail: data.contact_email || "",
        contactNumber: data.contact_number || "",
      };
      return cached;
    } catch {
      return DEFAULT_BARANGAY;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
};