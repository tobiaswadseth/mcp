const ClassDataStore = require("./classDataStore");
const { nullType } = require("./util");

const classStore = new ClassDataStore();

const fields = [];
const eventListenerMethods = [];
const objectMethods = [];
const enumMethods = [];
const generatedMethods = [];
const constructorCalls = [];
const methodCalls = [];
const nativeCalls = [];

const javaPluginMethods = [];
const onLoadMethods = [];
const onEnableMethods = [];
const onDisableMethods = [];
const onCommandMethods = [];
const onTabCompleteMethods = [];

const generateClassCode = (graph, projectInfo) => {
  return new Promise((resolve) => {
    classStore.init().then(() => {
      for (let i = 0; i < graph._nodes.length; i++) {
        if (graph._nodes[i].nodeType === "BukkitClassNode") {
          let classData = classStore.getClass(graph._nodes[i].className);
          if (graph._nodes[i].classType === "event") {
            generateCodeForEventClassNode(graph, graph._nodes[i]);
          }
          if (graph._nodes[i].classType === "object") {
            generateCodeForObjectClassNode(graph, graph._nodes[i], classData);
          }
          if (graph._nodes[i].classType === "enum") {
            generateCodeForEnumClassNode(graph._nodes[i], classData);
          }
        } else if (
          graph._nodes[i].nodeType === "BukkitMethodNode" ||
          graph._nodes[i].nodeType === "BukkitAbstractMethodNode"
        ) {
          let classData = classStore.getClass(graph._nodes[i].className);
          let methodData = classStore.getMethod(
            graph._nodes[i].className,
            graph._nodes[i].methodSignature
          );
          generateCodeForMethodNode(
            graph,
            graph._nodes[i],
            classData,
            methodData,
            graph._nodes[i].nodeType === "BukkitAbstractMethodNode"
          );
        } else if (graph._nodes[i].nodeType === "BukkitConstructorNode") {
          let classData = classStore.getClass(graph._nodes[i].className);
          let constructorData = classStore.getConstructor(
            graph._nodes[i].className,
            graph._nodes[i].constructorSignature
          );
          generateCodeForConstructorNode(
            graph,
            graph._nodes[i],
            classData,
            constructorData
          );
        } else {
          if (graph._nodes[i].classType === "native") {
            generateCodeForNativeNode(graph, graph._nodes[i]);
          }
        }
      }

      let classCode =
        "" +
        "package " +
        projectInfo.package +
        ";\n\n" +
        "public class GeneratedPlugin extends org.bukkit.plugin.java.JavaPlugin implements org.bukkit.event.Listener {\n" +
        "\n" +
        "\n/*** Start Fields ***/\n" +
        fields.join("\n") +
        "\n/*** End Fields ***/\n" +
        "\n\n" +
        "\n" +
        "@java.lang.Override\n" +
        "public void onLoad() {\n" +
        onLoadMethods.join("\n") +
        "}\n" +
        "\n" +
        "@java.lang.Override\n" +
        "public void onEnable() {\n" +
        "getServer().getPluginManager().registerEvents(this, this);\n" +
        "\n" +
        javaPluginMethods.join("\n") +
        onEnableMethods.join("\n") +
        "}\n" +
        "\n" +
        "@java.lang.Override\n" +
        "public void onDisable() {\n" +
        onDisableMethods.join("\n") +
        "}\n" +
        "\n" +
        "@java.lang.Override\n" +
        "public boolean onCommand(org.bukkit.command.CommandSender sender, org.bukkit.command.Command command, java.lang.String label, java.lang.String[] args) {\n" +
        onCommandMethods.join("\n") +
        "return true;\n" +
        "}\n" +
        "\n" +
        "\n/*** Start Event Listeners ***/\n" +
        eventListenerMethods.join("\n") +
        "\n/*** End Event Listeners ***/\n" +
        "\n" +
        "\n/*** Start Object Methods ***/\n" +
        objectMethods.join("\n") +
        "\n/*** End Object Methods ***/\n" +
        "\n" +
        "\n/*** Start Enum Methods ***/\n" +
        enumMethods.join("\n") +
        "\n/*** End Enum Methods ***/\n" +
        "\n" +
        "\n/*** Start Generated Methods ***/\n" +
        generatedMethods.join("\n") +
        "\n/*** End Generated Methods ***/\n" +
        "\n" +
        "\n/*** Start Constructor Calls ***/\n" +
        constructorCalls.join("\n") +
        "\n/*** End Constructor Calls ***/\n" +
        "\n" +
        "\n/*** Start Method Calls ***/\n" +
        methodCalls.join("\n") +
        "\n/*** End Method Calls ***/\n" +
        "\n" +
        "\n/*** Start Native Calls ***/\n" +
        nativeCalls.join("\n") +
        "\n/*** End Native Calls ***/\n" +
        "\n" +
        "}\n";

      // Reset
      fields.splice(0, fields.length);
      eventListenerMethods.splice(0, eventListenerMethods.length);
      onLoadMethods.splice(0, onLoadMethods.length);
      javaPluginMethods.splice(0, javaPluginMethods.length);
      onEnableMethods.splice(0, onEnableMethods.length);
      onDisableMethods.splice(0, onDisableMethods.length);
      onCommandMethods.splice(0, onCommandMethods.length);
      onTabCompleteMethods.splice(0, onTabCompleteMethods.length);
      generatedMethods.splice(0, generatedMethods.length);
      objectMethods.splice(0, objectMethods.length);
      enumMethods.splice(0, objectMethods.length);
      constructorCalls.splice(0, constructorCalls.length);
      methodCalls.splice(0, methodCalls.length);
      nativeCalls.splice(0, nativeCalls.length);

      resolve(classCode);
    });
  });
};

