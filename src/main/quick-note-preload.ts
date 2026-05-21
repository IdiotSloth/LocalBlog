import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('quickNote', {
  save: (content: string) => ipcRenderer.send('quick-note:save', content),
  pin: (content: string) => ipcRenderer.send('quick-note:pin', content),
  hide: () => ipcRenderer.send('quick-note:hide'),
  getClipboardHistory: () => ipcRenderer.invoke('clipboard:history'),
});
