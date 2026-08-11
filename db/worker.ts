import { env } from "cloudflare:workers";
import { getDbForConnection } from "./index";

export function getWorkerDb() {
  return getDbForConnection(env.DATABASE_URL as string | undefined);
}
