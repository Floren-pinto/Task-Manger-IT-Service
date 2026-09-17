function parseBooleanValue(val) {
  if (val === "true") return true;
  if (val === "false") return false;
  if (Array.isArray(val)) {
    return val.map(parseBooleanValue);
  }
  if (val !== null && typeof val === "object") {
    const parsed = Object.create(null);
    for (const [key, value] of Object.entries(val)) {
      parsed[key] = parseBooleanValue(value);
    }
    return parsed;
  }
  return val;
}

export function boolParser() {
  return (req, _res, next) => {
    if (req.query && typeof req.query === "object") {
      for (const [key, value] of Object.entries(req.query)) {
        req.query[key] = parseBooleanValue(value);
      }
    }
    next();
  };
}
