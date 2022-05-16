const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const javaCompiler = require("./js/javaCompiler");
const serverStarter = require("./js/serverStarter");
const prompt = require("electron-prompt");
const path = require("path");
const fs = require("fs-extra");
const notifier = require("node-notifier");
const ProgressBar = require("electron-progressbar");
const { copyFile } = require("./js/util");
const AdmZip = require("adm-zip");

const DEFAULT_TITLE = "MCP Editor";
const APP_MODEL_ID = "tobiaswadseth.mcp";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let logWin;
let errWin;
let editorWin;

let currentProject;
let currentProjectPath;
let isNewProject;

let recentProjects = [];

const init = () => {
  win = new BrowserWindow({
    title: DEFAULT_TITLE + " " + app.getVersion(),
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: "#373737",
  });

  showWindow();
};

const showWindow = () => {
  app.unsavedChanges = 0;
  app.uncompiledChanges = 0;

  // and load the index.html of the app.
  win.loadFile("index.html");
  win.once("ready-to-show", () => {
    win.show();

    checkFileAssociation();
  });

  win.on("close", (e) => {
    if (app.unsavedChanges > 0) {
      let c = dialog.showMessageBox({
        type: "question",
        message:
          "You have " +
          app.unsavedChanges +
          " unsaved changes. Are you sure you want to exit?",
        buttons: ["Yes", "No"],
      });
      if (c === 1) {
        e.preventDefault();
      }
    }
    serverStarter.kill();
    logWin = null;
  });

  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  readRecentProjects();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", init);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    init();
  }
});

process.on("uncaughtException", (error) => {
  console.error(error);
});

const checkFileAssociation = () => {
  app.setAppUserModelId(APP_MODEL_ID);
  if (process.platform === "win32" && process.argv.length >= 2) {
    let p = process.argv[1];
    if (p && p.length > 1) {
      openProject(path.dirname(p));
    }
  }
};

const readRecentProjects = () => {
  let recentProjectFile = path.join(
    app.getPath("userData"),
    "recentProjects.json"
  );
  if (!fs.existsSync(recentProjectFile)) {
    return;
  }
  fs.readFile(recentProjectFile, (err, data) => {
    if (err) {
      console.warn(err);
      return;
    }
    data = JSON.parse(data);

    let promises = [];
    for (let i = 0; i < data.length; i++) {
      promises.push(
        new Promise((resolve) => {
          fs.readFile(
            path.join(data[i], "project.json"),
            (err, projectData) => {
              if (err) {
                console.warn(err);
                resolve({});
                return;
              }
              projectData = JSON.parse(projectData);

              resolve({
                path: data[i],
                name: projectData.name,
                editorVersion: projectData.editorVersion,
              });
            }
          );
        })
      );
    }

    Promise.all(promises).then((projects) => {
      projects = projects || [];
      recentProjects = projects.filter((p) => p && p.path);

      if (win) {
        win.webContents.send("recentProjects", recentProjects);
      }
      updateJumpList();
    });
  });
};

const writeRecentProjects = () => {
  if (recentProjects.length > 10) {
    recentProjects.pop();
  }
  let paths = [];
  for (let i = 0; i < recentProjects.length; i++) {
    paths.push(recentProjects[i].path);
  }
  fs.writeFile(
    path.join(app.getPath("userData"), "recentProjects.json"),
    JSON.stringify(paths),
    "utf-8",
    (err) => {
      if (err) {
        console.warn(err);
      }
    }
  );
};

ipcMain.on("getRecentProjects", (event) => {
  event.sender.send("recentProjects", recentProjects || []);
});

const updateJumpList = () => {
  if (!app.isPackaged || process.platform !== "win32") return; // Won't recent projects won't work properly if the app is running from the electron.exe wrapper
  let recentProjectItems = [];
  for (let i = 0; i < recentProjects.length; i++) {
    recentProjectItems.push({
      type: "task",
      title: recentProjects[i].name,
      description: "Open " + recentProjects[i].name,
      program: process.execPath,
      args: path.join(recentProjects[i].path, "project.json"),
    });
  }
  app.setJumpList([
    {
      type: "custom",
      name: "Recent Projects",
      items: recentProjectItems,
    },
  ]);
};

ipcMain.on("openGraph", () => {
  if (win) {
    win.loadFile("views/graph.html");
  }
});

