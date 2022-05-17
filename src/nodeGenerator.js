const shell = require("electron").shell;
const {
  LiteGraph,
  LGraphCanvas,
  LGraphNode,
} = require("../node_modules/litegraph.js/build/litegraph");
const Colors = require("./colors");
const ClassDataStore = require("./classDataStore");
const {
  shapeAndColorsForSlotType,
  isPrimitive,
  updateLinkColors,
  scrollSpeedForLength,
  handleDescDrawBackground,
  handleDescOnBounding,
  isNumber,
} = require("./util");

const nodes = [
  // category, import
  ["native", require("./nodes/misc")],
  ["arithmetic", require("./nodes/arithmetic")],
  ["relational", require("./nodes/relational")],
  ["constants", require("./nodes/constants")],
  ["variables", require("./nodes/variables")],
  ["arrays", require("./nodes/array")],
  ["flow", require("./nodes/flow")],
  ["logic", require("./nodes/logic")],
];

const classStore = new ClassDataStore();

function inputOutputSorter(a, b) {
  var nameA = a.name.toUpperCase();
  var nameB = b.name.toUpperCase();

  if (nameA === "EXEC" || nameA === "REF" || nameA === "THIS") {
    return -1;
  }
  if (nameB === "EXEC" || nameB === "REF" || nameB === "THIS") {
    return 1;
  }

  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;
}

function optionalInputOutputSorter(a, b) {
  var nameA = a[0].toUpperCase();
  var nameB = b[0].toUpperCase();

  if (nameA === "EXEC" || nameA === "REF" || nameA === "THIS") {
    return -1;
  }
  if (nameB === "EXEC" || nameB === "REF" || nameB === "THIS") {
    return 1;
  }

  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;
}

function onEventAdd(node, options, e, prevMenu) {
  let entries = [];
  let existingCategories = [];
  let classesByName = classStore.getClassesByName();
  for (let c in classesByName) {
    if (!c.startsWith("org.bukkit")) continue;
    let clazz = classesByName[c];
    if (!clazz.isEvent) continue;
    let v1 = clazz.package;
    if (existingCategories.indexOf(v1) === -1) {
      entries.push({ value: v1, content: v1, has_submenu: true });
      existingCategories.push(v1);
    }
  }

  let menu = new LiteGraph.ContextMenu(entries, {
    event: e,
    callback: inner_clicked,
    parentMenu: prevMenu,
  });

  function inner_clicked(v, option, e) {
    var values = [];
    for (let c in classesByName) {
      if (!c.startsWith("org.bukkit")) continue;
      let clazz = classesByName[c];
      if (!clazz.isEvent) continue;
      let v1 = clazz.package;
      if (v.value === v1) {
        let v2 = clazz.name;
        values.push({ content: v2, value: clazz.qualifiedName });
      }
    }

    new LiteGraph.ContextMenu(values, {
      event: e,
      callback: inner_create,
      parentMenu: menu,
    });
    return false;
  }

  function inner_create(v) {
    var first_event = prevMenu.getFirstEvent();
    let nodeName = getOrCreateBukkitClassNode(v.value);
    var node = LiteGraph.createNode(nodeName);
    if (node) {
      node.pos = canvas.convertEventToCanvas(first_event);
      canvas.graph.add(node);
    }
  }
}

function onObjectAdd(node, options, e, prevMenu) {
  let entries = [];
  let existingCategories = [];
  let classesByName = classStore.getClassesByName();
  for (let c in classesByName) {
    if (!c.startsWith("org.bukkit")) continue;
    let clazz = classesByName[c];
    if (clazz.isEvent || (!clazz.isObject && !clazz.isEnum)) continue;
    let v1 = clazz.package;
    if (existingCategories.indexOf(v1) === -1) {
      entries.push({ value: v1, content: v1, has_submenu: true });
      existingCategories.push(v1);
    }
  }

  let menu = new LiteGraph.ContextMenu(entries, {
    event: e,
    callback: inner_clicked,
    parentMenu: prevMenu,
    scroll_speed: scrollSpeedForLength(entries.length),
  });

  function inner_clicked(v, option, e) {
    var values = [];
    for (let c in classesByName) {
      if (!c.startsWith("org.bukkit")) continue;
      let clazz = classesByName[c];
      if (clazz.isEvent || (!clazz.isObject && !clazz.isEnum)) continue;
      let v1 = clazz.package;
      if (v.value === v1) {
        let v2 = clazz.name;
        values.push({ content: v2, value: clazz.qualifiedName });
      }
    }

    new LiteGraph.ContextMenu(values, {
      event: e,
      callback: inner_create,
      parentMenu: menu,
      scroll_speed: scrollSpeedForLength(values.length),
    });
    return false;
  }

  function inner_create(v) {
    var first_event = prevMenu.getFirstEvent();
    let nodeName = getOrCreateBukkitClassNode(v.value);
    var node = LiteGraph.createNode(nodeName);
    if (node) {
      node.pos = canvas.convertEventToCanvas(first_event);
      canvas.graph.add(node);
    }
  }
}

