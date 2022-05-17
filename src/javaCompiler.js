const { exec } = require("child_process");
const path = require("path");

function testForJavac() {
  return new Promise((resolve, reject) => {
    exec("javac -version", (err, stdout, stderr) => {
      if (err) {
        reject();
      } else if (
        (stdout && stdout.startsWith("javac")) ||
        (stderr && stderr.startsWith("javac"))
      ) {
        resolve();
      } else {
        reject();
      }
    });
  });
}

function compile(rootDir, projectInfo) {
  return new Promise((resolve, reject) => {
    let classpath = [];
    classpath.push(path.join(rootDir, "lib", "spigot.jar"));

    let cl =
      'javac -cp "' +
      classpath.join(";") +
      '" -d "' +
      path.join(rootDir, "classes") +
      '" "' +
      path.join(
        rootDir,
        "src",
        projectInfo.package.split(".").join("\\"),
        "GeneratedPlugin.java"
      ) +
      '"';
    exec(cl, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }

      resolve({
        out: stdout,
        err: stderr,
      });
    });
  });
}

function package(rootDir, projectInfo) {
  return new Promise((resolve, reject) => {
    let cl =
      'jar cfm "' +
      path.join(rootDir, "output", projectInfo.name + ".jar") +
      '" "' +
      path.join(rootDir, "src", "manifest") +
      '" -C "' +
      path.join(rootDir, "classes") +
      '" .';
    exec(cl, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }

      resolve({
        out: stdout,
        err: stderr,
      });
    });
  });
}

module.exports = {
  compile,
  package,
  testForJavac,
};