ipcMain.on("showCreateNewProject", () => {
  let projectPath = dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (!projectPath || projectPath.length === 0) {
    return;
  }
  if (Array.isArray(projectPath)) {
    projectPath = projectPath[0];
    if (!projectPath || projectPath.length === 0) {
      return;
    }
  }
  let pathSplit = projectPath.split("\\");

  let name = pathSplit[pathSplit.length - 1];
  prompt({
    title: "Give your project a name",
    label: "Project Name",
    value: name,
    height: 150,
  }).then((r) => {
    if (r) {
      name = r;

      dialog.showMessageBox(
        {
          title: "Select spigot.jar location",
          message:
            "Please select the location of a valid Spigot or Paper Server executable (usually spigot.jar)",
          buttons: ["Select", "I don't have one"],
        },
        (r) => {
          if (r === 0) {
            let libPath = dialog.showOpenDialog({
              properties: ["openFile"],
              filters: [{ name: "Spigot JAR file", extensions: ["jar"] }],
            });
            if (!libPath || libPath.length === 0) {
              return;
            }
            if (Array.isArray(libPath)) {
              libPath = libPath[0];
              if (!libPath || libPath.length === 0) {
                return;
              }
            }

            createNewProject(
              {
                path: projectPath,
                name: name,
              },
              libPath
            );
          } else {
            shell.openExternal(
              "https://www.spigotmc.org/wiki/buildtools/#running-buildtools"
            );
          }
        }
      );
    }
  });
});

const createNewProject = (arg, lib) => {
  let projectFilePath = path.join(arg.path, "project.json");
  if (fs.existsSync(projectFilePath)) {
    dialog.showErrorBox(
      "Project exists",
      "There is already a MCP project in that directory"
    );
    return;
  }

  let progressBar = new ProgressBar({
    indeterminate: false,
    text: "Creating Project...",
    detail: "Creating Project...",
    maxValue: 5,
  });

  let projectInfo = {
    name: arg.name,
    creationTime: Date.now(),
    description: "My Awesome Plugin!!",
    author: "tobiaswadseth",
    package: "my.awesome.plugin",
    version: "0.0.0",
    type: "spigot",
    lastSave: 0,
    lastCompile: 0,
    editorVersion: app.getVersion(),
    buildNumber: 0,
  };

  progressBar.on("ready", () => {
    progressBar.detail = "Creating project files...";

    setTimeout(() => {
      fs.writeFile(
        projectFilePath,
        JSON.stringify(projectInfo),
        "utf-8",
        (err) => {
          progressBar.value++;
          if (err) {
            console.error("Failed to create project file");
            console.error(err);
            dialog.showErrorBox(
              "Error",
              "Failed to create MCP project in that directory"
            );
            return;
          }
          currentProjectPath = arg.path;
          currentProject = projectInfo;
          isNewProject = true;

          // Create dummy file with project name
          // (symlink would be nicer but requires admin perms)
          fs.writeFileSync(
            path.join(currentProjectPath, currentProject.name + ".json"),
            projectFilePath,
            "utf-8"
          );

          fs.mkdirSync(path.join(arg.path, "src"));
          fs.mkdirSync(path.join(arg.path, "classes"));
          fs.mkdirSync(path.join(arg.path, "output"));
          fs.mkdirSync(path.join(arg.path, "lib"));

          progressBar.detail = "Copying server .jar file...";

          let rs = fs.createReadStream(lib);
          let ws = fs.createWriteStream(
            path.join(currentProjectPath, "lib", "spigot.jar")
          );
          ws.on("close", () => {
            progressBar.value++;
            progressBar.detail = "Setting up graph file...";

            fs.writeFile(
              path.join(arg.path, "graph.json"),
              JSON.stringify({}),
              "utf-8",
              (err) => {
                progressBar.value++;
                if (err) {
                  console.error("Failed to create graph file");
                  console.error(err);
                  return;
                }

                recentProjects.unshift({
                  path: currentProjectPath,
                  name: currentProject.name,
                  editorVersion: currentProject.editorVersion,
                });
                writeRecentProjects();

                app.addRecentDocument(
                  path.join(currentProjectPath, currentProject.name + ".json")
                );
                updateJumpList();

                progressBar.value++;

                progressBar.detail = "Done!";

                if (win) {
                  win.loadFile("views/graph.html");
                  win.setTitle(
                    DEFAULT_TITLE + " [" + currentProject.name + "]"
                  );
                  progressBar.value++;
                }
              }
            );
          });
          rs.pipe(ws);
        }
      );
    }, 500);
  });
};