const generateCodeForEventClassNode = (graph, node) => {
  let code =
    "" +
    "@org.bukkit.event.EventHandler\n" +
    "public void on" +
    node.id +
    "(" +
    node.type +
    " event) {\n";

  fields.push("private " + node.type + " " + nodeV(node.id) + ";");
  code += nodeV(node.id) + " = event;\n";

  // temporary variable so we can append the execution AFTER assigning variables
  let execCode = "";

  if (node.outputs) {
    for (let o = 0; o < node.outputs.length; o++) {
      let output = node.outputs[o];
      if (!output) continue;
      if (!output.links) continue;
      if (output.links.length > 0) {
        for (let l = 0; l < output.links.length; l++) {
          let linkInfo = graph.links[output.links[l]];
          if (!linkInfo) continue;

          if (output.type === "@EXEC") {
            execCode += nodeExec(linkInfo.target_id) + ";\n";
          } else if (output.linkType === "this") {
            fields.push(
              "private " + node.type + " " + nodeOutput(node.id, o) + ";"
            );
            code += nodeOutput(node.id, o) + " = event;\n";
          } else if (output.linkType !== "method") {
            let methodData = classStore.getMethod(
              output.className,
              output.methodSignature
            );
            fields.push(
              "private " + output.type + nodeOutput(node.id, o) + ";"
            );
            if (output.linkType === "object") {
              code +=
                nodeOutput(node.id, o) +
                " = event." +
                methodData.name +
                "();\n";
            } else if (output.linkType === "getter") {
              code +=
                nodeOutput(node.id, o) +
                " = event." +
                methodData.name +
                "();\n";
            } else {
              code +=
                "  " +
                output.type +
                " output_" +
                o +
                "_" +
                l +
                " = event." +
                methodData.name +
                "();\n";
            }
          }
        }
      }
    }
  }

  if (node.inputs) {
    for (let i = 0; i < node.inputs.length; i++) {
      let input = node.inputs[i];
      if (!input) continue;
      if (!input.link) continue;
      let linkInfo = graph.links[input.link];
      if (!linkInfo) continue;

      if (input.linkType === "trigger" || input.linkType === "setter") {
        let m = generateSetterMethodCall(
          input.name,
          node,
          i,
          nodeV(node.id),
          input.linkType === "setter"
            ? nodeOutput(linkInfo.origin_id, linkInfo.origin_slot)
            : ""
        );
        code += "  " + m + "();\n";
      }
    }
  }

  code += execCode;
  code += "}\n";

  eventListenerMethods.push(code);
};

