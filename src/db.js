const Database = require('better-sqlite3');

const STATUS_MAP = ['open', 'done', 'migrated_forward', 'migrated_backward', 'canceled'];

class JournalDatabase {
  constructor(filePath) {
    this.db = new Database(filePath);
    this.prepare();
  }

  prepare() {
    const createEntries = `
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        tags TEXT,
        content TEXT NOT NULL
      );
    `;

    const createCollections = `
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
    `;

    const createCollectionEntries = `
      CREATE TABLE IF NOT EXISTS collection_entries (
        collection_id INTEGER NOT NULL,
        entry_id INTEGER NOT NULL,
        PRIMARY KEY (collection_id, entry_id),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
      );
    `;

    const createTrackers = `
      CREATE TABLE IF NOT EXISTS trackers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('boolean', 'numeric')),
        unit TEXT
      );
    `;

    const createTrackerValues = `
      CREATE TABLE IF NOT EXISTS tracker_values (
        tracker_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (tracker_id, date),
        FOREIGN KEY (tracker_id) REFERENCES trackers(id) ON DELETE CASCADE
      );
    `;

    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec(createEntries);
    this.db.exec(createCollections);
    this.db.exec(createCollectionEntries);
    this.db.exec(createTrackers);
    this.db.exec(createTrackerValues);
  }

  getEntries(filter = {}) {
    const conditions = [];
    const params = {};

    if (filter.date) {
      conditions.push('date = @date');
      params.date = filter.date;
    }

    if (filter.month) {
      conditions.push("strftime('%Y-%m', date) = @month");
      params.month = filter.month;
    }

    if (filter.status) {
      conditions.push('status = @status');
      params.status = filter.status;
    }

    if (filter.type) {
      conditions.push('type = @type');
      params.type = filter.type;
    }

    if (filter.query) {
      conditions.push('(content LIKE @query OR tags LIKE @query)');
      params.query = `%${filter.query}%`;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`
      SELECT id, type, date, status, tags, content
      FROM entries
      ${where}
      ORDER BY date DESC, id DESC
    `);

    return stmt.all(params);
  }

  createEntry(entry) {
    if (!['task', 'event', 'note'].includes(entry.type)) {
      throw new Error('Invalid entry type.');
    }

    const stmt = this.db.prepare(`
      INSERT INTO entries (type, date, status, tags, content)
      VALUES (@type, @date, @status, @tags, @content)
    `);

    const info = stmt.run({
      type: entry.type,
      date: entry.date,
      status: entry.status && STATUS_MAP.includes(entry.status) ? entry.status : 'open',
      tags: entry.tags || null,
      content: entry.content
    });

    return { id: info.lastInsertRowid, ...entry, status: entry.status || 'open' };
  }

  updateEntryStatus(id, status, date) {
    if (!STATUS_MAP.includes(status)) {
      throw new Error('Invalid status');
    }

    const stmt = this.db.prepare(`
      UPDATE entries
      SET status = @status,
          date = COALESCE(@date, date)
      WHERE id = @id
    `);

    stmt.run({ id, status, date: date || null });
    return this.db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
  }

  getCollections() {
    const stmt = this.db.prepare('SELECT id, name FROM collections ORDER BY name ASC');
    return stmt.all();
  }

  createCollection(name) {
    const stmt = this.db.prepare('INSERT INTO collections (name) VALUES (?)');
    const info = stmt.run(name.trim());
    return { id: info.lastInsertRowid, name };
  }

  assignEntryToCollection(entryId, collectionId) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO collection_entries (collection_id, entry_id)
      VALUES (@collectionId, @entryId)
    `);
    stmt.run({ collectionId, entryId });
    return { entryId, collectionId };
  }

  getEntriesByCollection(collectionId) {
    const stmt = this.db.prepare(`
      SELECT e.id, e.type, e.date, e.status, e.tags, e.content
      FROM entries e
      INNER JOIN collection_entries ce ON ce.entry_id = e.id
      WHERE ce.collection_id = @collectionId
      ORDER BY e.date DESC
    `);
    return stmt.all({ collectionId });
  }

  getTrackers() {
    const stmt = this.db.prepare('SELECT id, name, type, unit FROM trackers ORDER BY name ASC');
    return stmt.all();
  }

  createTracker(tracker) {
    if (!['boolean', 'numeric'].includes(tracker.type)) {
      throw new Error('Invalid tracker type');
    }

    const stmt = this.db.prepare(`
      INSERT INTO trackers (name, type, unit)
      VALUES (@name, @type, @unit)
    `);

    const info = stmt.run({
      name: tracker.name.trim(),
      type: tracker.type,
      unit: tracker.unit || null
    });

    return { id: info.lastInsertRowid, ...tracker };
  }

  logTrackerValue({ trackerId, date, value }) {
    const stmt = this.db.prepare(`
      INSERT INTO tracker_values (tracker_id, date, value)
      VALUES (@trackerId, @date, @value)
      ON CONFLICT(tracker_id, date) DO UPDATE SET value = excluded.value
    `);
    stmt.run({ trackerId, date, value: String(value) });
    return { trackerId, date, value };
  }

  getTrackerValues(trackerId) {
    const stmt = this.db.prepare(`
      SELECT date, value
      FROM tracker_values
      WHERE tracker_id = @trackerId
      ORDER BY date ASC
    `);
    return stmt.all({ trackerId });
  }

  exportData() {
    const entries = this.getEntries();
    const collections = this.getCollections();
    const trackerStmt = this.db.prepare('SELECT id, name, type, unit FROM trackers');
    const trackers = trackerStmt.all();

    const collectionEntries = collections.map((collection) => ({
      ...collection,
      entries: this.getEntriesByCollection(collection.id)
    }));

    const trackerValues = trackers.map((tracker) => ({
      ...tracker,
      values: this.getTrackerValues(tracker.id)
    }));

    return {
      exportedAt: new Date().toISOString(),
      entries,
      collections: collectionEntries,
      trackers: trackerValues
    };
  }
}

module.exports = JournalDatabase;
