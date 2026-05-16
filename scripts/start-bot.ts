import "./env-loader";

import { start, shutdown } from "../src/lib/baileys/client";
import { getPendingPaymentsToRemind, markPaymentReminded, enqueueOutbox } from "../src/lib/db";
import fs from "node:fs";
import path from "node:path";

const RESTART_FLAG = path.resolve(process.cwd(), "data/.restart");

function startReminderCron() {
  setInterval(() => {
    try {
      const pending = getPendingPaymentsToRemind();
      for (const p of pending) {
        const msg = `⏰ Recordatorio de cobro\nMonto: ${p.amount.toLocaleString("es-CU")} CUP\nConcepto: ${p.description}${p.link_confirm ? `\nPagar: ${p.link_confirm}` : ""}`;
        enqueueOutbox(p.conversation_id, p.phone, msg);
        markPaymentReminded(p.id);
        console.log(`[reminder] cobro pendiente recordado → conv=${p.conversation_id} monto=${p.amount}`);
      }
    } catch (e) {
      console.error("[reminder] error:", e);
    }
  }, 30 * 60 * 1000); // every 30 min
}

async function main() {
  await start();
  startReminderCron();

  setInterval(() => {
    if (fs.existsSync(RESTART_FLAG)) {
      fs.unlinkSync(RESTART_FLAG);
      console.log("[bot] Reiniciando por flag .restart...");
      shutdown().then(() => {
        const authDir = path.resolve(process.cwd(), "auth");
        if (fs.existsSync(authDir)) {
          for (const f of fs.readdirSync(authDir)) {
            fs.rmSync(path.join(authDir, f), { recursive: true, force: true });
          }
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
