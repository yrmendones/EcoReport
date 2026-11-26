import test from "node:test";
import assert from "node:assert/strict";
import {
  extractResidentIdFields,
  isIdOcrReadInsufficient,
  matchResidentName,
  suggestIdImageRotation,
} from "./residentIdProcessing.js";

const line = (text, score, top, left = 20) => ({
  text,
  score,
  poly: [[left, top], [left + 100, top], [left + 100, top + 12], [left, top + 12]],
});

test("extracts labeled first name and surname with OCR confidence", () => {
  const items = [
    line("GIVEN NAME: Maria", 0.95, 20),
    line("SURNAME: Dela Cruz", 0.94, 38),
  ];
  const fields = extractResidentIdFields(items, { first_name: "Maria", last_name: "Dela Cruz" });

  assert.equal(fields.firstName, "Maria");
  assert.equal(fields.lastName, "Dela Cruz");
  assert.ok(fields.nameConfidence > 0.9);
  assert.equal("addressText" in fields, false);
});

test("matches capitalization and punctuation differences while treating a missing middle name as optional", () => {
  const items = [line("NAME: MARIA-DEL C. CRUZ", 0.91, 20)];
  const fields = extractResidentIdFields(items, { first_name: "Maria Del", last_name: "Cruz" });
  const result = matchResidentName(items, {
    first_name: "maria del",
    middle_name: "Cecilia",
    last_name: "Cruz",
  }, fields);

  assert.equal(result.passed, true);
  assert.equal(result.middlePresent, false);
  assert.equal(result.confidence, 0.91);
});

test("allows one likely OCR character error in longer name tokens", () => {
  const items = [line("NAME: ANA LISA", 0.72, 20)];
  const fields = extractResidentIdFields(items);
  const result = matchResidentName(items, { first_name: "Ana", last_name: "Liza" }, fields);
  assert.equal(result.passed, true);
});

test("extracts a full name printed below a standalone Name label", () => {
  const items = [
    line("Name", 0.93, 20),
    line("JUAN DELA CRUZ", 0.92, 38),
    line("Permanent Address", 0.91, 90),
    line("12 Main Street, Barangay San Isidro", 0.9, 108),
  ];
  const person = { first_name: "Juan", last_name: "Dela Cruz" };
  const fields = extractResidentIdFields(items, person);

  assert.equal(fields.firstName, "Juan");
  assert.equal(fields.lastName, "Dela Cruz");
  assert.equal(fields.nameText, "JUAN DELA CRUZ");
  assert.equal("addressText" in fields, false);
  assert.equal(matchResidentName(items, person, fields).passed, true);
});

test("ignores fused Given Names and Last Name labels and matches a joined multiword first name", () => {
  const items = [
    line("GIVENNAMES LASTNAME", 0.91, 20),
    line("YOHJRAILEY CRUZ", 0.96, 38),
  ];
  const person = { first_name: "Yohj Railey", last_name: "Cruz" };
  const fields = extractResidentIdFields(items, person);

  assert.equal(fields.firstName, "Yohj Railey");
  assert.equal(fields.lastName, "Cruz");
  assert.equal(fields.nameText, "YOHJRAILEY CRUZ");
  assert.equal(matchResidentName(items, person, fields).passed, true);
});

test("uses OCR text regions instead of substring matches across unrelated words", () => {
  const items = [line("ADDRESS: Main Street, Barangay San Isidro", 0.9, 20)];
  const result = matchResidentName(items, { first_name: "Ann", last_name: "Lee" });
  assert.equal(result.passed, false);
  assert.deepEqual(result.missing, ["first name", "last name"]);
});

test("extracts bilingual name labels without collecting the address column", () => {
  const items = [
    line("PERMANENT ADDRESS", 0.96, 20, 20),
    line("PANGALAN/GIVEN NAME OR FIRST NAME: ANA", 0.95, 20, 310),
    line("123 Sampaguita Street", 0.94, 40, 20),
    line("LAST NAME/APELYIDO: REYES", 0.95, 40, 310),
    line("Barangay San Isidro", 0.93, 60, 20),
    line("DATE OF BIRTH: 01/02/1990", 0.92, 60, 310),
    line("Pateros", 0.91, 80, 20),
    line("Citizenship Filipino", 0.9, 80, 310),
  ];
  const fields = extractResidentIdFields(items);

  assert.equal(fields.firstName, "ANA");
  assert.equal(fields.lastName, "REYES");
  assert.equal("addressText" in fields, false);
  assert.match(fields.nameText, /ANA.*REYES/);
});

test("trims adjacent labels from a shared OCR line and does not match names across columns", () => {
  const inline = [line("Given Name: ANA Surname: REYES", 0.94, 20)];
  const inlineFields = extractResidentIdFields(inline);
  assert.equal(inlineFields.firstName, "ANA");
  assert.equal(inlineFields.lastName, "REYES");

  const splitColumns = [
    line("ANA", 0.94, 20, 20),
    line("REYES", 0.94, 20, 300),
  ];
  const comparison = matchResidentName(splitColumns, { first_name: "Ana", last_name: "Reyes" });
  assert.equal(comparison.passed, false);
  assert.equal(comparison.confidence, null);
});

test("keeps the detected name separate from permanent address and ID metadata", () => {
  const items = [
    line("Name: ANA REYES", 0.94, 20),
    line("123 Sampaguita Street", 0.93, 60),
    line("Bgy. San Isidro", 0.92, 80),
    line("Pateros", 0.91, 100),
    line("Nationality: Filipino", 0.9, 120),
  ];
  const fields = extractResidentIdFields(items, { first_name: "Ana", last_name: "Reyes" });

  assert.equal(fields.nameText, "ANA REYES");
  assert.equal("addressText" in fields, false);
});

test("does not retry a clear OCR read merely because the name does not match the form", () => {
  assert.equal(isIdOcrReadInsufficient({
    itemCount: 5,
    text: "National ID Name: Other Person Date of Birth Nationality",
    confidence: 0.91,
  }), false);
  assert.equal(isIdOcrReadInsufficient({
    itemCount: 5,
    text: "National ID Other Person Date of Birth Nationality",
    confidence: 0.91,
  }), false);
});

test("retries an OCR read with missing regions or low confidence and suggests one orientation correction", () => {
  assert.equal(isIdOcrReadInsufficient({
    itemCount: 1,
    text: "ID",
    confidence: 0.4,
  }), true);
  assert.equal(suggestIdImageRotation([], 720, 1280), 90);
  assert.equal(suggestIdImageRotation([], 1280, 720), 180);
  const verticalLine = line("ADDRESS", 0.8, 10);
  verticalLine.poly = [[100, 20], [100, 120], [112, 120], [112, 20]];
  assert.equal(suggestIdImageRotation([verticalLine], 1280, 720), 90);
});


