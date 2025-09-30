const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('journal', {
  listEntries: (filter) => ipcRenderer.invoke('entries:list', filter),
  createEntry: (entry) => ipcRenderer.invoke('entries:create', entry),
  updateEntryStatus: (payload) => ipcRenderer.invoke('entries:updateStatus', payload),
  listCollections: () => ipcRenderer.invoke('collections:list'),
  createCollection: (name) => ipcRenderer.invoke('collections:create', name),
  assignEntryToCollection: (payload) => ipcRenderer.invoke('collections:assignEntry', payload),
  getCollectionEntries: (collectionId) => ipcRenderer.invoke('collections:entries', collectionId),
  listTrackers: () => ipcRenderer.invoke('trackers:list'),
  createTracker: (tracker) => ipcRenderer.invoke('trackers:create', tracker),
  logTrackerValue: (payload) => ipcRenderer.invoke('trackers:log', payload),
  getTrackerValues: (trackerId) => ipcRenderer.invoke('trackers:values', trackerId),
  exportData: () => ipcRenderer.invoke('export:data')
});
