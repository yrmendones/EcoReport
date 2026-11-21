const ADDRESS_WORD_ALIASES = {
  ave: "avenue",
  av: "avenue",
  brgy: "barangay",
  bgy: "barangay",
  blvd: "boulevard",
  rd: "road",
  st: "street",
};

const STREET_SUFFIXES = new Set([
  "street",
  "avenue",
  "road",
  "boulevard",
  "drive",
  "lane",
  "highway",
  "way",
]);

function tokenizeAddress(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ADDRESS_WORD_ALIASES[word] || word);
}

function removeLeading(tokens, prefixes) {
  const result = [...tokens];
  while (result.length && prefixes.has(result[0])) result.shift();
  return result;
}

function removeTrailing(tokens, suffixes) {
  const result = [...tokens];
  while (result.length && suffixes.has(result[result.length - 1])) result.pop();
  return result;
}

function normalizeComponent(value, kind) {
  let tokens = tokenizeAddress(value);
  if (kind === "street") {
    const suffix = tokens.length && STREET_SUFFIXES.has(tokens[tokens.length - 1])
      ? tokens[tokens.length - 1]
      : "";
    if (suffix) tokens = tokens.slice(0, -1);
    return { tokens, suffix };
  }
  if (kind === "barangay") {
    tokens = removeLeading(tokens, new Set(["barangay"]));
    tokens = removeTrailing(tokens, new Set(["barangay"]));
  } else if (kind === "city") {
    tokens = removeLeading(tokens, new Set(["city", "municipality", "municipal", "town", "of"]));
    tokens = removeTrailing(tokens, new Set(["city", "municipality", "municipal", "town"]));
  }
  return { tokens, suffix: "" };
}

function tokensMatch(expected, extracted) {
  if (expected === extracted) return true;
  if (Math.min(expected.length, extracted.length) < 5 || Math.abs(expected.length - extracted.length) > 1) {
    return false;
  }

  let expectedIndex = 0;
  let extractedIndex = 0;
  let edits = 0;
  while (expectedIndex < expected.length && extractedIndex < extracted.length) {
    if (expected[expectedIndex] === extracted[extractedIndex]) {
      expectedIndex += 1;
      extractedIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (expected.length > extracted.length) expectedIndex += 1;
    else if (expected.length < extracted.length) extractedIndex += 1;
    else {
      expectedIndex += 1;
      extractedIndex += 1;
    }
  }
  if (expectedIndex < expected.length || extractedIndex < extracted.length) edits += 1;
  return edits <= 1;
}

function componentCoverage(expectedValue, extractedTokens, kind) {
  const normalized = normalizeComponent(expectedValue, kind).tokens;
  const expectedTokens = normalized.filter((token) => token.length > 1);
  const tokens = expectedTokens.length ? expectedTokens : normalized;
  if (!tokens.length) return 0;

  const usedExtracted = new Set();
  let matched = 0;
  for (const expected of tokens) {
    const matchIndex = extractedTokens.findIndex((extracted, index) =>
      !usedExtracted.has(index) && tokensMatch(expected, extracted)
    );
    if (matchIndex !== -1) {
      usedExtracted.add(matchIndex);
      matched += 1;
    }
  }
  return matched / tokens.length;
}

function addressCandidates(ocrText) {
  const tokens = tokenizeAddress(ocrText);
  const candidates = [];
  const addressLabel = tokens.indexOf("address");
  if (addressLabel !== -1) candidates.push(tokens.slice(addressLabel + 1, addressLabel + 36));

  // Many IDs omit an ADDRESS label. A barangay marker provides a reliable
  // anchor for the nearby street and city/municipality text.
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] === "barangay") {
      candidates.push(tokens.slice(Math.max(0, index - 14), Math.min(tokens.length, index + 24)));
    }
  }
  if (
    !candidates.length &&
    tokens.some((token) => STREET_SUFFIXES.has(token)) &&
    tokens.some((token) => ["city", "municipality", "municipal", "town"].includes(token))
  ) {
    // Allow a recognizable street-to-city address when OCR drops the address
    // label and the barangay abbreviation, while still requiring two matches.
    candidates.push(tokens);
  }
  return candidates.filter((candidate) => candidate.length > 0);
}