ipcMain.on("createNewProject", (event, arg) => {
  createNewProject(arg);
});

ipcMain.on("showOpenProject", () => {
  let p = dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "MCP Projects", extensions: ["json"] }],
  });
  if (!p || p.length === 0) {
    return;
  }
  if (Array.isArray(p)) {
    p = p[0];
    if (!p || p.length === 0) {
      return;
    }
  }
  p = path.dirname(p);

  openProject(p);
});

const openProject = (arg) => {
  if (!arg || arg.length === 0) return;
  let projectFilePath = path.join(arg, "project.json");
  if (!fs.existsSync(projectFilePath)) {
    console.error("No project file found");
    dialog.showErrorBox(
      "Not found",
      "Could not find a MCP project in that directory"
    );
    return;
  }
  fs.readFile(projectFilePath, "utf-8", (err, data) => {
    if (err) {
      console.error("Failed to read project file");
      console.error(err);
      return;
    }
    data = JSON.parse(data);

    const doOpen = () => {
      currentProjectPath = arg;
      currentProject = data;
      isNewProject = false;

      let i = recentProjects
        .map((e) => {
          return e.path;
        })
        .indexOf(currentProjectPath);
      if (i !== -1) {
        recentProjects.splice(i, 1);
      }
      recentProjects.unshift({
        path: currentProjectPath,
        name: currentProject.name,
        editorVersion: currentProject.editorVersion,
      });
      writeRecentProjects();

      app.addRecentDocument(
        path.join(currentProjectPath, currentProject.name + ".json")
      );
      updateJumpList();

      if (win) {
        win.loadFile("views/graph.html");
        win.setTitle(DEFAULT_TITLE + " [" + currentProject.name + "]");
      }
    };

    let appVersion = app.getVersion() || "x.x.x";
    let appVersionSplit = appVersion.split(".");
    let fileVersion = data.editorVersion || "y.y.y";
    let fileVersionSplit = fileVersion.split(".");
    if (appVersionSplit[1] !== fileVersionSplit[1]) {
      // compare minor version
      dialog.showMessageBox(
        {
          type: "warning",
          title: "Different Editor Version",
          message:
            "The project you're trying to open was created using a different MCP version.",
          detail:
            "It might not be compatible with the current version, so please proceed carefully and create a backup first. (Project Version: " +
            fileVersion +
            ", Editor Version: " +
            appVersion +
            ")",
          buttons: [
            "Proceed Anyway",
            "Open Project Directory to create backup",
            "Cancel",
          ],
          defaultId: 1,
        },
        (r) => {
          if (r === 0) {
            // Proceed Anyway
            doOpen();
          } else if (r === 1) {
            // Open directory
            shell.openItem(arg);
          } else {
            // cancel
          }
        }
      );
    } else {
      doOpen();
    }
  });
};

ipcMain.on("openProject", (event, arg) => {
  openProject(arg);
});

ipcMain.on("getProjectInfo", (event) => {
  let proj = currentProject || {};
  proj.isNewProject = isNewProject;
  event.sender.send("projectInfo", proj);
});

ipcMain.on("updateProjectInfo", (event, arg) => {
  if (!arg) return;
  currentProject = arg;

  if (win) {
    win.setTitle(DEFAULT_TITLE + " [" + currentProject.name + "]");
    win.webContents.send("projectInfo", currentProject);
  }

  fs.writeFile(
    path.join(currentProjectPath, "project.json"),
    JSON.stringify(currentProject),
    "utf-8",
    (err) => {
      if (err) {
        console.error("Failed to write project file");
        console.error(err);
        return;
      }
    }
  );
});

ipcMain.on("getGraphData", (event) => {
  if (!currentProject || !currentProjectPath) {
    return;
  }
  fs.readFile(
    path.join(currentProjectPath, "graph.json"),
    "utf-8",
    (err, data) => {
      if (err) {
        console.error("Failed to read graph file");
        console.error(err);
        return;
      }

      event.sender.send("graphData", JSON.parse(data));

      if (isNewProject) {
        importSnippet(
          path.join(__dirname, "assets", "snippets", "onEnableLog.json")
        );
      }
    }
  );
});

