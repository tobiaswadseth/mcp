const { shapeAndColorsForSlotType } = require("../util");

// Switch (if/else)

function Switch() {
  this.classType = "native";
  this.desc = "Switch code execution based on a condition";
  this.iconName = "code-branch";
  this.addInput("EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  this.addOutput("True (if)", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  this.addOutput("False (else)", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  this.addInput("Condition", "boolean", shapeAndColorsForSlotType("boolean"));
}

Switch.title = "Switch";
Switch.prototype.getMethodBody = function (input, output) {
  return "boolean val = " + input[1] + ";";
};
Switch.prototype.getExecAfter = function (exec) {
  return (
    "if(val) {\n" +
    exec[0].join("\n") +
    "//True\n" +
    "} else {\n" +
    exec[1].join("\n") +
    "//False\n" +
    "}"
  );
};
Switch.prototype.onDrawTitleBox =
  require("../fontAwesomeHelper").handleDrawTitleBox;

// For-Loop

function ForLoop() {
  this.classType = "native";
  this.desc = "A for-loop";
  this.iconName = "redo";
  this.addInput("EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  this.addInput("FirstIndex", "int", shapeAndColorsForSlotType("int"));
  this.addInput("LastIndex", "int", shapeAndColorsForSlotType("int"));

  this.addOutput("Loop", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  this.addOutput("Index", "int", shapeAndColorsForSlotType("int"));
  this.addOutput("Completed", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
}

ForLoop.title = "ForLoop";
ForLoop.prototype.getFields = function (output) {
  return ["int " + output[1]];
};
ForLoop.prototype.getMethodBody = function (input) {
  return (
    "int startIndex = " +
    input[1] +
    ";\n" +
    "int lastIndex = " +
    input[2] +
    ";\n"
  );
};
ForLoop.prototype.getExecAfter = function (exec, output) {
  return (
    "for(int i = startIndex; i < lastIndex; i++) {\n" +
    output[1] +
    " = i;\n" + // set index output
    exec[0].join("\n") +
    "\n" + // loop exec
    "}\n" +
    exec[1].join("\n")
  ); // completed exec
};
ForLoop.prototype.onDrawTitleBox =
  require("../fontAwesomeHelper").handleDrawTitleBox;

// FlipFlop

function FlipFlop() {
  this.classType = "native";
  this.desc =
    "Each time executed, toggle which router (A/B) is executed, starting with A";
  this.iconName = "toggle-on";
  this.addInput("EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));

  this.addOutput("A", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  this.addOutput("B", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  this.addOutput("isA", "boolean", shapeAndColorsForSlotType("boolean"));
}

FlipFlop.title = "FlipFlop";
FlipFlop.prototype.getFields = function (output) {
  return ["boolean flipflop_" + this.id, "boolean " + output[2]];
};
FlipFlop.prototype.getMethodBody = function (input, output) {
  return (
    "flipflop_" + this.id + " = " + output[2] + " = !flipflop_" + this.id + ";"
  );
};
FlipFlop.prototype.getExecBefore = function (exec) {
  return (
    "if(flipflop_" +
    this.id +
    ") {\n" +
    exec[0].join("\n") +
    "//A\n" +
    "} else {\n" +
    exec[1].join("\n") +
    "//B\n" +
    "}"
  );
};
FlipFlop.prototype.onDrawTitleBox =
  require("../fontAwesomeHelper").handleDrawTitleBox;

module.exports = [Switch, ForLoop, FlipFlop];
