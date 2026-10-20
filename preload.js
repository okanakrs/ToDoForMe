const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  addProject: () => ipcRenderer.invoke('projects:add'),
  removeProject: (dir) => ipcRenderer.invoke('projects:remove', dir),
  loadTodos: (dir) => ipcRenderer.invoke('todos:load', dir),
  saveTodos: (dir, items) => ipcRenderer.invoke('todos:save', dir, items),
});