const saveGraphData = (arg, cb) => {
  if (!currentProject || !currentProjectPath) {
    return;
  }
  // backup
  copyFile(
    path.join(currentProjectPath, "graph.json"),
    path.join(currentProjectPath, "graph.json.old")
  ).then(() => {
    // write data
    fs.writeFile(
      path.join(currentProjectPath, "graph.json"),
      JSON.stringify(arg),
      "utf-8",
      (err) => {
        if (err) {
          console.error("Failed to save graph file");
          console.error(err);
          return;
        }

        saveProject(cb);
      }
    );
  });
};

const saveProject = (cb) => {
  currentProject.lastSave = Date.now();
  fs.writeFile(
    path.join(currentProjectPath, "project.json"),
    JSON.stringify(currentProject),
    "utf-8",
    (err) => {
      if (err) {
        console.error("Failed to write project file");
        console.error(err);
        return;
      }
      if (cb) cb();
    }
  );
};

ipcMain.on("saveGraphData", (event, arg) => {
  saveGraphData(arg, () => {
    event.sender.send("graphDataSaved");
  });
});

ipcMain.on("saveGraphDataAndClose", (event, arg) => {
  saveGraphData(arg, () => {
    win.loadFile("index.html");
    win.setTitle(DEFAULT_TITLE);
    currentProject = null;
    currentProjectPath = null;
    app.unsavedChanges = 0;
    app.uncompiledChanges = 0;
  });
});

const saveCodeToFile = (code) => {
  return new Promise((resolve, reject) => {
    if (!currentProject || !currentProjectPath) {
      return reject();
    }
    if (!code) return reject();

    fs.emptyDir(path.join(currentProjectPath, "src"), () => {
      fs.mkdirs(
        path.join(
          currentProjectPath,
          "src",
          currentProject.package.split(".").join("\\")
        ),
        (err) => {
          if (err) {
            console.error("Failed to save code file");
            console.error(err);
            return;
          }
          fs.writeFile(
            path.join(
              currentProjectPath,
              "src",
              currentProject.package.split(".").join("\\"),
              "GeneratedPlugin.java"
            ),
            code,
            "utf-8",
            (err) => {
              if (err) {
                console.error("Failed to save code file");
                console.error(err);
                return;
              }

              let manifest = "Generated-By: MCP " + app.getVersion() + "\n";
              fs.writeFile(
                path.join(currentProjectPath, "src", "manifest"),
                manifest,
                "utf-8",
                (err) => {
                  if (err) {
                    console.error("Failed to save manifest file");
                    console.error(err);
                    return;
                  }
                  resolve();
                }
              );
            }
          );
        }
      );
    });
  });
};

const makePluginYml = () => {
  if (!currentProject.buildNumber) currentProject.buildNumber = 0;
  let yml =
    "name: " +
    currentProject.name +
    "\ndescription: " +
    currentProject.description +
    "\nversion: " +
    currentProject.version +
    "\nmain: " +
    currentProject.package +
    ".GeneratedPlugin" +
    "\nauthor: " +
    currentProject.author +
    "\nsoftdepend: [" +
    (currentProject.softdepend || []).join(",") +
    "]" +
    "\ngenerator: MCP " +
    app.getVersion() +
    "\napi-version: 1.15\n";
  if (currentProject.commands) {
    yml += "commands:\n";
    for (let i = 0; i < currentProject.commands.length; i++) {
      yml += "  " + currentProject.commands[i].name + ":\n";
      yml +=
        "    description: " + currentProject.commands[i].description + "\n";
      yml += "    usage: " + currentProject.commands[i].usage + "\n";
    }
  }
  return yml;
};

const compile = () => {
  return new Promise((resolve, reject) => {
    javaCompiler
      .testForJavac()
      .then(() => {
        fs.emptyDir(path.join(currentProjectPath, "classes"), () => {
          javaCompiler
            .compile(currentProjectPath, currentProject)
            .then((result) => {
              let pluginYml = makePluginYml();
              fs.writeFile(
                path.join(currentProjectPath, "classes", "plugin.yml"),
                pluginYml,
                () => {
                  currentProject.lastCompile = Date.now();
                  resolve();
                }
              );
            })
            .catch(reject);
        });
      })
      .catch(() => {
        dialog.showErrorBox(
          "javac not found",
          "Could not find javac executable. Please download the Java Development Kit and make sure javac is in your Environment Variables."
        );
      });
  });
};

