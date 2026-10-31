// GET /api/class?code=… and POST /api/class on Vercel. See lib/routes.mjs.
import { klass } from "../lib/routes.mjs";
import { vercel } from "../lib/vercel.mjs";

export default vercel(klass);