function onMethodAdd(node, options, e, prevMenu) {
  let entries = [];
  let existingCategories = [];
  let classesByName = classStore.getClassesByName();
  for (let c in classesByName) {
    if (!c.startsWith("org.bukkit")) continue;
    let clazz = classesByName[c];

    let v1 = clazz.package;
    if (existingCategories.indexOf(v1) === -1) {
      entries.push({ value: v1, content: v1, has_submenu: true });
      existingCategories.push(v1);
    }
  }

  let menu = new LiteGraph.ContextMenu(entries, {
    event: e,
    callback: inner_clicked,
    parentMenu: prevMenu,
    scroll_speed: scrollSpeedForLength(entries.length),
  });
  let menu1;

  function inner_clicked(v, option, e) {
    var values = [];
    let existingCategories = [];
    for (let c in classesByName) {
      if (!c.startsWith("org.bukkit")) continue;
      let clazz = classesByName[c];

      if (v.value === clazz.package) {
        let simpleName = clazz.name;
        if (existingCategories.indexOf(simpleName) === -1) {
          values.push({
            content: simpleName,
            value: clazz.qualifiedName,
            has_submenu: true,
          });
          existingCategories.push(simpleName);
        }
      }
    }

    menu1 = new LiteGraph.ContextMenu(values, {
      event: e,
      callback: inner2_clicked,
      parentMenu: menu,
      scroll_speed: scrollSpeedForLength(values.length),
    });
    return false;
  }

  function inner2_clicked(v, option, e) {
    var values = [];
    let existingCategories = [];
    for (let c in classesByName) {
      if (!c.startsWith("org.bukkit")) continue;
      let clazz = classesByName[c];
      if (v.value === clazz.qualifiedName) {
        for (let m in clazz.methodsBySignature) {
          let method = clazz.methodsBySignature[m];
          if (existingCategories.indexOf(m) === -1) {
            values.push({
              content: method.fullFlatSignature,
              value: {
                class: clazz.qualifiedName,
                method: method.fullSignature,
              },
              has_submenu: false,
            });
            existingCategories.push(m);
          }
        }
      }
    }

    new LiteGraph.ContextMenu(values, {
      event: e,
      callback: inner_create,
      parentMenu: menu1,
      scroll_speed: scrollSpeedForLength(values.length),
    });
    return false;
  }

  function inner_create(v) {
    var first_event = prevMenu.getFirstEvent();
    let nodeName = getOrCreateBukkitMethodNode(v.value.class, v.value.method);
    var node = LiteGraph.createNode(nodeName);
    if (node) {
      node.pos = canvas.convertEventToCanvas(first_event);
      canvas.graph.add(node);
    }
  }
}

function showOptionalSlotMenu(v, opts, e, prev_menu, node) {
  if (!node) return;

  var canvas = LGraphCanvas.active_canvas;
  var ref_window = canvas.getCanvasWindow();

  var options =
    opts.type === LiteGraph.OUTPUT
      ? node.optional_outputs
      : node.optional_inputs;

  var entries = [];
  if (options)
    for (var i in options) {
      var entry = options[i];
      if (!entry) {
        entries.push(null);
        continue;
      }

      if (opts.skipDuplicates && node.findOutputSlot(entry[0]) != -1) continue;
      var label = entry[0];
      if (entry[2] && entry[2].label) label = entry[2].label;
      var data = { content: label, value: entry };
      entries.push(data);
    }

  if (!entries.length) return;

  new LiteGraph.ContextMenu(
    entries,
    {
      event: e,
      callback: inner_clicked,
      parentMenu: prev_menu,
      node: node,
      scroll_speed: scrollSpeedForLength(entries.length),
    },
    ref_window
  );

  function inner_clicked(v, e, prev) {
    if (!node) return;

    if (v.callback) v.callback.call(canvas, node, v, e, prev);

    if (!v.value) return;

    if (opts.type === LiteGraph.OUTPUT) {
      node.addOutput(v.value[0], v.value[1], v.value[2]);
    } else {
      node.addInput(v.value[0], v.value[1], v.value[2]);
    }
    node.setDirtyCanvas(true, true);
  }

  return false;
}

