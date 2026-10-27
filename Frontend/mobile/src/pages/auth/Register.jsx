import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
  FaUpload,
  FaCheck,
  FaTimes,
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
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

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
      await apiFetch("/api/auth/register", {
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

  const handleAgreeInModal = () => {
    setAgreedToTerms(true);
    setShowTermsModal(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#E5E7EB] flex justify-center items-center p-4">
      <div className="relative w-[390px] max-w-full h-[844px] max-h-[calc(100dvh-2rem)] bg-[#F8FAF8] rounded-[40px] shadow-2xl overflow-hidden border-[6px] border-white flex flex-col">
        <header className="shrink-0 bg-[#F8FAF8] px-6 pt-5 pb-3">
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

        <main className="flex-1 min-h-0 overflow-y-auto px-6">
          <form id="register-form" onSubmit={handleRegister} className="space-y-3 pt-1 pb-6">
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
                I agree to the{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTermsModal(true);
                  }}
                  className="font-bold text-[#0B5D2A] underline underline-offset-2 hover:text-[#094C23]"
                >
                  Terms &amp; Conditions
                </button>{" "}
                and confirm that all information provided is accurate.
              </label>
            </div>
          </form>
        </main>

        <footer className="shrink-0 bg-[#F8FAF8] px-6 pt-3">
          <div className="flex flex-col items-center">
            <button
              type="submit"
              form="register-form"
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

            <p
              className={`text-[10px] text-gray-400 mt-2 text-center max-w-[260px] ${
                isFormComplete ? "invisible" : ""
              }`}
            >
              Please complete all fields, upload your ID, and agree to Terms &amp; Conditions.
            </p>
          </div>

          <div className="flex items-center justify-center pb-2 pt-1">
            <div className="w-[95px] h-[5px] rounded-full bg-[#1F2937]" />
          </div>
        </footer>

        {/* Terms & Conditions Modal */}
        {showTermsModal && (
          <div
            className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowTermsModal(false)}
          >
            <div
              className="bg-white rounded-2xl w-full max-h-[82%] flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-[#F8FAF8]">
                <div>
                  <h2 className="text-[#0B5D2A] text-base font-extrabold leading-tight">
                    Terms and Conditions
                  </h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Barangay EcoReport System · Last Updated: October 27, 2026
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 active:scale-95 transition"
                  aria-label="Close Terms and Conditions"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4 text-xs text-gray-700 leading-relaxed">
                <p>
                  Welcome to the Barangay EcoReport System. By accessing or using this
                  system, you agree to comply with the following Terms and Conditions.
                  Please read them carefully before creating an account or submitting
                  any information.
                </p>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    1. Acceptance of Terms
                  </h3>
                  <p>
                    By registering for or using the Barangay EcoReport System, you
                    acknowledge that you have read, understood, and agreed to these
                    Terms and Conditions. If you do not agree with these terms, please
                    refrain from using the system.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    2. Purpose of the System
                  </h3>
                  <p>
                    The Barangay EcoReport System is designed to help residents report
                    environmental concerns, monitor the status of submitted reports,
                    receive community announcements, access waste collection schedules,
                    and use other available barangay services.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    3. Account Registration and Responsibilities
                  </h3>
                  <p>
                    Users must provide accurate, complete, and updated information when
                    registering. Each user is responsible for maintaining the
                    confidentiality of their account credentials and for all activities
                    performed through their account. Users must promptly report any
                    suspected unauthorized access to their accounts.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    4. Submission of Environmental Reports
                  </h3>
                  <p>
                    Users must provide truthful and accurate information when submitting
                    environmental reports. Reports may include descriptions, locations,
                    photographs, videos, and other supporting evidence relevant to the
                    reported concern.
                  </p>
                  <p className="mt-2">
                    Users must not submit false, misleading, malicious, irrelevant, or
                    intentionally duplicated reports. The barangay may review, verify,
                    reject, or take appropriate action on submitted reports based on the
                    information provided and the applicable barangay procedures.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    5. Uploaded Photos, Videos, and Other Evidence
                  </h3>
                  <p>
                    Users must ensure that uploaded photos, videos, and other evidence
                    are relevant to their reports and do not unlawfully violate the
                    rights or privacy of others. Users must not upload illegal, harmful,
                    offensive, or unauthorized content.
                  </p>
                  <p className="mt-2">
                    The system may restrict or remove submitted content when necessary,
                    subject to applicable rules and procedures.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    6. Report Status and Response Time
                  </h3>
                  <p>
                    Users may track the status of their submitted reports through the
                    system. Report statuses and updates are provided for information and
                    monitoring purposes. Submission of a report does not guarantee
                    immediate action, a specific resolution time, or a particular
                    outcome. Processing depends on report verification, available
                    resources, and the appropriate barangay personnel.
                  </p>
                  <p className="mt-2">
                    For emergencies requiring immediate assistance, users should contact
                    the appropriate emergency services or barangay authorities directly
                    rather than relying solely on this system.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    7. Proper Use of the System
                  </h3>
                  <p>Users agree not to:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>• Provide false identities or impersonate another person.</li>
                    <li>• Submit fraudulent, abusive, or intentionally misleading reports.</li>
                    <li>• 
                      Attempt to access another user's account or private information
                      without authorization.
                    </li>
                    <li>• Interfere with, damage, or disrupt the system or its services.</li>
                    <li>• 
                      Use the system for unlawful activities or purposes unrelated to its
                      intended functions.
                    </li>
                  </ul>
                  <p className="mt-2">
                    Violations may result in account restrictions or other appropriate
                    action in accordance with applicable policies and laws.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    8. Privacy and Personal Information
                  </h3>
                  <p>
                    The system may collect personal information necessary to provide its
                    services, verify accounts, process reports, communicate updates, and
                    maintain system operations.
                  </p>
                  <p className="mt-2">
                    Personal information shall be handled in accordance with applicable
                    data protection laws and the system's Privacy Policy. Access to
                    personal information should be limited to authorized personnel with a
                    legitimate purpose. Users are encouraged not to include unnecessary
                    sensitive personal information in reports or uploaded evidence.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    9. Data Accuracy and System Availability
                  </h3>
                  <p>
                    Users are responsible for the accuracy of the information they
                    submit. The system administrators will take reasonable steps to
                    maintain accurate records and reliable services; however, temporary
                    interruptions, maintenance, technical errors, or service
                    unavailability may occur.
                  </p>
                  <p className="mt-2">
                    The system does not guarantee uninterrupted access or that every
                    submitted report will result in a specific action.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    10. Third-Party Services and External Links
                  </h3>
                  <p>
                    The system may contain links to external websites or services for
                    additional information or assistance. These external services may be
                    governed by their own terms and privacy policies. The Barangay
                    EcoReport System is not responsible for the content or practices of
                    third-party services outside its control.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    11. Account Suspension or Restriction
                  </h3>
                  <p>
                    The system administrators may investigate suspected misuse and
                    restrict, suspend, or disable accounts when there are reasonable
                    grounds to believe that these Terms and Conditions have been
                    violated, subject to applicable policies and laws.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    12. Changes to These Terms
                  </h3>
                  <p>
                    These Terms and Conditions may be revised when necessary to reflect
                    changes in system features, operational procedures, or applicable
                    laws. Updated terms will be made available through the system,
                    together with the revised effective or update date when appropriate.
                    Continued use of the system after updates constitutes acceptance of
                    the revised terms where permitted by applicable law.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    13. Limitation of Responsibility
                  </h3>
                  <p>
                    The system is provided to support communication between residents
                    and barangay personnel. To the extent permitted by applicable law,
                    the system administrators are not responsible for losses arising from
                    inaccurate information submitted by users, interruptions beyond their
                    reasonable control, or actions taken by third parties. Nothing in
                    these terms excludes responsibilities that cannot legally be
                    excluded.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    14. Governing Laws
                  </h3>
                  <p>
                    These Terms and Conditions shall be interpreted in accordance with
                    applicable laws and regulations of the Republic of the Philippines.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    15. Contact and Assistance
                  </h3>
                  <p>
                    For questions, concerns, or assistance regarding the Barangay
                    EcoReport System, users may contact the authorized barangay office or
                    the designated system administrator through the official contact
                    channels provided by the barangay.
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#0B5D2A] text-sm mb-1">
                    16. Agreement and Consent
                  </h3>
                  <p>
                    By checking the acceptance box or selecting the designated agreement
                    button, you confirm that you have read and understood these Terms and
                    Conditions and agree to follow them when using the Barangay EcoReport
                    System.
                  </p>
                </section>
              </div>

              {/* Modal footer */}
              <div className="shrink-0 px-5 py-3 border-t border-gray-200 bg-[#F8FAF8] flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="flex-1 h-[40px] rounded-lg font-bold text-sm border border-[#0B5D2A] text-[#0B5D2A] bg-white hover:bg-[#E8F3E5] active:scale-95 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleAgreeInModal}
                  className="flex-1 h-[40px] rounded-lg font-bold text-sm bg-[#0B5D2A] text-white shadow-md hover:bg-[#094C23] active:scale-95 transition"
                >
                  I Agree
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}