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
    // Express 5 mendefinisikan req.query sebagai getter yang mem-parse ulang
    // query string di setiap akses, sehingga mutasi langsung hilang. Simpan
    // hasil parse sebagai own property agar menimpa getter tersebut.
    const query = req.query;
    if (query && typeof query === "object") {
      Object.defineProperty(req, "query", {
        value: parseBooleanValue(query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };
}