function init() {
  return new Promise((resolve) => {
    // Clear default node types
    LiteGraph.registered_node_types = {};
    LiteGraph.Nodes = {};

    LGraphCanvas.prototype.getMenuOptions = function () {
      return [
        {
          content: "Add Generic Node",
          has_submenu: true,
          callback: LGraphCanvas.onMenuAdd,
        },
        null,
        {
          content: "Add Bukkit Event",
          has_submenu: true,
          callback: onEventAdd,
        },
        {
          content: "Add Bukkit Object",
          has_submenu: true,
          callback: onObjectAdd,
        },
        {
          content: "Add Bukkit Method",
          has_submenu: true,
          callback: onMethodAdd,
        },
        null,
        { content: "Add Group", callback: LGraphCanvas.onGroupAdd },
      ];
    };

    LGraphCanvas.link_type_colors = Object.assign(
      LGraphCanvas.link_type_colors,
      {
        "@EXEC": Colors.EXEC_ON,
        boolean: Colors.BOOLEAN_ON,
        "java.lang.String": Colors.STRING_ON,
        byte: Colors.NUMBER_ON,
        char: Colors.NUMBER_ON,
        short: Colors.NUMBER_ON,
        int: Colors.NUMBER_ON,
        long: Colors.NUMBER_ON,
        float: Colors.NUMBER_ON,
        double: Colors.NUMBER_ON,
        method: Colors.FUNCTION_ON,
        abstractMethod: Colors.ABSTRACT_FUNCTION_ON,
        staticMethod: Colors.STATIC_FUNCTION_ON,
        object: Colors.OBJECT_ON,
        this: Colors.OBJECT_ON,
        enum: Colors.ENUM_ON,
      }
    );

    LGraphNode.prototype.onConnectionsChange = function (slotType, slot) {
      updateLinkColors(slotType, this, slot);
    };
    LGraphNode.prototype.getMenuOptions = function () {
      return [
        {
          content: "Inputs",
          has_submenu: true,
          disabled: !this.optional_inputs || this.optional_inputs.length === 0,
          callback: function (v, opts, e, prev_menu, node) {
            return showOptionalSlotMenu(
              v,
              Object.assign({}, opts, {
                skipDuplicates: true,
                type: LiteGraph.INPUT,
              }),
              e,
              prev_menu,
              node
            );
          },
        },
        {
          content: "Outputs",
          has_submenu: true,
          disabled:
            !this.optional_outputs || this.optional_outputs.length === 0,
          callback: function (v, opts, e, prev_menu, node) {
            return showOptionalSlotMenu(
              v,
              Object.assign({}, opts, {
                skipDuplicates: true,
                type: LiteGraph.OUTPUT,
              }),
              e,
              prev_menu,
              node
            );
          },
        },
        null,
        {
          content: "Properties",
          has_submenu: true,
          disabled:
            !this.properties || Object.keys(this.properties).length === 0,
          callback: LGraphCanvas.onShowMenuNodeProperties,
        },
      ];
    };
    LGraphNode.prototype.onConfigure = function () {
      this.size = this.computeSize();
    };
    LGraphNode.prototype.onInputDblClick = function (i, e) {
      handleSlotDoubleClick(this, "in", i, e);
    };
    LGraphNode.prototype.onOutputDblClick = function (i, e) {
      handleSlotDoubleClick(this, "out", i, e);
    };
    LGraphNode.prototype.onMouseDown = function (e) {
      if (e.shiftKey) {
        let className = this.className;
        if (!className) {
          return;
        }
        let url;
        if (className.startsWith("org.bukkit.")) {
          url = "https://hub.spigotmc.org/javadocs/spigot/";
        } else if (className.startsWith("java.")) {
          url = "https://docs.oracle.com/javase/8/docs/api/";
        }
        if (!url) {
          return;
        }

        url += className.split(".").join("/") + ".html";

        shell.openExternal(url);
      }
    };

    LGraphNode.prototype.onDrawBackground = handleDescDrawBackground;
    LGraphNode.prototype.onBounding = handleDescOnBounding;

    for (let c = 0; c < nodes.length; c++) {
      let e = nodes[c];
      let category = e[0];
      let nods = e[1];

      for (let n = 0; n < nods.length; n++) {
        let node = nods[n];
        LiteGraph.registerNodeType(category + "/" + node.name, node);
      }
    }

    classStore.init().then(() => {
      ensureNodeRegistration();
      resolve();
    });
  });
}

