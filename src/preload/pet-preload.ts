import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('petApi', {
  startDrag: () => ipcRenderer.send('pet:startDrag'),
  stopDrag: () => ipcRenderer.send('pet:stopDrag'),
  onClick: () => ipcRenderer.send('pet:click'),
  savePosition: () => ipcRenderer.send('pet:savePosition'),
  getImgPath: (key: string) => ipcRenderer.invoke('pet:getImgPath', key),
});
