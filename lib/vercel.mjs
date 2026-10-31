// Adapts a route from lib/routes.mjs to a Vercel Node function.
export const vercel = route => async (req, res) => {
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const query = new URL(req.url, "http://x").searchParams;
  const [status, json] = await route({ method: req.method, ip, query, body: req.body });
  res.status(status).json(json);
};