function ensureNodeRegistration() {
  let classesByName = classStore.getClassesByName();
  for (let n in classesByName) {
    let clazz = classesByName[n];
    getOrCreateBukkitClassNode(clazz.qualifiedName);
    for (let m in clazz.methodsBySignature) {
      let method = clazz.methodsBySignature[m];
      getOrCreateBukkitAbstractMethodNode(
        clazz.qualifiedName,
        method.fullSignature
      );
      getOrCreateBukkitMethodNode(clazz.qualifiedName, method.fullSignature);
    }
    for (let c in clazz.constructorsBySignature) {
      let constructor = clazz.constructorsBySignature[c];
      getOrCreateBukkitConstructorNode(
        clazz.qualifiedName,
        constructor.fullSignature
      );
    }
  }
}

function getOrCreateBukkitClassNode(className) {
  let classData = classStore.getClass(className);
  if (!classData) {
    console.warn("Class " + className + " does not exist or isn't loaded");
    return null;
  }

  let simpleClassName = classData.simpleName;
  let categoryName = classData.qualifiedName;

  if (LiteGraph.registered_node_types.hasOwnProperty(categoryName)) {
    return categoryName;
  }

  function BukkitClassNode() {
    addClassIO(this, classData);

    if (this.inputs) this.inputs.sort(inputOutputSorter);
    if (this.optional_inputs)
      this.optional_inputs.sort(optionalInputOutputSorter);
    if (this.outputs) this.outputs.sort(inputOutputSorter);
    if (this.optional_outputs)
      this.optional_outputs.sort(optionalInputOutputSorter);

    this.nodeType = "BukkitClassNode";

    this.desc = classData.comment;

    if (classData.isEvent) {
      this.classType = "event";
      this.iconName = "bullhorn";
      this.color = Colors.EVENT;
    } else if (classData.isEnum) {
      this.classType = "enum";
      this.iconName = "list-ol";
      this.color = Colors.ENUM_OFF;
    } else {
      this.classType = "object";
      this.iconName = "box";
      this.color = Colors.OBJECT;
    }

    this.className = classData.qualifiedName;
    this.isClassNode = true;
  }

  BukkitClassNode.title = simpleClassName;

  BukkitClassNode.prototype.onDrawTitleBox =
    require("./fontAwesomeHelper").handleDrawTitleBox;

  LiteGraph.registerNodeType(categoryName, BukkitClassNode);

  return categoryName;
}

