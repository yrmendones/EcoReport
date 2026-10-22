-- ============================================================
-- 1. CREATE DATABASE
-- ============================================================

CREATE DATABASE IF NOT EXISTS ecoreport;
USE ecoreport;

-- ============================================================
-- 2. USERS TABLE (Residents, Barangay Officials & Admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    resident_id VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    house_no VARCHAR(50),
    street VARCHAR(100),
    address VARCHAR(255),
    contact_number VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'resident',
    status VARCHAR(50) DEFAULT 'Offline',
    last_active_at DATETIME NULL DEFAULT NULL,
    is_verified BOOLEAN DEFAULT 0,
    verification_status ENUM('Pending Verification', 'Verified Resident', 'Rejected') DEFAULT 'Pending Verification',
    valid_id_url VARCHAR(255) NULL,
    is_guest BOOLEAN DEFAULT 0,
    settings JSON DEFAULT '{"publicProfile":false,"shareLocation":true,"pushNotifications":true,"emailNotifications":false}',
    profile_picture VARCHAR(255) NULL,
    registered_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. ENVIRONMENTAL REPORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS environmental_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    guest_name VARCHAR(100) NULL,
    guest_mobile VARCHAR(20) NULL,
    guest_ip VARCHAR(45) NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    address VARCHAR(255),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    assigned_to VARCHAR(100) NULL,
    status ENUM('pending','ongoing','resolved','rejected','assigned','deleted') DEFAULT 'pending',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ============================================================
-- 4. REPORT MEDIA (Evidence)
-- ============================================================

CREATE TABLE IF NOT EXISTS report_media (
    media_id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    file_type ENUM('image','video') DEFAULT 'image',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES environmental_reports(report_id) ON DELETE CASCADE
);

-- ============================================================
-- 5. REPORT TIMELINE (Status History)
-- ============================================================

CREATE TABLE IF NOT EXISTS report_timeline (
    timeline_id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    note VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES environmental_reports(report_id) ON DELETE CASCADE
);

-- ============================================================
-- 6. CERTIFICATE REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS certificate_requests (
    certificate_request_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    certificate_type VARCHAR(100) NOT NULL,
    purpose TEXT NOT NULL,
    preferred_release_date DATE NOT NULL,
    notes TEXT,
    status ENUM('Pending','Approved','Released','Rejected') DEFAULT 'Pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- 7. APPOINTMENTS (Health Center)
-- ============================================================

CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    symptoms TEXT,
    appointment_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    status ENUM('Pending','Confirmed','Completed','Cancelled') DEFAULT 'Pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- 8. ANNOUNCEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
    announcement_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category ENUM('Environmental','Health','Disaster','Community') NOT NULL,
    status ENUM('Draft','Published') DEFAULT 'Draft',
    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    posted_by INT NULL,
    FOREIGN KEY (posted_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'General',
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reference_id INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- 10. ASSIGNMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_code VARCHAR(50) UNIQUE NOT NULL,
    report_id INT NOT NULL,
    worker VARCHAR(100) NOT NULL,
    assigned_date DATE NOT NULL,
    status ENUM('Assigned','Ongoing','Released','Resolved','Rejected') DEFAULT 'Assigned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES environmental_reports(report_id) ON DELETE CASCADE
);

-- ============================================================
-- 11. BUSINESS PERMITS
-- ============================================================

CREATE TABLE IF NOT EXISTS business_permits (
    permit_id INT AUTO_INCREMENT PRIMARY KEY,
    business_name VARCHAR(100) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    permit_number VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    issued_date DATE NOT NULL,
    expiry_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. INVENTORY ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_items (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity INT DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    status ENUM('Available','Low Stock','Out of Stock') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 13. BLOTTER & INCIDENT CASES
-- ============================================================

CREATE TABLE IF NOT EXISTS blotter_cases (
    blotter_id INT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    incident_date DATE NOT NULL,
    description TEXT,
    status ENUM('Open','Investigating','Closed') DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 14. DISASTER & EMERGENCY ALERTS
-- ============================================================

CREATE TABLE IF NOT EXISTS disaster_alerts (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    linked_announcement_id INT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (linked_announcement_id) REFERENCES announcements(announcement_id) ON DELETE SET NULL
);

-- ============================================================
-- 15. WASTE SCHEDULE
-- ============================================================

CREATE TABLE IF NOT EXISTS waste_schedule (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    day VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    icon VARCHAR(50) DEFAULT 'FaTrash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 16. HOTLINES (Emergency Numbers)
-- ============================================================

CREATE TABLE IF NOT EXISTS hotlines (
    hotline_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    number VARCHAR(50) NOT NULL,
    icon VARCHAR(50) NULL,
    color_class VARCHAR(50) NULL,
    description VARCHAR(255) NULL,
    clean_number VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 17. AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    user_name VARCHAR(100) NULL,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ============================================================
-- 18. NOTIFICATION CENTER
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_center (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 19. HEALTH CENTER INFO
-- ============================================================

CREATE TABLE IF NOT EXISTS health_center_info (
    info_id INT AUTO_INCREMENT PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    operating_days VARCHAR(100) NOT NULL,
    operating_hours VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 20. HEALTH SERVICES
-- ============================================================

CREATE TABLE IF NOT EXISTS health_services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    icon VARCHAR(50) DEFAULT 'FaHospital',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 21. MEDICAL STAFF
-- ============================================================

CREATE TABLE IF NOT EXISTS medical_staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    staff_name VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0
);

-- ============================================================
-- 22. PASSWORD RESET TOKENS
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- ============================================================
-- 23. QR TOKENS
-- ============================================================

CREATE TABLE IF NOT EXISTS qr_tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(128) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- 23. SAMPLE DATA
-- ============================================================

INSERT INTO waste_schedule (day, type, status) VALUES
('Monday', 'Biodegradable', 'Active'),
('Tuesday', 'Recyclable', 'Active'),
('Wednesday', 'Residual', 'Active'),
('Thursday', 'Biodegradable', 'Active'),
('Friday', 'Recyclable', 'Active'),
('Saturday', 'Special Collection', 'Active'),
('Sunday', 'Hazardous Waste', 'Active');

INSERT INTO hotlines (title, number, color_class, description, clean_number) VALUES
('Pateros Police Station', '(02) 8642-1234', 'bg-blue-100 text-blue-700', 'Pateros Municipal Police Station', '0286421234'),
('Pateros Fire Station', '(02) 8642-5678', 'bg-red-100 text-red-700', 'BFP Pateros Fire Station', '0286425678'),
('Ambulance / Emergency', '911', 'bg-green-100 text-green-700', 'National Emergency Hotline', '911'),
('Barangay Health Center', '(02) 8642-9999', 'bg-emerald-100 text-emerald-700', 'Sto. Rosario Kanluran Health Center', '0286429999'),
('Barangay Hall', '(02) 8642-8888', 'bg-yellow-100 text-yellow-700', 'Barangay Sto. Rosario Kanluran', '0286428888'),
('MDRRMO Pateros', '(02) 8642-7777', 'bg-purple-100 text-purple-700', 'Municipal Disaster Risk Reduction Management Office', '0286427777');

INSERT INTO health_center_info (location, contact_number, operating_days, operating_hours) VALUES
('Barangay Hall Compound, Sto. Rosario Kanluran, Pateros', '(02) 8642-9999', 'Monday - Friday', '8:00 AM - 4:00 PM');

INSERT INTO health_services (service_name, status, display_order) VALUES
('General Consultation', 'Active', 1),
('Vaccination', 'Active', 2),
('Maternal Care', 'Active', 3),
('Child Immunization', 'Active', 4),
('Dental Services', 'Active', 5),
('Blood Pressure Check', 'Active', 6);

INSERT INTO medical_staff (staff_name, role, display_order) VALUES
('Dr. Maria Santos', 'Municipal Doctor', 1),
('Nurse John Cruz', 'Registered Nurse', 2),
('Midwife Ana Reyes', 'Midwife', 3);

-- ============================================================
-- 24. INDEXES
-- ============================================================

CREATE INDEX idx_reports_user_id ON environmental_reports(user_id);
CREATE INDEX idx_reports_status ON environmental_reports(status);
CREATE INDEX idx_reports_submitted_at ON environmental_reports(submitted_at);
CREATE INDEX idx_reports_guest_ip ON environmental_reports(guest_ip);
CREATE INDEX idx_certificates_user_id ON certificate_requests(user_id);
CREATE INDEX idx_certificates_status ON certificate_requests(status);
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_announcements_category ON announcements(category);
CREATE INDEX idx_assignments_report_id ON assignments(report_id);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_users_verification_status ON users(verification_status);
CREATE INDEX idx_users_last_active_at ON users(last_active_at);
CREATE INDEX idx_timeline_report_id ON report_timeline(report_id);
CREATE INDEX idx_media_report_id ON report_media(report_id);
CREATE INDEX idx_qr_tokens_token ON qr_tokens(token);