const Colors = require("../colors");
const {
  shapeAndColorsForSlotType,
  handleDescDrawBackground,
} = require("../util");

const ArithmeticOperator = () => {
  this.classType = "native";
  this.operation = "?";
};

ArithmeticOperator.prototype.init = () => {
  this.addProperty("type", "int", "enum", {
    values: ["byte", "char", "short", "int", "long", "float", "double"],
  });
  this.addInput("EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  this.addOutput("EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));

  this.addInput("A", "int", {
    color_off: Colors.NUMBER_OFF,
    color_on: Colors.NUMBER_ON,
  });
  this.addInput("B", "int", {
    color_off: Colors.NUMBER_OFF,
    color_on: Colors.NUMBER_ON,
  });
  this.addOutput("", "int", {
    color_off: Colors.NUMBER_OFF,
    color_on: Colors.NUMBER_ON,
  });
};

ArithmeticOperator.prototype.onDrawBackground = (ctx) => {
  this.outputs[1].type = this.properties.type;
  this.inputs[1].type = this.properties.type;
  this.inputs[2].type = this.properties.type;

  if (this.flags.collapsed) return;

  ctx.font = "40px Arial";
  ctx.fillStyle = "#CCC";
  ctx.textAlign = "center";
  ctx.fillText(
    this.operation,
    this.size[0] * 0.5,
    this.size[1] * 0.35 + LiteGraph.NODE_TITLE_HEIGHT
  );
  ctx.textAlign = "left";

  handleDescDrawBackground.call(this, ctx);
};

ArithmeticOperator.prototype.getFields = (output) => {
  return [this.properties.type + " " + output[1]];
};
ArithmeticOperator.prototype.getMethodBody = (input, output) => {
  return output[1] + " = " + input[1] + this.operation + input[2] + ";";
};
ArithmeticOperator.prototype.getExecAfter = (exec) => {
  return exec[0].join("\n");
};
ArithmeticOperator.prototype.onDrawTitleBox =
  require("../fontAwesomeHelper").handleDrawTitleBox;

const extend = (ChildClass, ParentClass) => {
  ChildClass.prototype = new ParentClass();
  ChildClass.prototype.constructor = ChildClass;
  return ChildClass;
};

/// Add

const Add = () => {
  this.operation = "+";
  this.iconName = "plus";
  this.desc = "Add two numbers";
  this.init();
};

/// Subtract

const Subtract = () => {
  this.operation = "-";
  this.iconName = "minus";
  this.desc = "Subtract two numbers";
  this.init();
};

/// Multiply

const Multiply = () => {
  this.operation = "*";
  this.iconName = "times";
  this.desc = "Multiply two numbers";
  this.init();
};

/// Divide

const Divide = () => {
  this.operation = "/";
  this.iconName = "divide";
  this.desc = "Divide two numbers";
  this.init();
};

/// Modulus

const Modulus = () => {
  this.operation = "%";
  this.iconName = "percentage";
  this.desc = "Calculate the modulus of two numbers";
  this.init();
};

module.exports = [
  extend(Add, ArithmeticOperator),
  extend(Subtract, ArithmeticOperator),
  extend(Multiply, ArithmeticOperator),
  extend(Divide, ArithmeticOperator),
  extend(Modulus, ArithmeticOperator),
];