function addClassIO(node, classData, isChildCall) {
  if (!isChildCall) {
    if (
      !classData.isEvent &&
      !classData.isEnum &&
      classData.qualifiedName !== "org.bukkit.plugin.java.JavaPlugin"
    ) {
      addNodeInput(node, "EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
    }
    if (
      !classData.isEnum &&
      classData.qualifiedName !== "org.bukkit.plugin.java.JavaPlugin"
    ) {
      addNodeOutput(node, "EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
    }
  }

  if (
    !isChildCall &&
    classData.isObject &&
    classData.qualifiedName !== "org.bukkit.plugin.java.JavaPlugin"
  ) {
    addNodeInput(
      node,
      "REF",
      classData.qualifiedName,
      shapeAndColorsForSlotType("REF", { linkType: "ref" })
    );
  }
  if (!isChildCall && !classData.isEnum) {
    addNodeOutput(
      node,
      "THIS",
      classData.qualifiedName,
      shapeAndColorsForSlotType("THIS", { linkType: "this" })
    );
  }

  if (classData.isEnum && classData.enumConstants.length > 0) {
    let i = addNodeOutput(
      node,
      classData.enumConstants[0],
      classData.qualifiedName,
      shapeAndColorsForSlotType("enum", {
        linkType: "enum",
        className: classData.qualifiedName,
        enumName: classData.enumConstants[0],
      })
    );
    node.addProperty("en", classData.enumConstants[0], "enum", {
      values: classData.enumConstants,
    });
    node.onPropertyChanged = function (property, value) {
      this.outputs[i].label = "[" + value + "]";
      this.outputs[i].enumName = value;
    };
  }

  for (let m in classData.methodsBySignature) {
    let method = classData.methodsBySignature[m];

    let methodSignature = method.fullSignature;

    if (method.returnType.qualifiedName === "void") {
      // Regular void or abstract Method
      addNodeOutput(
        node,
        method.fullFlatSignature,
        classData.qualifiedName + "#" + methodSignature,
        shapeAndColorsForSlotType(method.isStatic ? "staticMethod" : "method", {
          linkType: method.isStatic ? "staticMethod" : "method",
          className: classData.qualifiedName,
          methodName: method.name,
          methodSignature: method.fullSignature,
        }),
        true
      );
    } else if (method.parameters.length === 0) {
      // non-void method without parameters
      let returnData = classStore.getClass(method.returnType.qualifiedName);

      let linkType = "";
      let extraDataType = "";
      if (
        isPrimitive(method.returnType.qualifiedName) ||
        method.returnType.qualifiedName === "java.lang.String"
      ) {
        // use getter
        linkType = "getter";
        extraDataType = method.returnType.qualifiedName;
      } else if (returnData && returnData.isObject) {
        // Object return
        linkType = extraDataType = "object";
      } else if (returnData && returnData.isEnum) {
        // Enum return
        linkType = extraDataType = "enum";
      } else {
        // fallback to abstract/regular method
        linkType = extraDataType = method.isStatic ? "staticMethod" : "method";
      }

      // add it!
      addNodeOutput(
        node,
        method.name,
        method.returnType.qualifiedName + method.returnType.dimension,
        shapeAndColorsForSlotType(extraDataType, {
          linkType: linkType,
          returnType: method.returnType.qualifiedName,
          className: classData.qualifiedName,
          methodName: method.name,
          methodSignature: method.fullSignature,
        }),
        true
      );
    } else {
      // fallback to abstract/regular method
      addNodeOutput(
        node,
        method.fullFlatSignature,
        classData.qualifiedName + "#" + methodSignature,
        shapeAndColorsForSlotType(method.isStatic ? "staticMethod" : "method", {
          linkType: method.isStatic ? "staticMethod" : "method",
          className: classData.qualifiedName,
          methodName: method.name,
          methodSignature: method.fullSignature,
        }),
        true
      );
    }
  }

  // Interfaces
  if (classData.interfaces) {
    for (let i = 0; i < classData.interfaces.length; i++) {
      let interfaceData = classStore.getClass(classData.interfaces[i]);
      if (interfaceData) {
        addClassIO(node, interfaceData, true);
      } else {
        console.warn(
          "Missing class data for interface class " + classData.interfaces[i]
        );
      }
    }
  }
  // Superclass
  if (
    classData.superclass &&
    classData.superclass.length > 0 &&
    classData.superclass !== "java.lang.Object" &&
    classData.superclass !== "java.lang.Enum"
  ) {
    let superData = classStore.getClass(classData.superclass);
    if (superData) {
      addClassIO(node, superData, true);
    } else {
      console.warn("Missing class data for superclass " + classData.superclass);
    }
  }
}

function getOrCreateBukkitMethodNode(className, methodSignature) {
  let classData = classStore.getClass(className);
  if (!classData) {
    console.warn("Class " + className + " does not exist or isn't loaded");
    return null;
  }
  let simpleClassName = classData.simpleName;

  let methodData = classStore.getMethod(className, methodSignature);
  if (!methodData) {
    console.warn(
      "Missing method data for " + methodSignature + " in " + className
    );
    return null;
  }

  let categoryName = className + "#" + methodSignature;

  if (LiteGraph.registered_node_types.hasOwnProperty(categoryName)) {
    return categoryName;
  }

  function BukkitMethodNode() {
    addMethodIO(this, classData, methodData);
    this.nodeType = "BukkitMethodNode";
    this.iconName = "hashtag";
    this.className = classData.qualifiedName;
    this.methodName = methodData.name;
    this.methodSignature = methodData.fullSignature;
    this.isMethodNode = true;

    this.desc = methodData.comment;
  }

  BukkitMethodNode.title =
    simpleClassName +
    (methodData.isStatic ? "." : "#") +
    methodData.fullFlatSignature;

  BukkitMethodNode.prototype.color = methodData.isStatic
    ? Colors.STATIC_FUNCTION_OFF
    : Colors.FUNCTION;
  BukkitMethodNode.prototype.onDrawTitleBox =
    require("./fontAwesomeHelper").handleDrawTitleBox;

  LiteGraph.registerNodeType(categoryName, BukkitMethodNode);

  return categoryName;
}

function addMethodIO(node, classData, methodData) {
  let methodSignature = methodData.fullSignature;

  if (
    !(
      classData.qualifiedName === "org.bukkit.plugin.java.JavaPlugin" &&
      (methodData.name === "onEnable" ||
        methodData.name === "onDisable" ||
        methodData.name === "onCommand" ||
        methodData.name === "onTabComplete")
    )
  )
    addNodeInput(node, "EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  addNodeOutput(node, "EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));

  addNodeInput(
    node,
    "REF",
    classData.qualifiedName + "#" + methodSignature,
    shapeAndColorsForSlotType(methodData.isStatic ? "staticMethod" : "method")
  );
  for (let p = 0; p < methodData.parameters.length; p++) {
    let param = methodData.parameters[p];
    addNodeInput(
      node,
      param.name,
      param.type.qualifiedName + param.type.dimension,
      shapeAndColorsForSlotType(param.type.qualifiedName, {
        paramName: param.name,
        paramType: param.type.qualifiedName,
        paramIndex: p,
      })
    );
  }

  if (methodData.returnType.qualifiedName !== "void") {
    addNodeOutput(
      node,
      "RETURN",
      methodData.returnType.qualifiedName + methodData.returnType.dimension,
      shapeAndColorsForSlotType(methodData.returnType.qualifiedName, {
        returnType: methodData.returnType.qualifiedName,
      })
    );
  }
}

function getOrCreateBukkitAbstractMethodNode(className, methodSignature) {
  let classData = classStore.getClass(className);
  if (!classData) {
    console.warn("Class " + className + " does not exist or isn't loaded");
    return null;
  }
  let simpleClassName = classData.simpleName;

  let methodData = classStore.getMethod(className, methodSignature);
  if (!methodData) {
    console.warn(
      "Missing method data for " + methodSignature + " in " + className
    );
    return null;
  }

  let categoryName = className + "{" + methodSignature + "}";

  if (LiteGraph.registered_node_types.hasOwnProperty(categoryName)) {
    return categoryName;
  }

  function BukkitAbstractMethodNode() {
    addAbstractMethodIO(this, classData, methodData);
    this.nodeType = "BukkitAbstractMethodNode";
    this.iconName = "sitemap";
    this.className = classData.qualifiedName;
    this.methodName = methodData.name;
    this.methodSignature = methodData.fullSignature;
    this.isAbstractMethod = true;
    this.isAbstractMethodNode = true;

    this.desc = methodData.comment;
  }

  BukkitAbstractMethodNode.title =
    simpleClassName + "{" + methodData.fullFlatSignature + "}";

  BukkitAbstractMethodNode.prototype.color = Colors.ABSTRACT_FUNCTION_OFF;
  BukkitAbstractMethodNode.prototype.onDrawTitleBox =
    require("./fontAwesomeHelper").handleDrawTitleBox;

  LiteGraph.registerNodeType(categoryName, BukkitAbstractMethodNode);

  return categoryName;
}

function addAbstractMethodIO(node, classData, methodData) {
  let methodSignature = methodData.fullSignature;

  addNodeOutput(node, "EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));

  addNodeInput(
    node,
    "REF",
    classData.qualifiedName + "#" + methodSignature,
    shapeAndColorsForSlotType("abstractMethod")
  );
  for (let p = 0; p < methodData.parameters.length; p++) {
    let param = methodData.parameters[p];
    let paramType = methodData.parameters[p].type.typeVariable
      ? "java.lang.Object"
      : param.type.qualifiedName;

    addNodeOutput(
      node,
      param.name,
      paramType + param.type.dimension,
      shapeAndColorsForSlotType(paramType, {
        paramName: param.name,
        paramType: param.type.qualifiedName,
        paramIndex: p,
      })
    );
  }

  if (methodData.returnType.qualifiedName !== "void") {
    addNodeInput(
      node,
      "RETURN",
      methodData.returnType.qualifiedName + methodData.returnType.dimension,
      shapeAndColorsForSlotType(methodData.returnType.qualifiedName, {
        returnType: methodData.returnType.qualifiedName,
      })
    );
  }
}

function getOrCreateBukkitConstructorNode(className, constructorSignature) {
  let classData = classStore.getClass(className);
  if (!classData) {
    console.warn("Class " + className + " does not exist or isn't loaded");
    return null;
  }
  let constructorData = classStore.getConstructor(
    className,
    constructorSignature
  );
  if (!constructorData) {
    console.warn(
      "Missing constructor data for " +
        constructorSignature +
        " in " +
        className
    );
    return null;
  }

  let categoryName = className + "#" + constructorSignature;

  if (LiteGraph.registered_node_types.hasOwnProperty(categoryName)) {
    return categoryName;
  }

  function BukkitConstructorNode() {
    addConstructorIO(this, classData, constructorData);
    this.nodeType = "BukkitConstructorNode";
    this.iconName = "plus-square";
    this.className = classData.qualifiedName;
    this.constructorName = constructorData.name;
    this.constructorSignature = constructorData.fullSignature;
    this.isConstructorNode = true;

    this.desc = constructorData.comment;
  }

  BukkitConstructorNode.title = constructorData.fullFlatSignature;

  BukkitConstructorNode.prototype.color = Colors.CONSTRUCTOR;
  BukkitConstructorNode.prototype.onDrawTitleBox =
    require("./fontAwesomeHelper").handleDrawTitleBox;

  LiteGraph.registerNodeType(categoryName, BukkitConstructorNode);

  return categoryName;
}

function addConstructorIO(node, classData, constructorData) {
  addNodeInput(node, "EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  addNodeOutput(node, "EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));

  addNodeOutput(
    node,
    "THIS",
    classData.qualifiedName,
    shapeAndColorsForSlotType("THIS", { linkType: "this" })
  );

  if (!classData.isInterface) {
    for (let i = 0; i < constructorData.parameters.length; i++) {
      let param = constructorData.parameters[i];
      addNodeInput(
        node,
        param.name,
        param.type.qualifiedName,
        shapeAndColorsForSlotType(param.type.qualifiedName, {
          linkType: "constructorParam",
          constructorName: constructor.name,
          paramType: param.type.qualifiedName,
          paramName: param.name,
          paramIndex: i,
        })
      );
    }
  }

  for (let m in classData.methodsBySignature) {
    let method = classData.methodsBySignature[m];

    let methodSignature = method.fullSignature;

    let isLambda = checkLambdaOrAbstractMethod(classData, method);

    if (!method.isStatic) {
      addNodeOutput(
        node,
        method.fullFlatSignature,
        classData.qualifiedName + "#" + methodSignature,
        shapeAndColorsForSlotType("abstractMethod", {
          linkType: "abstractMethod",
          className: classData.qualifiedName,
          methodName: method.name,
          methodSignature: method.fullSignature,
        }),
        !isLambda
      );
    }
  }
}

function checkLambdaOrAbstractMethod(classData, methodData) {
  return (
    ((classData.methods.length === 1 ||
      countNonDefaultMethods(classData) === 1) &&
      classData.isInterface) ||
    methodData.isAbstract
  );
}

function countNonDefaultMethods(classData) {
  let c = 0;
  for (let m = 0; m < classData.methods.length; m++) {
    if (!classData.methods[m].isDefault) c++;
  }
  return c;
}

function addNodeInput(node, name, type, options, optional) {
  if (!node.optional_inputs) node.optional_inputs = [];
  if (!node.inputs) node.inputs = [];
  if (optional) {
    for (let s = 0; s < node.optional_inputs.length; s++) {
      if (node.optional_inputs[s][0] === name) {
        return;
      }
    }
  } else {
    for (let s = 0; s < node.inputs.length; s++) {
      if (node.inputs[s].name === name) {
        return;
      }
    }
  }
  if (!options) options = {};
  if (!options.locked) options.locked = !optional;
  options.nameLocked = true;

  if (type) {
    let implementingAndExtending =
      classStore.getAllImplementingAndExtendingClasses(type);
    if (implementingAndExtending.length > 0) {
      type = implementingAndExtending.join(",");
    }
  }

  if (optional) {
    node.optional_inputs.push([name, type, options]);
  } else {
    node.addInput(name, type, options);
  }
  return node.inputs.length - 1;
}

function addNodeOutput(node, name, type, options, optional) {
  if (!node.optional_outputs) node.optional_outputs = [];
  if (!node.outputs) node.outputs = [];
  if (optional) {
    for (let s = 0; s < node.optional_outputs.length; s++) {
      if (node.optional_outputs[s][0] === name) {
        return;
      }
    }
  } else {
    for (let s = 0; s < node.outputs.length; s++) {
      if (node.outputs[s].name === name) {
        return;
      }
    }
  }
  if (!options) options = {};
  if (!options.locked) options.locked = !optional;
  options.nameLocked = true;
  if (optional) {
    node.optional_outputs.push([name, type, options]);
  } else {
    node.addOutput(name, type, options);
  }
  return node.outputs.length - 1;
}

function handleSlotDoubleClick(node, type, i, e) {
  let slot = type === "in" ? node.getInputInfo(i) : node.getOutputInfo(i);

  let nodeName;
  let offsetX = 0;
  let offsetY = 0;
  if (type === "out") {
    offsetX = 40;
    offsetY = -10;
    if (slot.name === "RETURN" || slot.hasOwnProperty("returnType")) {
      nodeName = getOrCreateBukkitClassNode(slot.returnType);
    } else if (slot.type.indexOf("#") !== -1) {
      if (
        node.isConstructorNode ||
        (slot.className === "org.bukkit.plugin.java.JavaPlugin" &&
          (slot.methodName === "onLoad" ||
            slot.methodName === "onEnable" ||
            slot.methodName === "onDisable" ||
            slot.methodName === "onCommand" ||
            slot.methodName === "onTabComplete"))
      ) {
        // abstract method
        nodeName = getOrCreateBukkitAbstractMethodNode(
          slot.className,
          slot.methodSignature
        );
      } else {
        // regular method
        nodeName = getOrCreateBukkitMethodNode(
          slot.className,
          slot.methodSignature
        );
      }
    } else {
      nodeName = getOrCreateBukkitClassNode(slot.className || slot.type);
    }
  } else if (type === "in") {
    offsetX = -(40 + node.size[0]);
    offsetY = 10;
    if (slot.linkType === "ref" && slot.hasOwnProperty("type")) {
      let nameSplit = node.className.split(".");
      let simpleName = nameSplit[nameSplit.length - 1];
      nodeName = getOrCreateBukkitConstructorNode(
        node.className,
        simpleName + "()"
      );
    } else if (slot.type === "boolean") {
      nodeName = "constants/BooleanConstant";
    } else if (slot.type === "string" || slot.type === "java.lang.String") {
      nodeName = "constants/StringConstant";
    } else if (isNumber(slot.type)) {
      nodeName = "constants/NumberConstant";
    }
  }
  if (nodeName) {
    var n = LiteGraph.createNode(nodeName);
    n.pos = [e.canvasX + offsetX, e.canvasY + offsetY];
    canvas.graph.add(n);

    if (type === "out" && n.inputs) {
      if (n.inputs[0].name === "REF") {
        // special case for abstract methods
        node.connect(i, n, 0); // 0 = REF
      } else {
        // default case
        node.connect(0, n, 0); // 0 = EXEC
        node.connect(i, n, 1); // 1 = REF
      }
    }
    if (type === "in" && n.outputs) {
      if (nodeName === "constants/NumberConstant") {
        n.properties["type"] = slot.type;
      }
      setTimeout(() => {
        if (nodeName.startsWith("constants/")) {
          // constants don't have EXEC/THIS
          n.connect(0, node, i);
        } else {
          n.connect(0, node, 0); // 0 = EXEC
          n.connect(1, node, i); // 1 = THIS
        }
      }, 10); // No idea why, but this seems to need a timeout to connect stuff properly
    }
  }
}

module.exports = {
  init,
  getOrCreateBukkitClassNode,
  getOrCreateBukkitMethodNode,
};
