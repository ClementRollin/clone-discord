import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { io } from 'socket.io-client';
import { Message } from './type/Message'; // Add this line

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const socket = io("http://localhost:3000");

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  const devServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
  const indexPath = path.join(__dirname, `../renderer/${process.env.MAIN_WINDOW_VITE_NAME}/index.html`);

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(indexPath);
  }

  // Open the DevTools.
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  const handleMessage = (message: unknown) => {
    console.log("Received message", message);
    mainWindow.webContents.send("socket-message", message);
  }

  socket.on("message", handleMessage);

  mainWindow.on("close", () => {
    socket.off("message", handleMessage);
  });

  ipcMain.on("socket-message", (_, message: Message) => { // Add the Message type to the message parameter
    socket.emit("message", message);
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
