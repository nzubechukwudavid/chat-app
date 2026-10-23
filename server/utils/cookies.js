/**
 * Tiny cookie parser - avoids pulling in `cookie-parser` for a single value.
 * Parses the raw `Cookie` header into a plain object.
 */
const parseCookies = (req) => {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index < 0) return acc;

    const key = part.slice(0, index).trim();
    if (!key) return acc;

    let value = part.slice(index + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);

    try {
      acc[key] = decodeURIComponent(value);
    } catch {
      acc[key] = value;
    }
    return acc;
  }, {});
};

module.exports = { parseCookies };
