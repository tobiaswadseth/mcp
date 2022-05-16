const Colors = require("../colors");
const {
  shapeAndColorsForSlotType,
  handleDescDrawBackground,
} = require("../util");

const RelationalOperator = () => {
  this.classType = "native";
  this.operation = "?";
};

RelationalOperator.prototype.init = (booleanInputs) => {
  this.desc = "Compare two numbers";
  this.addInput("EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  this.addOutput("EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));

  if (booleanInputs) {
    this.addInput("A", "boolean,byte,char,short,int,long,float,double", {
      color_off: Colors.BOOLEAN_OFF,
      color_on: Colors.BOOLEAN_ON,
    });
    this.addInput("B", "boolean,byte,char,short,int,long,float,double", {
      color_off: Colors.BOOLEAN_OFF,
      color_on: Colors.BOOLEAN_ON,
    });
  } else {
    this.addInput("A", "byte,char,short,int,long,float,double", {
      color_off: Colors.NUMBER_OFF,
      color_on: Colors.NUMBER_ON,
    });
    this.addInput("B", "byte,char,short,int,long,float,double", {
      color_off: Colors.NUMBER_OFF,
      color_on: Colors.NUMBER_ON,
    });
  }
  this.addOutput(
    this.operation,
    "boolean",
    shapeAndColorsForSlotType("boolean")
  );
};

RelationalOperator.prototype.onDrawBackground = (ctx) => {
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

RelationalOperator.prototype.getFields = (output) => {
  return ["boolean " + output[1]];
};
RelationalOperator.prototype.getMethodBody = (input, output) => {
  return output[1] + " = " + input[1] + this.operation + input[2] + ";";
};
RelationalOperator.prototype.getExecAfter = (exec) => {
  return exec[0].join("\n");
};

const extend = (ChildClass, ParentClass) => {
  ChildClass.prototype = new ParentClass();
  ChildClass.prototype.constructor = ChildClass;
  return ChildClass;
};

/// Equal

const Equal = () => {
  this.operation = "==";
  this.init(true);
};

/// NotEqual

const NotEqual = () => {
  this.operation = "!=";
  this.init(true);
};

/// GreaterThan

const GreaterThan = () => {
  this.operation = ">";
  this.init();
};

/// GreaterEqualThan

const GreaterEqualTo = () => {
  this.operation = ">=";
  this.init();
};

/// LessThan

const LessThan = () => {
  this.operation = "<";
  this.init();
};

/// LessEqualTo

const LessEqualTo = () => {
  this.operation = "<=";
  this.init();
};

module.exports = [
  extend(Equal, RelationalOperator),
  extend(NotEqual, RelationalOperator),
  extend(GreaterThan, RelationalOperator),
  extend(GreaterEqualTo, RelationalOperator),
  extend(LessThan, RelationalOperator),
  extend(LessEqualTo, RelationalOperator),
];
