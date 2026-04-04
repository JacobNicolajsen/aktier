const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { takeSnapshot } = require('../routes/monthly');

const BACKUP_DIR = path.join(__dirname, '../../backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function exportToJson() {
  ensureBackupDir();

  const funds = db.prepare('SELECT * FROM funds').all();
  const transactions = db.prepare('SELECT * FROM transactions ORDER BY date ASC').all();
  const snapshots = db.prepare('SELECT * FROM monthly_snapshots').all();

  const data = {
    exported_at: new Date().toISOString(),
    funds,
    transactions,
    monthly_snapshots: snapshots,
  };

  const date = new Date();
  const filename = `backup_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[Backup] Gemt: ${filepath}`);

  // Behold kun de seneste 24 backups
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
    .sort();

  if (files.length > 24) {
    const toDelete = files.slice(0, files.length - 24);
    for (const f of toDelete) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`[Backup] Slettet gammel backup: ${f}`);
    }
  }

  return filepath;
}

function startScheduler() {
  // Kør den 1. i måneden kl. 00:05
  cron.schedule('5 0 1 * *', async () => {
    console.log('[Cron] Månedlig backup og snapshot starter...');
    try {
      const now = new Date();
      // Tag snapshot for foregående måned (da det er den vi afslutter)
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = now.getMonth() === 0 ? 12 : now.getMonth();
      await takeSnapshot(year, month);
      exportToJson();
      console.log('[Cron] Månedlig backup og snapshot fuldført');
    } catch (err) {
      console.error('[Cron] Fejl under backup:', err.message);
    }
  });

  console.log('[Backup] Månedlig cron-job aktiv (1. i måneden kl. 00:05)');
}

module.exports = { startScheduler, exportToJson };
