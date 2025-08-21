// [MOBILE] src/api/ownerApplications.js
import { API_BASE } from "../config/api";

export async function submitOwnerApplication(payload) {
  const res = await fetch(`${API_BASE}/api/owner-applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Submit failed (${res.status}) ${text}`);
  }
  return res.json();
}
