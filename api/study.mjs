// POST /api/study on Vercel (Node runtime). See lib/routes.mjs.
import { study } from "../lib/routes.mjs";
import { vercel } from "../lib/vercel.mjs";

export const config = { maxDuration: 300 };
export default vercel(study);
