import cron from "node-cron";
import { execFile } from "node:child_process";
import { mkdir, readdir, unlink, stat } from "node:fs/promises";
import path from "node:path";

// Deux tâches planifiées, fuseau Europe/Paris :
//  1. Newsletter mensuelle : appelle l'endpoint interne de l'app.
//  2. Sauvegarde SQLite quotidienne : copie cohérente du fichier de base.

const TZ = process.env.TZ || "Europe/Paris";

// --- 1. Newsletter ---------------------------------------------------------
const TARGET_URL =
  process.env.CRON_TARGET_URL || "http://app:3000/internal/cron/monthly";
const SECRET = process.env.CRON_SECRET;
const NEWSLETTER_SCHEDULE = process.env.CRON_SCHEDULE || "0 8 1 * *";

async function runNewsletter() {
  console.log(`[cron] newsletter mensuelle (${new Date().toISOString()})`);
  try {
    const res = await fetch(TARGET_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    const body = await res.text();
    if (res.ok) console.log(`[cron] newsletter OK: ${body}`);
    else console.error(`[cron] newsletter échec HTTP ${res.status}: ${body}`);
  } catch (err) {
    console.error(`[cron] newsletter erreur: ${err instanceof Error ? err.message : err}`);
  }
}

// --- 2. Sauvegarde SQLite --------------------------------------------------
const BACKUP_SCHEDULE = process.env.BACKUP_SCHEDULE || "0 3 * * *"; // tous les jours 03h00
const BACKUP_KEEP = Number(process.env.BACKUP_KEEP || 14); // conserve 14 sauvegardes
const DB_PATH = (process.env.DATABASE_URL || "file:/data/app.db").replace(/^file:/, "");
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), "backups");

function timestamp() {
  return new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+/, "");
}

async function runBackup() {
  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    const dest = path.join(BACKUP_DIR, `app-${timestamp()}.db`);
    // `.backup` de sqlite3 est cohérent même si l'app écrit pendant la copie.
    await new Promise((resolve, reject) => {
      execFile("sqlite3", [DB_PATH, `.backup '${dest}'`], (err) =>
        err ? reject(err) : resolve(undefined)
      );
    });
    console.log(`[cron] sauvegarde créée: ${dest}`);
    await pruneBackups();
  } catch (err) {
    console.error(`[cron] sauvegarde erreur: ${err instanceof Error ? err.message : err}`);
  }
}

async function pruneBackups() {
  const entries = (await readdir(BACKUP_DIR)).filter(
    (f) => f.startsWith("app-") && f.endsWith(".db")
  );
  if (entries.length <= BACKUP_KEEP) return;
  const withTimes = await Promise.all(
    entries.map(async (f) => ({
      f,
      mtime: (await stat(path.join(BACKUP_DIR, f))).mtimeMs,
    }))
  );
  withTimes.sort((a, b) => b.mtime - a.mtime); // plus récent d'abord
  for (const { f } of withTimes.slice(BACKUP_KEEP)) {
    await unlink(path.join(BACKUP_DIR, f));
    console.log(`[cron] sauvegarde supprimée: ${f}`);
  }
}

// --- Démarrage -------------------------------------------------------------
if (!SECRET) {
  console.error("[cron] CRON_SECRET manquant — arrêt.");
  process.exit(1);
}
for (const expr of [NEWSLETTER_SCHEDULE, BACKUP_SCHEDULE]) {
  if (!cron.validate(expr)) {
    console.error(`[cron] expression cron invalide: ${expr}`);
    process.exit(1);
  }
}

cron.schedule(NEWSLETTER_SCHEDULE, runNewsletter, { timezone: TZ });
cron.schedule(BACKUP_SCHEDULE, runBackup, { timezone: TZ });
console.log(
  `[cron] planifié — newsletter « ${NEWSLETTER_SCHEDULE} » -> ${TARGET_URL} ; ` +
    `sauvegarde « ${BACKUP_SCHEDULE} » -> ${BACKUP_DIR} (${TZ})`
);
