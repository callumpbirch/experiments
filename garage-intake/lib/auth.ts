import { cookies } from "next/headers";
import { validSession } from "./security.mjs";
export async function staffSignedIn() {
  return validSession((await cookies()).get("garage_session")?.value || "");
}
