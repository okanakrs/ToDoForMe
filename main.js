const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const TODO_FILE = '.todo.json';
const configPath = () => path.join(app.getPath('userData'), 'projects.json');

function readProjects() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch {
    return [];
  }
}

function writeProjects(list) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(list, null, 2));
}

// İlk açılışta (projects.json henüz yokken) Belgelerim\ToDoForMe\Genel klasörü ve boş .todo.json oluşturulur.
function ensureDefaultProject() {
  if (fs.existsSync(configPath())) return null;
  const dir = path.join(app.getPath('documents'), 'ToDoForMe', 'Genel');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, TODO_FILE);
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ items: [] }, null, 2));
  writeProjects([dir]);
  return dir;
}

// Klasör yolu argüman olarak verildiyse (ör. `electron . C:\Dev\cvfit`) listeye eklenir.
function folderFromArgv() {
  const arg = process.argv.slice(app.isPackaged ? 1 : 2).find((a) => !a.startsWith('-'));
  if (!arg) return null;
  const abs = path.resolve(arg);
  return fs.existsSync(abs) && fs.statSync(abs).isDirectory() ? abs : null;
}

ipcMain.handle('projects:list', () => {
  const firstRun = ensureDefaultProject();
  const list = readProjects();
  const fromArg = folderFromArgv();
  if (fromArg && !list.includes(fromArg)) {
    list.push(fromArg);
    writeProjects(list);
  }
  return { projects: list, initial: fromArg || firstRun };
});

ipcMain.handle('projects:add', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (res.canceled || !res.filePaths[0]) return null;
  const dir = res.filePaths[0];
  const list = readProjects();
  if (!list.includes(dir)) {
    list.push(dir);
    writeProjects(list);
  }
  return dir;
});

ipcMain.handle('projects:remove', (_e, dir) => {
  writeProjects(readProjects().filter((p) => p !== dir));
});

ipcMain.handle('todos:load', (_e, dir) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, TODO_FILE), 'utf8'));
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
});

ipcMain.handle('todos:save', (_e, dir, items) => {
  fs.writeFileSync(path.join(dir, TODO_FILE), JSON.stringify({ items }, null, 2));
});

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 980,
    height: 680,
    backgroundColor: '#0c0c0c',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  win.loadFile('index.html');
});

app.on('window-all-closed', () => app.quit());