const pack = () => {
  return new Promise((resolve, reject) => {
    fs.emptyDir(path.join(currentProjectPath, "output"), () => {
      javaCompiler
        .package(currentProjectPath, currentProject)
        .then(() => {
          resolve();
        })
        .catch(reject);
    });
  });
};

const showCustomErrorDialog = (error, title, message) => {
  if (errWin) errWin.destroy();
  errWin = null;

  errWin = new BrowserWindow({
    parent: win,
    width: 1000,
    height: 600,
    modal: false,
    show: false,
    resizable: true,
    backgroundColor: "#373737",
  });
  errWin.setMenu(null);
  errWin.setTitle(title || "An Error occurred!");
  errWin.loadFile("views/error.html");
  errWin.theError = error;
  errWin.theMessage = message;
  errWin.show();
};

ipcMain.on("codeGenerated", (event, arg) => {
  let max = 0;
  if (arg.code) max++;
  if (arg.compile) max++;
  if (arg.pack) max++;
  let progressBar = new ProgressBar({
    indeterminate: false,
    maxValue: max,
    text: "Generating/Compiling/Packaging...",
    detail: "Waiting...",
  });

  progressBar.on("ready", () => {
    setTimeout(() => {
      generateCompilePackage(arg, progressBar)
        .then(() => {
          progressBar.detail = "Done!";
          showNotification("Done!");
          event.sender.send("generateDone");
        })
        .catch((err) => {
          progressBar.detail = "Error";
          event.sender.send("generateError", err);
          showCustomErrorDialog(err, "Compilation Error");
          progressBar.close();
        });
    }, 500);
  });
});

// async/await to preserve execution order
const generateCompilePackage = async (arg, progressBar) => {
  if (arg.code) {
    progressBar.detail = "Generating code...";
    await saveCodeToFile(arg.code);
    progressBar.value++;
  }
  if (arg.compile) {
    progressBar.detail = "Compiling...";
    await compile();
    progressBar.value++;
  }
  if (arg.pack) {
    progressBar.detail = "Packaging...";
    await pack();
    progressBar.value++;
  }
};

ipcMain.on("openOutputDir", () => {
  shell.openItem(path.join(currentProjectPath, "output"));
});

ipcMain.on("openProjectInfoEditor", () => {
  let child = new BrowserWindow({
    parent: win,
    title: DEFAULT_TITLE,
    width: 600,
    height: 800,
    modal: true,
    show: false,
    resizable: false,
    backgroundColor: "#373737",
  });
  editorWin = child;
  child.on("close", () => {
    editorWin = null;
  });
  child.loadFile("views/infoEditor.html");
  child.show();
});

ipcMain.on("openCommandEditor", (event, arg) => {
  let child = new BrowserWindow({
    parent: win,
    title: DEFAULT_TITLE,
    width: 600,
    height: 500,
    modal: true,
    show: false,
    resizable: false,
    backgroundColor: "#373737",
  });
  child.custom = {
    command: arg.command,
    index: arg.index,
  };
  commandWin = child;
  child.on("close", () => {
    commandWin = null;
  });
  child.loadFile("views/commandEditor.html");
  child.show();
});

ipcMain.on("saveCommand", (event, arg) => {
  if (editorWin) {
    if (arg.isNew) {
      editorWin.webContents.send("commandAdded", arg.command);
    } else {
      editorWin.webContents.send("commandUpdated", {
        command: arg.command,
        index: arg.index,
      });
    }
  }
});

