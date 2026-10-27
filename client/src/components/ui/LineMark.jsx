import React from 'react';

/**
 * Two-letter route mark for a line.
 *
 * Line names are free-form, so split on punctuation and words rather than
 * taking the first two characters. "The-guys" becomes "TG", while a compact
 * name such as "CP" stays "CP".
 */
export const lineCode = (name) => {
  const cleaned = String(name || '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim();

  if (!cleaned) return 'LN';

  const words = cleaned.split(/\s+/);

  if (words.length > 1) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase();
};

/**
 * The visual identity for a line in the navigation and channel header.
 *
 * A mark is intentionally distinct from an avatar: lines are services, people
 * are people. The small track rule at the bottom is decorative only.
 */
const LineMark = ({ name, className = '' }) => (
  <span className={`line-mark ${className}`.trim()} aria-hidden="true">
    <span className="line-mark__code">{lineCode(name)}</span>
    <span className="line-mark__track" />
  </span>
);

export default LineMark;
