import "./env-loader";

import { start, shutdown } from "../src/lib/baileys/client";
import fs from "node:fs";
import path from "node:path";

const RESTART_FLAG = path.resolve(process.cwd(), "data/.restart");

async function main() {
  await start();

  setInterval(() => {
    if (fs.existsSync(RESTART_FLAG)) {
      fs.unlinkSync(RESTART_FLAG);
      console.log("[bot] Reiniciando por flag .restart...");
      shutdown().then(() => {
        const authDir = path.resolve(process.cwd(), "auth");
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
        }
        start();
      });
    }
  }, 1000);
}

main().catch((err) => {
  console.error("[bot] Error fatal:", err);
  process.exit(1);
});
