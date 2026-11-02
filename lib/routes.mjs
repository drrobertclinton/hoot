// The two API endpoints, written once and shared by the Vercel functions in
// api/ and by server.mjs. Each takes {method, ip, query, body} and returns
// [status, json].
import { runJob, allow, StudyError } from "./study.mjs";
import { getClass, classAction } from "./classes.mjs";
import { tutorTurn, masteryCheck, diagnose, weakSpots } from "./tutor.mjs";

const TUTOR = { tutor: tutorTurn, mastery: masteryCheck, diagnose, weakspots: weakSpots };

async function guard(fn) {
  try { return [200, { data: await fn() }]; }
  catch (e) {
    if (e instanceof StudyError) return [e.status, { code: e.code }];
    console.error(e);
    return [500, { code: "upstream_error" }];
  }
}

export async function study({ method, ip, body }) {
  if (method !== "POST") return [405, { code: "method_not_allowed" }];
  const tutor = body && TUTOR[body.kind];
  if (tutor) {
    if (!allow("tutor:" + ip, Number(process.env.TUTOR_REQUESTS_PER_HOUR) || 300)) return [429, { code: "rate_limited" }];
    return guard(() => tutor(body));
  }
  if (!allow("study:" + ip)) return [429, { code: "rate_limited" }];
  return guard(() => runJob(body));
}

export async function klass({ method, ip, query, body }) {
  if (method === "GET") {
    if (!allow("read:" + ip, 600)) return [429, { code: "rate_limited" }];
    return guard(() => getClass(query.get("code")));
  }
  if (method !== "POST") return [405, { code: "method_not_allowed" }];
  const creating = body && body.action === "create";
  if (!allow((creating ? "create:" : "teach:") + ip, creating ? 10 : 300)) return [429, { code: "rate_limited" }];
  return guard(() => classAction(body));
}
