const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const Database = require('./src/db');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;
let database;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#f5f2ec',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  database = new Database(path.join(app.getPath('userData'), 'journal.db'));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('entries:list', (_, filter) => {
  return database.getEntries(filter);
});

ipcMain.handle('entries:create', async (_, entry) => {
  return database.createEntry(entry);
});

ipcMain.handle('entries:updateStatus', (_, { id, status, date }) => {
  return database.updateEntryStatus(id, status, date);
});

ipcMain.handle('collections:list', () => {
  return database.getCollections();
});

ipcMain.handle('collections:create', (_, name) => {
  return database.createCollection(name);
});

ipcMain.handle('collections:assignEntry', (_, { entryId, collectionId }) => {
  return database.assignEntryToCollection(entryId, collectionId);
});

ipcMain.handle('collections:entries', (_, collectionId) => {
  return database.getEntriesByCollection(collectionId);
});

ipcMain.handle('trackers:list', () => {
  return database.getTrackers();
});

ipcMain.handle('trackers:create', (_, tracker) => {
  return database.createTracker(tracker);
});

ipcMain.handle('trackers:log', (_, payload) => {
  return database.logTrackerValue(payload);
});

ipcMain.handle('trackers:values', (_, trackerId) => {
  return database.getTrackerValues(trackerId);
});

ipcMain.handle('export:data', async () => {
  const exportPath = dialog.showSaveDialogSync(mainWindow, {
    title: 'Export Journal Data',
    defaultPath: `bullet-journal-export-${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (!exportPath) return null;

  const data = database.exportData();
  fs.writeFileSync(exportPath, JSON.stringify(data, null, 2), 'utf-8');
  return exportPath;
});