/**
 * Compare meaningful address keywords from the form with OCR text. House
 * numbers are excluded, OCR tokens may have one-character errors, and two
 * well-supported components can verify an address when the third is unclear.
 */
export function validatePermanentAddressAgainstId(ocrText, address) {
  const required = [
    ["street", "Street"],
    ["barangay", "Barangay"],
    ["city", "City / Municipality"],
  ];
  const missingInput = required
    .filter(([key]) => !normalizeComponent(address?.[key], key).tokens.length)
    .map(([, label]) => label);
  if (missingInput.length) {
    return {
      passed: false,
      reason: `Complete the permanent ${missingInput.join(", ")} to verify it against your ID.`,
      missing: missingInput,
    };
  }

  const candidates = addressCandidates(ocrText);
  if (!candidates.length) {
    return {
      passed: false,
      reason: "We couldn't read the address on this ID. Upload a clearer photo showing the street, barangay, and city or municipality.",
      missing: ["ID address"],
    };
  }

  const componentWeights = { street: 0.4, barangay: 0.35, city: 0.3 };
  const evidenceByCandidate = candidates.map((candidate) => {
    const coverage = required.map(([key]) =>
      componentCoverage(address[key], candidate, key)
    );
    const matched = coverage.map((value) => value >= 0.58);
    const matchedIndexes = matched.flatMap((value, index) => value ? [index] : []);
    const evidenceWeight = matchedIndexes.reduce(
      (sum, index) => sum + componentWeights[required[index][0]],
      0
    );
    const score = evidenceWeight
      ? matchedIndexes.reduce((sum, index) => {
          const key = required[index][0];
          return sum + componentWeights[key] * coverage[index];
        }, 0) / evidenceWeight
      : 0;
    return { coverage, matched, matchedCount: matchedIndexes.length, score };
  });

  // Require evidence from at least two different address components so a
  // shared city name or one common street token cannot approve an unrelated ID.
  if (evidenceByCandidate.some((evidence) => evidence.matchedCount >= 2 && evidence.score >= 0.62)) {
    return { passed: true, reason: "", missing: [] };
  }

  const bestEvidence = evidenceByCandidate.reduce((best, evidence) => {
    if (evidence.matchedCount > best.matchedCount) return evidence;
    if (evidence.matchedCount === best.matchedCount && evidence.score > best.score) return evidence;
    return best;
  }, { coverage: [0, 0, 0], matched: [false, false, false], matchedCount: 0, score: 0 });
  const missing = required
    .filter((_, index) => !bestEvidence.matched[index])
    .map(([, label]) => label);
  return {
    passed: false,
    reason: "We couldn't find enough matching address details on this ID. Check the permanent address or upload a clearer ID photo.",
    missing,
  };
}

/** Return face quality measurements from face-api.js 68-point landmarks. */
export function isUsableLiveFace(face, frameWidth, frameHeight) {
  const box = face?.detection?.box;
  const score = face?.detection?.score || 0;
  if (!box || !frameWidth || !frameHeight || score < 0.72 || box.width < 100 || box.height < 100) {
    return false;
  }
  const areaRatio = (box.width * box.height) / (frameWidth * frameHeight);
  const aspectRatio = box.width / box.height;
  const centerX = (box.x + box.width / 2) / frameWidth;
  const centerY = (box.y + box.height / 2) / frameHeight;
  return (
    areaRatio >= 0.04 &&
    aspectRatio >= 0.55 && aspectRatio <= 1.35 &&
    centerX >= 0.18 && centerX <= 0.82 &&
    centerY >= 0.12 && centerY <= 0.88
  );
}

export function getLiveFaceYaw(landmarks) {
  const points = landmarks?.positions;
  if (!Array.isArray(points) || points.length < 48) return null;
  const leftEyeCenter = points.slice(36, 42).reduce((sum, point) => sum + point.x, 0) / 6;
  const rightEyeCenter = points.slice(42, 48).reduce((sum, point) => sum + point.x, 0) / 6;
  const eyeSpan = Math.abs(rightEyeCenter - leftEyeCenter);
  if (!eyeSpan || !points[30]) return null;
  const eyeMidpoint = (leftEyeCenter + rightEyeCenter) / 2;
  const noseTip = points[30];

  return (noseTip.x - eyeMidpoint) / eyeSpan;
}
