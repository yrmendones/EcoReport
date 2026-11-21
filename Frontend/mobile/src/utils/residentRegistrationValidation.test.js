import test from "node:test";
import assert from "node:assert/strict";
import {
  isUsableLiveFace,
  validatePermanentAddressAgainstId,
} from "./residentRegistrationValidation.js";

const uploadedIdAddress =
  "REPUBLIC OF THE PHILIPPINES\nADDRESS\n123 Main Street, Barangay San Isidro, Taguig City";

test("accepts matching street, barangay, and city despite case, punctuation, abbreviations, and house number differences", () => {
  const result = validatePermanentAddressAgainstId(
    "REPUBLIC OF THE PHILIPPINES\n123 Main Street, Barangay San Isidro, Taguig City",
    { street: "Main St.", barangay: "Brgy. San Isidro", city: "Taguig" }
  );
  assert.equal(result.passed, true);
});

test("accepts a labeled OCR address when components are split by punctuation", () => {
  const result = validatePermanentAddressAgainstId(uploadedIdAddress, {
    street: "Main street",
    barangay: "San Isidro",
    city: "Taguig City",
  });
  assert.equal(result.passed, true);
});

test("tolerates an OCR street mismatch when barangay and city provide matching location evidence", () => {
  const result = validatePermanentAddressAgainstId(uploadedIdAddress, {
    street: "Oak Street",
    barangay: "San Isidro",
    city: "Taguig",
  });
  assert.equal(result.passed, true);
});

test("allows one imperfect component when the other two address components match", () => {
  const wrongBarangay = validatePermanentAddressAgainstId(uploadedIdAddress, {
    street: "Main St",
    barangay: "San Roque",
    city: "Taguig",
  });
  const wrongCity = validatePermanentAddressAgainstId(uploadedIdAddress, {
    street: "Main St",
    barangay: "San Isidro",
    city: "Makati",
  });
  assert.equal(wrongBarangay.passed, true);
  assert.equal(wrongCity.passed, true);
});

test("accepts a minor OCR spelling error in a meaningful address token", () => {
  const result = validatePermanentAddressAgainstId(
    "ADDRESS 123 Main Street, Barangay San Isldro, Taguig City",
    { street: "Main St", barangay: "San Isidro", city: "Taguig" }
  );
  assert.equal(result.passed, true);
});

test("does not approve from matching names or text without an extractable ID address", () => {
  const result = validatePermanentAddressAgainstId(
    "Juan Dela Cruz Taguig Main Street San Isidro",
    { street: "Main Street", barangay: "San Isidro", city: "Taguig" }
  );
  assert.equal(result.passed, false);
  assert.deepEqual(result.missing, ["ID address"]);
});

test("rejects when any required entered component is missing, without requiring a house number", () => {
  const result = validatePermanentAddressAgainstId(uploadedIdAddress, {
    street: "Main St",
    barangay: "San Isidro",
    city: "",
  });
  assert.equal(result.passed, false);
  assert.deepEqual(result.missing, ["City / Municipality"]);
});

test("accepts two clear matching components when OCR omits the third address component", () => {
  const result = validatePermanentAddressAgainstId(
    "ADDRESS 123 Main Street, Taguig City",
    { street: "Main St", barangay: "San Isidro", city: "Taguig" }
  );
  assert.equal(result.passed, true);
});

test("accepts recognizable address keywords when OCR drops the label and barangay marker", () => {
  const result = validatePermanentAddressAgainstId(
    "Juan Dela Cruz Main Street San Isidro Taguig City",
    { street: "Main St", barangay: "San Isidro", city: "Taguig" }
  );
  assert.equal(result.passed, true);
});

test("rejects unrelated addresses with insufficient matching components", () => {
  const result = validatePermanentAddressAgainstId(
    "ADDRESS 456 Oak Road, Barangay San Roque, Makati City",
    { street: "Main Street", barangay: "San Isidro", city: "Taguig" }
  );
  assert.equal(result.passed, false);
});

test("does not combine matches from separate OCR address entries", () => {
  const result = validatePermanentAddressAgainstId(
    "ADDRESS 12 Main Street Barangay West Side Quezon City PROFILE ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE TEN ELEVEN TWELVE THIRTEEN FOURTEEN FIFTEEN SIXTEEN SEVENTEEN EIGHTEEN NINETEEN TWENTY TWENTY ONE TWENTY TWO TWENTY THREE TWENTY FOUR TWENTY FIVE TWENTY SIX TWENTY SEVEN TWENTY EIGHT TWENTY NINE THIRTY OTHER RECORD 4 Oak Street Barangay San Isidro Taguig City PROFILE ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE TEN ELEVEN TWELVE THIRTEEN FOURTEEN FIFTEEN SIXTEEN SEVENTEEN EIGHTEEN NINETEEN TWENTY TWENTY ONE TWENTY TWO TWENTY THREE TWENTY FOUR TWENTY FIVE TWENTY SIX TWENTY SEVEN TWENTY EIGHT TWENTY NINE THIRTY THIRD RECORD 9 Pine Road Barangay East Side Makati City",
    { street: "Main St", barangay: "San Isidro", city: "Makati" }
  );
  assert.equal(result.passed, false);
});

test("requires a confident, centered, sufficiently large single face candidate", () => {
  const candidate = {
    detection: {
      score: 0.9,
      box: { x: 180, y: 70, width: 240, height: 300 },
    },
  };
  assert.equal(isUsableLiveFace(candidate, 600, 480), true);
  assert.equal(
    isUsableLiveFace({ ...candidate, detection: { ...candidate.detection, score: 0.4 } }, 600, 480),
    false
  );
});
