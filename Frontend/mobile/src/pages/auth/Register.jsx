import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
  FaUpload,
  FaCheck,
} from "react-icons/fa";
import { apiFetch } from "../../api";

const API_BASE = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "http://localhost:5000");

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    house_no: "",
    street: "",
    contact_number: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [residentIdFile, setResidentIdFile] = useState(null);
  const [residentIdPreview, setResidentIdPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Contact number: enforce "09" prefix as the user types
    if (name === "contact_number") {
      const digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length >= 1 && digitsOnly[0] !== "0") return;
      if (digitsOnly.length >= 2 && digitsOnly[1] !== "9") return;
      setFormData({ ...formData, contact_number: digitsOnly.slice(0, 11) });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleResidentIdUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a valid image file (JPG, JPEG, PNG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB.");
      return;
    }

    setResidentIdFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setResidentIdPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeResidentId = () => {
    setResidentIdFile(null);
    setResidentIdPreview(null);
    const fileInput = document.getElementById("resident-id-input");
    if (fileInput) fileInput.value = "";
  };

  const uploadResidentId = async () => {
    if (!residentIdFile) return null;
    try {
      const fd = new FormData();
      fd.append("files", residentIdFile);
      const response = await fetch(`${API_BASE}/api/guest/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ID upload failed.");
      return data.files?.[0]?.url || null;
    } catch (err) {
      console.error("ID upload error:", err);
      throw err;
    }
  };

  const isFormComplete =
    formData.first_name.trim() !== "" &&
    formData.middle_name.trim() !== "" &&
    formData.last_name.trim() !== "" &&
    formData.house_no.trim() !== "" &&
    formData.street.trim() !== "" &&
    formData.contact_number.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.password !== "" &&
    formData.confirm_password !== "" &&
    residentIdFile !== null &&
    agreedToTerms === true;

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const requiredFields = [
      { key: "first_name", label: "First Name" },
      { key: "middle_name", label: "Middle Name (type N/A if you don't have one)" },
      { key: "last_name", label: "Last Name" },
      { key: "house_no", label: "House Number" },
      { key: "street", label: "Street" },
      { key: "contact_number", label: "Contact Number" },
      { key: "email", label: "Email Address" },
      { key: "password", label: "Password" },
      { key: "confirm_password", label: "Confirm Password" },
    ];

    for (const field of requiredFields) {
      if (!formData[field.key] || !String(formData[field.key]).trim()) {
        setError(`Please fill in ${field.label}.`);
        setLoading(false);
        return;
      }
    }

    const mobileRegex = /^(09)\d{9}$/;
    if (!mobileRegex.test(formData.contact_number)) {
      setError("Contact number must be 11 digits starting with 09.");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8 || formData.password.length > 16) {
      setError("Password must be between 8 and 16 characters.");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (!residentIdFile) {
      setError("Please upload your Resident ID (a photo of any valid ID).");
      setLoading(false);
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to Terms & Conditions before registering.");
      setLoading(false);
      return;
    }

    try {
      const valid_id_url = await uploadResidentId();
      const payload = { ...formData, valid_id_url };
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/resident-login");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E5E7EB] flex justify-center items-center p-4">
      <div className="relative w-[390px] h-[844px] bg-[#F8FAF8] rounded-[40px] shadow-2xl overflow-hidden border-[6px] border-white flex flex-col">
        <header className="shrink-0 bg-[#F8FAF8] px-6 pt-5 pb-5">
          <div className="h-[42px] flex items-center">
            <button
              type="button"
              onClick={() => navigate("/resident-login")}
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#0B5D2A] text-xl hover:bg-[#E8F3E5] active:scale-95 transition"
              aria-label="Back to Resident Login"
            >
              <FaArrowLeft />
            </button>
          </div>

          <div className="mt-5 text-center">
            <h1 className="text-[#0B5D2A] text-[21px] font-extrabold leading-tight">
              Resident Registration
            </h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-12">
          <form onSubmit={handleRegister} className="space-y-3">
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[#0B5D2A] text-sm font-bold mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Enter first name"
                className="w-full h-[43px] px-4 rounded-lg border border-[#8BB37A] bg-white text-sm outline-none focus:ring-2 focus:ring-[#0B5D2A]/20"
                required
              />
            </div>

            <div>
              <label className="block text-[#0B5D2A] text-sm font-bold mb-1">
                Middle Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="middle_name"
                value={formData.middle_name}
                onChange={handleChange}
                placeholder="Enter middle name (or N/A if none)"
                className="w-full h-[43px] px-4 rounded-lg border border-[#8BB37A] bg-white text-sm outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[#0B5D2A] text-sm font-bold mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Enter last name"
                className="w-full h-[43px] px-4 rounded-lg border border-[#8BB37A] bg-white text-sm outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[#0B5D2A] text-sm font-bold mb-1">
                House Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="house_no"
                value={formData.house_no}
                onChange={handleChange}
                placeholder="Enter house number"
                className="w-full h-[43px] px-4 rounded-lg border border-[#8BB37A] bg-white text-sm outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[#0B5D2A] text-sm font-bold mb-1">
                Street <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="Enter street"
                className="w-full h-[43px] px-4 rounded-lg border border-[#8BB37A] bg-white text-sm outline-none"
                required
              />
            </div>

            {/* ✅ Contact Number — placeholder updated */}
            <div>
              <label className="block text-[#0B5D2A] text-sm font-bold mb-1">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                placeholder="Enter Phone Number"
                maxLength={11}
                inputMode="numeric"
                className="w-full h-[43px] px-4 rounded-lg border border-[#8BB37A] bg-white text-sm outline-none focus:ring-2 focus:ring-[#0B5D2A]/20"
                required
              />
            </div>

            <div>
              <label className="block text-[#0B5D2A] text-sm font-bold mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                className="w-full h-[43px] px-4 rounded-lg border border-[#8BB37A] bg-white text-sm outline-none focus:ring-2 focus:ring-[#0B5D2A]/20"
                required
              />
            </div>

            <div>
              <label className="block text-[#0B5D2A] text-sm font-bold mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password (8-16 characters)"
                  maxLength={16}
                  className="w-full h-[43px] px-4 pr-12 rounded-lg border border-[#8BB37A] bg-white text-sm outline-none focus:ring-2 focus:ring-[#0B5D2A]/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B5D2A]"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#0B5D2A] text-sm font-bold mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  maxLength={16}
                  className="w-full h-[43px] px-4 pr-12 rounded-lg border border-[#8BB37A] bg-white text-sm outline-none focus:ring-2 focus:ring-[#0B5D2A]/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B5D2A]"
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#0B5D2A] text-sm font-bold mb-1">
                Upload Resident ID <span className="text-red-500">*</span>
              </label>
              <input
                id="resident-id-input"
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleResidentIdUpload}
                className="hidden"
              />
              {residentIdPreview ? (
                <div className="relative">
                  <img
                    src={residentIdPreview}
                    alt="Resident ID Preview"
                    className="w-full h-[150px] rounded-lg border border-[#8BB37A] object-cover bg-white"
                  />
                  <button
                    type="button"
                    onClick={removeResidentId}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white font-bold text-sm flex items-center justify-center hover:bg-red-600 transition"
                  >
                    ✕
                  </button>
                  <div className="mt-2 flex items-center gap-2 text-green-600 text-xs">
                    <FaCheck size={12} />
                    <span>File uploaded successfully</span>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="resident-id-input"
                  className="w-full h-[82px] rounded-lg border border-[#8BB37A] bg-white flex flex-col items-center justify-center text-[#0B5D2A] hover:bg-[#F3F8F1] transition cursor-pointer"
                >
                  <FaUpload size={22} />
                  <span className="font-bold text-sm mt-1">UPLOAD FILE</span>
                  <span className="text-xs text-gray-500">JPG, PNG (Max. 5MB)</span>
                </label>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                Upload a photo of any valid ID (barangay ID, driver's license, etc.). Used by admin for verification.
              </p>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                id="terms-checkbox"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 accent-[#0B5D2A] mt-0.5 cursor-pointer"
              />
              <label htmlFor="terms-checkbox" className="text-xs text-gray-700 cursor-pointer">
                I agree to the <strong>Terms &amp; Conditions</strong> and confirm that all
                information provided is accurate.
              </label>
            </div>

            <div className="flex flex-col items-center pt-2 pb-8">
              <button
                type="submit"
                disabled={loading || !isFormComplete}
                className={`w-[210px] h-[46px] rounded-lg font-bold text-sm shadow-md transition
                  ${
                    loading || !isFormComplete
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#0B5D2A] text-white hover:bg-[#094C23] hover:scale-[1.02] active:scale-95"
                  }
                `}
              >
                {loading ? "Registering..." : "Register"}
              </button>

              {!isFormComplete && (
                <p className="text-[10px] text-gray-400 mt-2 text-center max-w-[260px]">
                  Please complete all fields, upload your ID, and agree to Terms &amp; Conditions.
                </p>
              )}
            </div>
          </form>
        </main>

        <div className="absolute bottom-0 left-0 right-0 h-[28px] bg-[#F8FAF8] flex items-center justify-center z-20">
          <div className="w-[95px] h-[5px] rounded-full bg-[#1F2937]" />
        </div>
      </div>
    </div>
  );
}