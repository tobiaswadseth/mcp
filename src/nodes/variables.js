const {
  shapeAndColorsForSlotType,
  types,
  parseTypeSwitchEnum,
  handleDescDrawBackground,
} = require("../util");

const Set = () => {
  this.classType = "native";
  this.desc = "Set the value of a variable";
  this.iconName = "sign-in-alt";
  this.addInput("EXEC", "@EXEC", shapeAndColorsForSlotType("@EXEC"));
  this.addInput("myVariable", null);
  this.addProperty("name", "myVariable", "string");
  this.addProperty("type", "string", "enum", { values: types });
};

Set.prototype.onDrawBackground = (ctx) => {
  this.inputs[1].label = this.properties.name;
  this.inputs[1].type = parseTypeSwitchEnum(this.properties.type);
  handleDescDrawBackground.call(this, ctx);
};
Set.prototype.getFields = () => {
  return [
    parseTypeSwitchEnum(this.properties.type) + " " + this.properties.name,
  ];
};
Set.prototype.getMethodBody = (input) => {
  return this.properties.name + " = " + input[1] + ";";
};
Set.prototype.onDrawTitleBox =
  require("../fontAwesomeHelper").handleDrawTitleBox;

const Get = () => {
  this.classType = "native";
  this.desc = "Get the value of a variable";
  this.iconName = "sign-out-alt";
  this.addOutput("myVariable", null);
  this.addProperty("name", "myVariable", "string");
  this.addProperty("type", "string", "enum", { values: types });
};

Get.prototype.onDrawBackground = (ctx) => {
  this.outputs[0].label = this.properties.name;
  this.outputs[0].type = parseTypeSwitchEnum(this.properties.type);
  handleDescDrawBackground.call(this, ctx);
};
Get.prototype.getMethodBody = (input, output) => {
  return output[0] + " = " + this.properties.name + ";";
};
Get.prototype.onDrawTitleBox =
  require("../fontAwesomeHelper").handleDrawTitleBox;

module.exports = [Set, Get];