const generateSetterMethodCall = (
  methodName,
  targetNode,
  inputIndex,
  obj,
  param
) => {
  let code =
    "// SETTER for " +
    targetNode.title +
    "#" +
    methodName +
    "\n" +
    "private void node_" +
    targetNode.id +
    "_in_" +
    inputIndex +
    "() {\n" +
    "  " +
    obj +
    "." +
    methodName +
    "(" +
    param +
    ");\n" +
    "}\n";

  methodCalls.push(code);
  return "node_" + targetNode.id + "_in_" + inputIndex;
};

const generateCodeForObjectClassNode = (graph, node, classData) => {
  let field = "private " + node.type + nodeV(node.id) + ";";

  let code =
    "// CLASS EXECUTION for " +
    node.title +
    "\n" +
    "private void node_" +
    node.id +
    "_exec() {\n";
  let initCode = "";
  let execCode = "";
  let otherCode = "";
  let abstractMethods = 0;
  for (let o = 0; o < node.outputs.length; o++) {
    let output = node.outputs[o];
    if (!output) continue;
    if (!output.links) continue;
    if (output.links.length > 0) {
      if (output.linkType === "method" || output.linkType === "staticMethod")
        continue;

      if (output.type === "@EXEC" && output.linkType !== "abstractMethod") {
        for (let l = 0; l < output.links.length; l++) {
          let linkInfo = graph.links[output.links[l]];
          if (!linkInfo) continue;
          execCode += nodeExec(linkInfo.target_id) + ";\n";
        }
      } else {
        if (output.linkType !== "abstractMethod")
          fields.push("private " + output.type + nodeOutput(node.id, o) + ";");

        if (output.linkType === "this") {
          otherCode += nodeOutput(node.id, o) + " = " + nodeV(node.id) + ";\n";
        } else if (output.linkType === "abstractMethod") {
          abstractMethods++;
        } else {
          otherCode +=
            nodeOutput(node.id, o) +
            " = " +
            nodeV(node.id) +
            "." +
            output.methodName +
            "();\n";
        }
      }
    }
  }

  if (node.inputs) {
    for (let i = 0; i < node.inputs.length; i++) {
      let input = node.inputs[i];
      if (!input) continue;
      if (!input.link) continue;
      let linkInfo = graph.links[input.link];
      if (!linkInfo) continue;

      if (input.linkType === "trigger" || input.linkType === "setter") {
        let m = generateSetterMethodCall(
          input.name,
          node,
          i,
          nodeV(node.id),
          input.linkType === "setter"
            ? nodeOutput(linkInfo.origin_id, linkInfo.origin_slot)
            : ""
        );
        execCode += "  " + m + "();\n";
      } else if (input.linkType === "ref") {
        initCode +=
          nodeV(node.id) +
          " = " +
          nodeOutput(linkInfo.origin_id, linkInfo.origin_slot) +
          ";\n";
        hasRef = true;
      }
    }
  }

  if (classData.qualifiedName === "org.bukkit.plugin.java.JavaPlugin") {
    initCode += "  node_" + node.id + " = this;\n";
    hasRef = true;
  }

  code += initCode;
  code += otherCode;
  code += execCode;
  code += "}\n";

  objectMethods.push(code);

  if (classData.qualifiedName === "org.bukkit.plugin.java.JavaPlugin") {
    javaPluginMethods.push(nodeExec(node.id) + ";\n");
  }

  fields.push(field);
  return field;
};

