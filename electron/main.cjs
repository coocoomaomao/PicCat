const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const core = require('./piccat-core.cjs');

const APP_TITLE='PicCat 图片转换猫';
const APP_ID='com.meowbuild.piccat';

function createWindow(){
  const win=new BrowserWindow({
    title:APP_TITLE,width:1180,height:860,minWidth:900,minHeight:680,
    backgroundColor:'#f7f2e8',icon:path.join(__dirname,'..','build','icon.ico'),
    autoHideMenuBar:true,show:false,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}
  });
  win.loadFile(path.join(__dirname,'..','index.html'));
  win.once('ready-to-show',()=>win.show());
  win.webContents.setWindowOpenHandler(({url})=>{ if(/^https?:/i.test(url)) shell.openExternal(url); return {action:'deny'}; });
}

ipcMain.handle('piccat:choose-images', async()=>{
  const r=await dialog.showOpenDialog({
    title:'选择要转换的图片',properties:['openFile','multiSelections'],
    filters:[{name:'图片',extensions:['jpg','jpeg','png','webp','avif','tif','tiff','gif']}]
  });
  return r.canceled?[]:r.filePaths;
});

ipcMain.handle('piccat:choose-output-dir', async()=>{
  const r=await dialog.showOpenDialog({title:'选择输出文件夹',properties:['openDirectory','createDirectory']});
  return r.canceled?null:r.filePaths[0];
});

ipcMain.handle('piccat:inspect-images', async(_e,files)=>{
  const out=[];
  for(const f of files){ try{ out.push({ok:true,...await core.inspectImage(f)}); }catch(err){ out.push({ok:false,path:f,name:path.basename(f),error:err.message}); } }
  return out;
});

ipcMain.handle('piccat:convert', async(event,payload)=>{
  return core.convertBatch(payload.files,payload.outputDir,payload.options,progress=>event.sender.send('piccat:progress',progress));
});

ipcMain.handle('piccat:reveal-file', async(_e,filePath)=>{ shell.showItemInFolder(filePath); return true; });

const lock=app.requestSingleInstanceLock();
if(!lock) app.quit(); else {
  app.on('second-instance',()=>{ const w=BrowserWindow.getAllWindows()[0]; if(w){if(w.isMinimized())w.restore();w.focus();} });
  app.whenReady().then(()=>{app.setAppUserModelId(APP_ID);createWindow();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});});
  app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
}
