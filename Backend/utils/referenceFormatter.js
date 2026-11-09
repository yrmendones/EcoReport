/**
 * Report / certificate reference numbers.
 *
 * Format: ER-{year}-{4-digit-zero-padded-id}
 * Example: ER-2026-0015
 *
 * The year comes from the record's own date (submitted_at / requested_at),
 * not the current year, so old reports keep their original prefix even
 * when viewed years later.
 *
 * The year is extracted from the leading 4 digits of the DB string — this
 * works for both MySQL DATETIME ("2026-05-15 10:30:00") and ISO
 * ("2026-05-15T10:30:00Z") without relying on Date parsing that could
 * shift by hours depending on the Node server's timezone.
 */

function extractYear(dateStr) {
  if (!dateStr) return new Date().getFullYear();
  const match = String(dateStr).match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
}

function reportReference(reportId, submittedAt) {
  const year = extractYear(submittedAt);
  return `ER-${year}-${String(reportId).padStart(4, '0')}`;
}

function certificateReference(certId, requestedAt) {
  const year = extractYear(requestedAt);
  return `ER-${year}-${String(certId).padStart(4, '0')}`;
}

module.exports = { reportReference, certificateReference };