const generateCodeForEnumClassNode = (node, classData) => {
  for (let o = 0; o < node.outputs.length; o++) {
    let output = node.outputs[o];
    if (!output) continue;
    if (!output.links) continue;
    if (output.links.length > 0) {
      if (output.linkType === "method" || output.linkType === "staticMethod")
        continue;

      fields.push(
        "private " +
          output.type +
          nodeOutput(node.id, o) +
          " = " +
          classData.qualifiedName +
          "." +
          output.enumName +
          ";"
      );
    }
  }
};

const generateCodeForMethodNode = (
  graph,
  node,
  classData,
  methodData,
  isAbstractMethodNode
) => {
  let code =
    "// " +
    (isAbstractMethodNode ? "ABSTRACT" : "") +
    " METHOD EXECUTION for " +
    classData.qualifiedName +
    (isAbstractMethodNode ? "{" : "#") +
    methodData.name +
    (isAbstractMethodNode ? "}" : "") +
    "\n" +
    "private void node_" +
    node.id +
    "_exec() {\n";

  let execCode = "";
  for (let o = 0; o < node.outputs.length; o++) {
    let output = node.outputs[o];
    if (!output) continue;
    if (!output.links) continue;
    if (output.links.length > 0) {
      if (output.name === "RETURN") {
        fields.push("private " + output.type + nodeOutput(node.id, o) + ";");
        code += nodeOutput(node.id, o) + " =";
        break;
      } else if (output.type === "@EXEC") {
        for (let l = 0; l < output.links.length; l++) {
          let linkInfo = graph.links[output.links[l]];
          if (!linkInfo) continue;
          execCode += nodeExec(linkInfo.target_id) + ";\n";
        }
      }
    }
  }

  let params = [];
  if (node.inputs) {
    let paramOffset = 0;
    for (let i = 0; i < node.inputs.length; i++) {
      let input = node.inputs[i];
      if (!input) continue;
      let linkInfo = input.link ? graph.links[input.link] : null;
      if (!linkInfo) {
        if (node.inputs[i].name === "REF" && !methodData.isStatic) {
          console.warn(
            "Missing method reference for " +
              node.className +
              " / " +
              node.title
          );
          return;
        }
      }
      let sourceNode = linkInfo ? graph.getNodeById(linkInfo.origin_id) : null;
      let sourceOutput = sourceNode
        ? sourceNode.outputs[linkInfo.origin_slot]
        : null;

      if (node.inputs[i].type === "@EXEC") {
        paramOffset++;
        continue;
      }
      if (node.inputs[i].name === "REF") {
        if (methodData.isStatic || sourceNode.classType === "enum") {
          code +=
            " " +
            classData.qualifiedName +
            "." +
            methodData.name.split("(")[0] +
            "(";
        } else if (!node.isAbstractMethod) {
          code +=
            nodeV(linkInfo.origin_id) +
            "." +
            methodData.name.split("(")[0] +
            "(";
        }
        paramOffset++;
        continue;
      }
      if (node.inputs[i].name === "RETURN") {
        fields.push(
          "private " + node.inputs[i].type + nodeReturn(node.id) + ";"
        );
        if (linkInfo) {
          code +=
            nodeReturn(node.id) +
            " = " +
            nodeOutput(linkInfo.origin_id, linkInfo.origin_slot) +
            ";\n";
        } else {
          code +=
            nodeReturn(node.id) +
            "=" +
            nullType(sourceOutput ? sourceOutput.type : null) +
            ";\n";
        }
        break;
      }

      if (!linkInfo || !sourceNode) {
        let param = methodData.parameters[i - paramOffset];
        params.push(nullType(param ? param.type.qualifiedName : null));
      } else {
        params.push(nodeOutput(linkInfo.origin_id, linkInfo.origin_slot));
      }
    }
  }

  if (classData.qualifiedName === "org.bukkit.plugin.java.JavaPlugin") {
    if (methodData.name === "onLoad") {
      onLoadMethods.push(nodeExec(node.id) + ";\n");
    }
    if (methodData.name === "onEnable") {
      onEnableMethods.push(nodeExec(node.id) + ";\n");
    }
    if (methodData.name === "onDisable") {
      onDisableMethods.push(nodeExec(node.id) + ";\n");
    }
    if (methodData.name === "onCommand") {
      fields.push(
        "private org.bukkit.command.CommandSender " +
          nodeOutput(node.id, 1) +
          ";"
      );
      fields.push(
        "private org.bukkit.command.Command " + nodeOutput(node.id, 2) + ";"
      );
      fields.push("private java.lang.String " + nodeOutput(node.id, 3) + ";");
      fields.push("private java.lang.String[] " + nodeOutput(node.id, 4) + ";");
      onCommandMethods.push(
        nodeOutput(node.id, 1) +
          " = sender;\n" +
          nodeOutput(node.id, 2) +
          " = command;\n" +
          nodeOutput(node.id, 3) +
          " = label;\n" +
          nodeOutput(node.id, 4) +
          " = args;\n" +
          nodeExec(node.id) +
          ";\n"
      );
    }
    if (methodData.name === "onTabComplete") {
      onTabCompleteMethods.push(nodeExec(node.id) + ";\n");
    }
  } else if (!node.isAbstractMethod) {
    code += params.join(",");
    code += ");\n";
  }

  code += execCode;

  code += "}\n";

  methodCalls.push(code);
};