ipcMain.on("startServer", () => {
  if (!currentProject || !currentProjectPath) {
    return;
  }
  if (logWin) logWin.destroy();
  logWin = null;
  serverStarter.kill();

  if (
    !fs.existsSync(
      path.join(currentProjectPath, "output", currentProject.name + ".jar")
    )
  ) {
    dialog.showErrorBox("Error", "Please compile your plugin first!");
    return;
  }

  if (serverStarter.isRunning()) {
    dialog.showErrorBox(
      "Error",
      "Please wait for the existing server to shut down and try again"
    );
    return;
  }

  logWin = new BrowserWindow({
    parent: win,
    width: 800,
    height: 1000,
    modal: false,
    show: false,
    resizable: true,
    backgroundColor: "#373737",
  });
  logWin.setMenu(null);
  logWin.setTitle("MCP Test Server");
  logWin.loadFile("views/log.html");
  logWin.show();
  let port = "";
  serverStarter.copy(currentProjectPath, currentProject).then(() => {
    serverStarter.start(
      currentProjectPath,
      (out) => {
        if (logWin) {
          // sometimes multiple lines are combined into one output, so split it here
          let split = out.split("\n");
          for (let i = 0; i < split.length; i++) {
            let log = split[i];

            if (log.indexOf("Starting Minecraft server on") !== -1) {
              port = log
                .substr(24 /* strip timestamp & start of string */)
                .split(":")[1];
            }
            if (
              log.indexOf("Done (") !== -1 &&
              log.indexOf("For help, type") !== -1
            ) {
              showNotification("Test Server running on port " + port);
            }

            let logData = {
              type: "out",
              content: log,
            };
            if (log.indexOf("Caused by:") === 0) {
              logData.href = "https://duckduckgo.com/" + log;
            }
            if (log.indexOf(currentProject.package) !== -1) {
              if (log.indexOf("node_") !== -1) {
                logData.hasNode = true;

                if (win) win.webContents.send("logError", log);
              }
            }

            logWin.webContents.send("log", logData);
          }
        }
      },
      (err) => {
        if (logWin) {
          logWin.webContents.send("log", {
            type: "err",
            content: err,
          });
        }
      }
    );
  });
});

ipcMain.on("sendServerCommand", (event, arg) => {
  serverStarter.sendCommand(arg);
});

ipcMain.on("stopServer", () => {
  if (logWin) logWin.destroy();
  logWin = null;
  serverStarter.kill();
});

ipcMain.on("reloadPlugin", () => {
  reloadPlugin();
});

const reloadPlugin = () => {
  if (!currentProject) return;
  serverStarter.sendCommand("mcp unload " + currentProject.name, () => {
    serverStarter
      .copy(currentProjectPath, currentProject, true, true, true)
      .then(() => {
        serverStarter.sendCommand("mcp load " + currentProject.name, () => {
          showNotification("Plugin reloaded!");
        });
      });
  });
};

ipcMain.on("highlightNode", (event, arg) => {
  if (win) {
    win.webContents.send("highlightNode", arg);
  }
});

ipcMain.on("showExportDialog", () => {
  showExportDialog();
});

const showExportDialog = () => {
  if (!currentProject || !currentProjectPath) return;
  dialog.showSaveDialog(
    win,
    {
      defaultPath: path.join(currentProjectPath, currentProject.name + ".zip"),
      filters: [
        {
          name: "ZIP File",
          extensions: ["zip"],
        },
      ],
    },
    (file) => {
      if (!file) return;
      exportProject(file);
    }
  );
};

const exportProject = (output) => {
  if (!currentProject || !currentProjectPath) return;
  let zip = new AdmZip();
  zip.addLocalFile(path.join(currentProjectPath, "project.json"));
  zip.addLocalFile(path.join(currentProjectPath, "graph.json"));
  zip.writeZip(output);
};

ipcMain.on("exportSnippet", (event, arg) => {
  dialog.showSaveDialog(
    win,
    {
      defaultPath: path.join(
        currentProjectPath,
        currentProject.name + "-snippet.json"
      ),
      filters: [
        {
          name: "MCP Snippet",
          extensions: ["json"],
        },
      ],
    },
    (file) => {
      if (!file) return;
      fs.writeFile(file, JSON.stringify(arg), (err) => {
        if (err) throw err;
      });
    }
  );
});

ipcMain.on("showImportSnippet", () => {
  dialog.showOpenDialog(
    win,
    {
      defaultPath: currentProjectPath,
      filters: [
        {
          name: "MCP Snippet",
          extensions: ["json"],
        },
      ],
    },
    (files) => {
      if (!files || files.length === 0) return;
      importSnippet(files[0]);
    }
  );
});

const importSnippet = (file) => {
  if (!file) {
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) throw err;
    if (!win) return;
    win.webContents.send("importSnippet", JSON.parse(data));
  });
};

const showNotification = (body, title) => {
  notifier.notify(
    {
      appName: "com.tobiaswadseth.mcp",
      title: title || "MCP",
      message: body || "Temporary message!",
      sound: false,
    },
    () => {}
  );
};
