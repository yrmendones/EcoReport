const NAME_LABELS = [
  { kind: "firstName", pattern: /\b(?:given|first|forename)\s*names?\b|\bpangalan\b/i },
  { kind: "lastName", pattern: /\b(?:last|sur|family)\s*names?\b|\bsurname\b|\bapelyido\b/i },
  { kind: "name", pattern: /\b(?:full|cardholder|holder)\s*name\b|\bname\s+of\s+(?:the\s+)?(?:cardholder|holder|person)\b|^name\b/i },
];

const ADDRESS_LABEL = /\b(?:(?:permanent|residential|home)\s+)?address\b/i;
const FIELD_LABEL_START = /^(?:(?:given|first|forename|last|sur|family)\s*names?|surname|(?:full|middle)\s*name|name(?:\s+of\s+(?:the\s+)?(?:cardholder|holder|person))?|pangalan|apelyido|(?:(?:permanent|residential|home)\s+)?address|sex|gender|date\s+of\s+birth|birth|place\s+of\s+birth|nationality|citizenship|height|weight|license\s+no|id\s+no|document\s+no|card\s+no|expiry|expiration|signature|blood\s+type|contact\s+no|telephone|phone|postal\s+code|zip\s+code)\b/i;
const INLINE_FIELD_LABEL = /\b(?:given|first|forename|last|sur|family)\s*names?\b|\bsurname\b|\b(?:full|middle)\s*name\b|\bname\s+of\s+(?:the\s+)?(?:cardholder|holder|person)\b|\b(?:pangalan|apelyido)\b|\b(?:(?:permanent|residential|home)\s+)?address\b|\b(?:sex|gender|date\s+of\s+birth|birth|place\s+of\s+birth|nationality|citizenship|height|weight|license\s+no|id\s+no|document\s+no|card\s+no|expiry|expiration|signature|blood\s+type|contact\s+no|telephone|phone|postal\s+code|zip\s+code)\b/i;
const GENERIC_INLINE_NAME_LABEL = /\bname\s*[:#]/i;

export function normalizeIdTokens(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function getPolygonBounds(poly) {
  if (!Array.isArray(poly)) return null;
  const points = poly
    .map((point) => Array.isArray(point)
      ? { x: Number(point[0]), y: Number(point[1]) }
      : { x: Number(point?.x), y: Number(point?.y) })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!points.length) return null;
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
}

export function normalizeOcrLines(items = []) {
  return items
    .map((item) => {
      const text = String(item?.text || "").trim();
      const bounds = getPolygonBounds(item?.poly);
      const score = Number(item?.score);
      return {
        text,
        score: Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : null,
        bounds,
        y: bounds ? bounds.top : null,
        x: bounds ? bounds.left : null,
      };
    })
    .filter((line) => line.text)
    .sort((a, b) => {
      if (a.y == null && b.y == null) return 0;
      if (a.y == null) return 1;
      if (b.y == null) return -1;
      return (a.y - b.y) || ((a.x || 0) - (b.x || 0));
    });
}

function valueAfterLabel(text, pattern) {
  return String(text || "").replace(pattern, "").replace(/^\s*[:#\-–—|]+\s*/, "").trim();
}

const LEADING_NAME_LABEL = /^\s*(?:(?:[/:|,#\-–—]\s*)|(?:or\s+))?(?:(?:given|first|forename)\s*names?|(?:last|sur|family)\s*names?|surname|apelyido|pangalan|(?:full|middle|cardholder|holder)\s*name|name(?:\s+of\s+(?:the\s+)?(?:cardholder|holder|person))?)\b/i;

function stripLeadingNameLabels(value) {
  let remainder = String(value || "");
  for (let count = 0; count < 6; count += 1) {
    const label = remainder.match(LEADING_NAME_LABEL);
    if (!label) break;
    remainder = remainder.slice(label[0].length).replace(/^\s*[:#\-–—|/]+\s*/, "");
  }
  return remainder.trim();
}

function valueAfterRecognizedLabel(text, pattern) {
  const source = String(text || "");
  const labelStart = source.search(pattern);
  const labelAndValue = labelStart < 0 ? source : source.slice(labelStart);
  let value = stripLeadingNameLabels(
    valueAfterLabel(labelAndValue, pattern).replace(/^[\s:#/|-]+/, "")
  );
  const nextLabel = Math.min(
    ...[value.search(INLINE_FIELD_LABEL), value.search(GENERIC_INLINE_NAME_LABEL)].filter((index) => index >= 0)
  );
  if (nextLabel > 0) value = value.slice(0, nextLabel);
  else if (nextLabel === 0) {
    const match = value.match(INLINE_FIELD_LABEL) || value.match(GENERIC_INLINE_NAME_LABEL);
    const remainder = match ? value.slice(match[0].length) : "";
    if (/^\s*[:#/-]\s*/.test(remainder)) value = remainder.replace(/^\s*[:#/-]+\s*/, "");
  }
  return stripLeadingNameLabels(value).replace(/[|,;\s]+$/, "").trim();
}

function isFieldLabel(text) {
  return ADDRESS_LABEL.test(String(text || "")) || FIELD_LABEL_START.test(String(text || "").trim());
}

function followingLine(lines, index) {
  const current = lines[index];
  if (!current) return null;
  if (!current.bounds) {
    const next = lines[index + 1];
    return next && !isFieldLabel(next.text) ? next : null;
  }
  const currentHeight = Math.max(1, current.bounds.bottom - current.bounds.top);
  const candidates = lines
    .map((line, lineIndex) => ({ line, lineIndex }))
    .filter(({ line, lineIndex }) => {
      if (lineIndex === index || !line.bounds || isFieldLabel(line.text) || !sameTextColumn(current, line)) return false;
      const topDelta = line.bounds.top - current.bounds.top;
      const gap = line.bounds.top - current.bounds.bottom;
      const lineHeight = Math.max(1, line.bounds.bottom - line.bounds.top);
      return topDelta > currentHeight * 0.4 && gap <= Math.max(currentHeight, lineHeight) * 3;
    })
    .sort((a, b) => {
      const aGap = a.line.bounds.top - current.bounds.bottom;
      const bGap = b.line.bounds.top - current.bounds.bottom;
      return aGap - bGap || Math.abs(a.line.bounds.left - current.bounds.left) - Math.abs(b.line.bounds.left - current.bounds.left);
    });
  return candidates[0]?.line || null;
}

function sameTextColumn(first, second) {
  if (!first?.bounds || !second?.bounds) return true;
  const firstHeight = Math.max(1, first.bounds.bottom - first.bounds.top);
  const secondHeight = Math.max(1, second.bounds.bottom - second.bounds.top);
  return Math.abs(first.bounds.left - second.bounds.left) <= Math.max(16, Math.max(firstHeight, secondHeight) * 2.2);
}

function averageConfidence(lines) {
  const scores = lines.map((line) => line.score).filter((score) => score != null);
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
}

/** Retry only when the OCR read itself lacks enough text, regions, or confidence. */
export function isIdOcrReadInsufficient({ itemCount = 0, text = "", confidence } = {}) {
  return (
    itemCount < 2 ||
    String(text).trim().length < 18 ||
    confidence == null ||
    confidence < 0.65
  );
}

/** Suggest one whole-image retry from OCR line direction or portrait orientation. */
export function suggestIdImageRotation(items = [], width = 0, height = 0) {
  const angles = items
    .map(({ poly }) => {
      if (!Array.isArray(poly) || poly.length < 2) return null;
      const first = Array.isArray(poly[0])
        ? { x: Number(poly[0][0]), y: Number(poly[0][1]) }
        : { x: Number(poly[0]?.x), y: Number(poly[0]?.y) };
      const second = Array.isArray(poly[1])
        ? { x: Number(poly[1][0]), y: Number(poly[1][1]) }
        : { x: Number(poly[1]?.x), y: Number(poly[1]?.y) };
      if (![first.x, first.y, second.x, second.y].every(Number.isFinite)) return null;
      const raw = Math.atan2(second.y - first.y, second.x - first.x) * 180 / Math.PI;
      return ((raw + 90 + 180) % 180) - 90;
    })
    .filter((angle) => angle != null);
  if (angles.length) {
    const sortedAngles = [...angles].sort((a, b) => a - b);
    const median = sortedAngles[Math.floor(sortedAngles.length / 2)];
    if (median > 45) return 270;
    if (median < -45) return 90;
  }
  if (height > width * 1.12) return 90;
  if (width > height * 1.12) return 180;
  return null;
}

function collectNameFields(lines) {
  const nameLines = [];
  const fields = { firstName: [], lastName: [], name: [] };

  lines.forEach((line, index) => {
    const lineNameKinds = new Set(
      NAME_LABELS.filter(({ pattern }) => pattern.test(line.text)).map(({ kind }) => kind)
    );
    for (const { kind, pattern } of NAME_LABELS) {
      if (!pattern.test(line.text)) continue;
      let value = valueAfterRecognizedLabel(line.text, pattern);
      let evidence = [line];
      if (!value && lineNameKinds.size === 1) {
        const next = followingLine(lines, index);
        if (next) {
          value = next.text;
          evidence.push(next);
        }
      }
      if (isFieldLabel(value)) value = "";
      if (value) {
        fields[kind].push({ value, evidence });
        nameLines.push(...evidence);
      }
    }
  });

  const firstName = fields.firstName.map(({ value }) => value).join(" ").trim();
  const lastName = fields.lastName.map(({ value }) => value).join(" ").trim();
  const labelledName = [
    ...fields.name.map(({ value }) => value),
    ...fields.firstName.map(({ value }) => value),
    ...fields.lastName.map(({ value }) => value),
  ].join(" ").trim();

  return {
    firstName,
    lastName,
    nameText: labelledName || "",
    lines: [...new Set(nameLines)],
  };
}

function collectNameCandidateLines(lines) {
  const candidates = [];
  lines.forEach((line, index) => {
    if (!NAME_LABELS.some(({ pattern }) => pattern.test(line.text))) return;
    candidates.push(line);
    const next = followingLine(lines, index);
    if (next) candidates.push(next);
  });
  return [...new Set(candidates)];
}

export function extractResidentIdFields(items = [], expectedPerson = {}) {
  const lines = normalizeOcrLines(items);
  const named = collectNameFields(lines);
  const nameCandidateLines = collectNameCandidateLines(lines);
  const nameLines = named.lines.length
    ? named.lines
    : collectExpectedNameLines(lines, expectedPerson);
  const nameText = named.nameText || nameLines.map(({ text }) => text).join(" ").trim();
  const nameTokens = nameLines.flatMap(({ text }) => normalizeIdTokens(text));
  const expectedFirst = normalizeIdTokens(expectedPerson.first_name);
  const expectedLast = normalizeIdTokens(expectedPerson.last_name);
  const firstName = named.firstName || (expectedTokensMatch(expectedFirst, nameTokens)
    ? String(expectedPerson.first_name || "").trim()
    : "");
  const lastName = named.lastName || (expectedTokensMatch(expectedLast, nameTokens)
    ? String(expectedPerson.last_name || "").trim()
    : "");
  return {
    lines,
    firstName,
    lastName,
    nameText,
    nameConfidence: averageConfidence(nameLines),
    nameLines,
    nameCandidateLines,
  };
}

function tokenMatches(expected, actual) {
  if (expected === actual) return true;
  if (expected.length < 4 || actual.length < 4 || Math.abs(expected.length - actual.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < expected.length && j < actual.length) {
    if (expected[i] === actual[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (expected.length > actual.length) i += 1;
    else if (expected.length < actual.length) j += 1;
    else { i += 1; j += 1; }
  }
  return edits + ((expected.length - i) + (actual.length - j) <= 1 ? 0 : 2) <= 1;
}

function expectedTokensMatch(expectedTokens, actualTokens) {
  if (!expectedTokens.length) return false;
  const matched = expectedTokens.map((expected) =>
    actualTokens.some((actual) => tokenMatches(expected, actual))
  );

  for (let start = 0; start < expectedTokens.length;) {
    if (matched[start]) {
      start += 1;
      continue;
    }

    let groupMatched = false;
    const maxEnd = Math.min(expectedTokens.length, start + 3);
    for (let end = maxEnd; end > start + 1; end -= 1) {
      const joined = expectedTokens.slice(start, end).join("");
      if (!actualTokens.some((actual) => tokenMatches(joined, actual))) continue;
      for (let index = start; index < end; index += 1) matched[index] = true;
      start = end;
      groupMatched = true;
      break;
    }
    if (!groupMatched) start += 1;
  }

  return matched.every(Boolean);
}

function hasExpectedNameEvidence(expectedTokens, actualTokens) {
  if (expectedTokens.some((expected) =>
    actualTokens.some((actual) => tokenMatches(expected, actual))
  )) return true;

  for (let start = 0; start < expectedTokens.length; start += 1) {
    for (let end = Math.min(expectedTokens.length, start + 3); end > start + 1; end -= 1) {
      const joined = expectedTokens.slice(start, end).join("");
      if (actualTokens.some((actual) => tokenMatches(joined, actual))) return true;
    }
  }
  return false;
}

function collectExpectedNameLines(lines, person = {}) {
  const firstTokens = normalizeIdTokens(person.first_name);
  const lastTokens = normalizeIdTokens(person.last_name);
  if (!firstTokens.length || !lastTokens.length) return [];

  for (let startIndex = 0; startIndex < lines.length; startIndex += 1) {
    const startLine = lines[startIndex];
    if (isFieldLabel(startLine.text)) continue;
    const region = [startLine];
    let cursor = startIndex;
    while (region.length < 3) {
      const next = followingLine(lines, cursor);
      if (!next || isFieldLabel(next.text)) break;
      region.push(next);
      cursor = lines.indexOf(next);
      if (cursor < 0) break;
    }
    const actualTokens = region.flatMap(({ text }) => normalizeIdTokens(text));
    const hasFirstName = expectedTokensMatch(firstTokens, actualTokens);
    const hasLastName = expectedTokensMatch(lastTokens, actualTokens);
    if (hasFirstName && hasLastName) return region;
  }
  return [];
}

export function matchResidentName(items = [], person = {}, fields = null) {
  const normalizedLines = normalizeOcrLines(items);
  const labelledNames = collectNameFields(normalizedLines).lines;
  const lines = fields?.nameLines?.length
    ? fields.nameLines
    : labelledNames.length
      ? labelledNames
      : collectExpectedNameLines(normalizedLines, person);
  const actualTokens = lines.flatMap(({ text }) => normalizeIdTokens(text));
  const matchExpected = (value) => {
    const expectedTokens = normalizeIdTokens(value);
    if (!expectedTokens.length) return { passed: true, matched: [] };
    const matched = expectedTokens.map((expected) => actualTokens.some((actual) => tokenMatches(expected, actual)));
    return { passed: expectedTokensMatch(expectedTokens, actualTokens), matched };
  };
  const first = matchExpected(person.first_name);
  const last = matchExpected(person.last_name);
  const missing = [];
  if (!first.passed) missing.push("first name");
  if (!last.passed) missing.push("last name");
  const expectedNameTokens = [
    ...normalizeIdTokens(person.first_name),
    ...normalizeIdTokens(person.last_name),
  ];
  const evidence = lines.filter(({ text }) =>
    hasExpectedNameEvidence(expectedNameTokens, normalizeIdTokens(text))
  );
  const middle = normalizeIdTokens(person.middle_name).filter((token) => token !== "na");
  const middleIsOptional = !middle.length || middle.join("") === "na";
  const middlePresent = middleIsOptional || expectedTokensMatch(middle, actualTokens);
  return {
    passed: first.passed && last.passed,
    missing,
    confidence: averageConfidence(evidence),
    evidence,
    middlePresent,
  };
}