const generateCodeForConstructorNode = (
  graph,
  node,
  classData,
  constructorData
) => {
  let code =
    "// CONSTRUCTOR EXECUTION for " +
    constructorData.fullSignature +
    "\n" +
    "private void node_" +
    node.id +
    "_exec() {\n";

  let execCode = "";
  for (let o = 0; o < node.outputs.length; o++) {
    let output = node.outputs[o];
    if (!output) continue;
    if (!output.links) continue;
    if (output.links.length > 0) {
      if (output.name === "THIS") {
        fields.push(
          "private " + classData.qualifiedName + nodeOutput(node.id, o) + ";"
        );
        fields.push(
          "private " + classData.qualifiedName + " " + nodeV(node.id) + ";"
        );
        code += nodeOutput(node.id, o) + " =";
        break;
      } else if (output.type === "@EXEC") {
        for (let l = 0; l < output.links.length; l++) {
          let linkInfo = graph.links[output.links[l]];
          if (!linkInfo) continue;
          execCode += nodeExec(linkInfo.target_id) + ";\n";
        }
      }
    }
  }

  code += nodeV(node.id) + " = new " + classData.qualifiedName + "(";

  let params = [];
  if (node.inputs) {
    for (let i = 0; i < node.inputs.length; i++) {
      let input = node.inputs[i];
      if (!input) continue;
      if (input.type === "@EXEC") continue;
      let linkInfo = graph.links[input.link];

      if (input.linkType === "constructorParam") {
        if (!input.link || !linkInfo) {
          params[input.paramIndex] = nullType(input.paramType || input.name);
          continue;
        }

        if (input.hasOwnProperty("paramIndex")) {
          params[input.paramIndex] = nodeOutput(
            linkInfo.origin_id,
            linkInfo.origin_slot
          );
        } else {
          params.push(nodeOutput(linkInfo.origin_id, linkInfo.origin_slot));
        }
      }
    }
  }

  code += params.join(",");

  if (classData.isAbstract) {
    code += ") {\n";

    for (let o = 0; o < node.outputs.length; o++) {
      let output = node.outputs[o];
      if (!output) continue;
      if (!output.links) continue;
      if (output.links.length > 0) {
        if (output.linkType === "abstractMethod") {
          let methodData = classStore.getMethod(
            classData.qualifiedName,
            output.methodSignature
          );
          let methodParams = [];
          if (methodData.parameters) {
            for (let p = 0; p < methodData.parameters.length; p++) {
              let pType = methodData.parameters[p].typeVariable
                ? "java.lang.Object"
                : methodData.parameters[p].type.qualifiedName;
              methodParams.push(pType + " " + methodData.parameters[p].name);
            }
          }
          code +=
            "    public " +
            methodData.returnType.qualifiedName +
            " " +
            methodData.name +
            "(" +
            methodParams.join(",") +
            ") {\n";
          let returnCode = "";
          for (let l = 0; l < output.links.length; l++) {
            let linkInfo = graph.links[output.links[l]];
            if (!linkInfo) continue;
            if (methodData.parameters) {
              for (let p = 0; p < methodData.parameters.length; p++) {
                let pType = methodData.parameters[p].typeVariable
                  ? "java.lang.Object"
                  : methodData.parameters[p].type.qualifiedName;
                fields.push(
                  "private " +
                    pType +
                    nodeOutput(linkInfo.target_id, 1 + p) +
                    ";"
                );
                code +=
                  nodeOutput(linkInfo.target_id, 1 + p) +
                  " = " +
                  methodData.parameters[p].name +
                  ";\n";
              }
            }
            code += nodeExec(linkInfo.target_id) + ";\n";

            if (methodData.returnType.qualifiedName !== "void") {
              returnCode = "return " + nodeReturn(linkInfo.target_id) + ";\n"; // can only return once
            }
          }
          code += returnCode + "\n";
          code += "  }\n";
        }
      }
    }
    code += "};\n";
  } else {
    code += ");\n";
  }
  code += execCode;
  code += "}\n";

  constructorCalls.push(code);
};

