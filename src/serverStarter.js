const electron = require("electron");
const app = electron.app || electron.remote.app;
const path = require("path");
const fs = require("fs-extra");
const { spawn } = require("child_process");
const { copyFile } = require("./util");

let running = false;
let instance = null;

function start(projectPath, out, err) {
  if (running || instance) return false;
  let spawned = spawn(
    "java",
    [
      "-DIReallyKnowWhatIAmDoingISwear",
      "-Dcom.mojang.eula.agree=true",
      "-jar",
      "spigot.jar",
      "nogui",
    ],
    {
      cwd: path.join(projectPath, "lib"),
    }
  );
  running = true;
  instance = spawned;
  spawned.stdout.on("data", (data) => {
    if (out) out(data.toString());
  });
  spawned.stderr.on("data", (data) => {
    if (err) err(data.toString());
  });
  spawned.on("error", (error) => {
    running = false;
    instance = null;
  });
  spawned.on("exit", (code) => {
    running = false;
    instance = null;
  });
  return true;
}

function copy(projectPath, projectInfo, skipEmpty, skipReloadHelper) {
  let name = projectInfo.name;
  return new Promise((resolve, reject) => {
    function doCopy() {
      copyFile(
        path.join(projectPath, "output", name + ".jar"),
        path.join(projectPath, "lib", "plugins", name + ".jar")
      )
        .then(() => {
          if (skipReloadHelper) {
            resolve();
          } else {
            copyFile(
              path.join(__dirname, "../assets/lib/livereload.jar"),
              path.join(projectPath, "lib", "plugins", "livereload.jar")
            ).then(resolve);
          }
        })
        .catch(reject);
    }

    let pluginsDir = path.join(projectPath, "lib", "plugins");
    if (fs.existsSync(pluginsDir)) {
      if (skipEmpty) {
        doCopy();
      } else {
        fs.emptyDir(pluginsDir, (err) => {
          if (err) return reject(err);
          doCopy();
        });
      }
    } else {
      fs.mkdirs(pluginsDir, (err) => {
        if (err) return reject(err);
        doCopy();
      });
    }
  });
}

function sendCommand(command, callback) {
  if (!running) return;
  if (!instance) return;
  if (!instance.stdin) return;
  instance.stdin.write(command + "\n", callback);
}

function kill() {
  if (instance) instance.kill();
}

module.exports = {
  start,
  copy,
  sendCommand,
  kill,
  isRunning: () => {
    return running;
  },
};