const generateCodeForNativeNode = (graph, node) => {
  let inputVars = [];
  if (node.inputs) {
    for (let i = 0; i < node.inputs.length; i++) {
      let input = node.inputs[i];
      if (!input) continue;
      let linkInfo = input.link ? graph.links[input.link] : null;

      inputVars.push(
        linkInfo ? nodeOutput(linkInfo.origin_id, linkInfo.origin_slot) : null
      );
    }
  }

  let outputVars = [];
  let outputExecs = [];
  if (node.outputs) {
    for (let i = 0; i < node.outputs.length; i++) {
      let output = node.outputs[i];
      if (!output) continue;

      outputVars.push(nodeOutput(node.id, i));

      if (output.type === "@EXEC") {
        let links = [];
        if (output.links) {
          for (let l = 0; l < output.links.length; l++) {
            links.push(
              "node_" + graph.links[output.links[l]].target_id + "_exec();"
            );
          }
        }
        outputExecs.push(links);
      }
    }
  }

  let fields1 = node.getFields ? node.getFields(outputVars) : null;
  let body = node.getMethodBody
    ? node.getMethodBody(inputVars, outputVars)
    : null;

  let code = "";

  if (fields1) {
    for (let f = 0; f < fields1.length; f++) {
      fields.push("private " + fields1[f] + ";");
    }
  }

  if (body || node.getExecBefore || node.getExecAfter) {
    code += "private void node_" + node.id + "_exec() {\n";
  }
  if (node.getExecBefore) {
    let exec = node.getExecBefore(outputExecs, outputVars);
    if (exec) code += exec + "\n";
  }
  if (body) {
    code += body + "\n";
  }
  if (node.getExecAfter) {
    let exec = node.getExecAfter(outputExecs, outputVars);
    if (exec) code += exec + "\n";
  }

  if (body || node.getExecBefore || node.getExecAfter) {
    code += "}\n";
  }

  if (code.length > 2) {
    nativeCalls.push(code);
  }
};

const nodeV = (n) => {
  return " node_" + n;
};

const nodeOutput = (n, o) => {
  return " node_" + n + "_output_" + o;
};

const nodeReturn = (n) => {
  return " node_" + n + "_return";
};

const nodeExec = (nodeId) => {
  return " node_" + nodeId + "_exec()";
};

module.exports = {
  generateClassCode,
};
