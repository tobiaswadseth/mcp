const Colors = require("./colors");
const fs = require("fs");

const types = [
  "any",
  "byte",
  "char",
  "double",
  "float",
  "int",
  "long",
  "short",
  "string",
];

const isPrimitive = (type) => {
  return (
    type === "byte" ||
    type === "short" ||
    type === "int" ||
    type === "long" ||
    type === "float" ||
    type === "double" ||
    type === "char" ||
    type === "boolean"
  );
};

const isNumber = (type) => {
  return (
    type === "byte" ||
    type === "short" ||
    type === "int" ||
    type === "long" ||
    type === "float" ||
    type === "double"
  );
};

const nullType = (type) => {
  if (type) {
    if (typeof type != "string") type = type.qualifiedName;
    if (type === "boolean") return "false";
    if (type === "char") return "''";
    if (
      type === "byte" ||
      type === "float" ||
      type === "int" ||
      type === "long" ||
      type === "short"
    )
      return "0";
  }
  return "null";
};

const parseTypeSwitchEnum = (type) => {
  if (!type || type === "any") {
    type = "java.lang.Object";
  } else if (type === "string") {
    type = "java.lang.String";
  }
  return type;
};

const getNumberSuffix = (type) => {
  if (type) {
    if (typeof type !== "string") {
      type = type.qualifiedName;
    }
    if (type === "float") {
      return "F";
    }
    if (type === "double") {
      return "D";
    }
    if (type === "long") {
      return "L";
    }
  }
  return "";
};

const copyFile = (src, out) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(src)) {
      reject();
      return;
    }
    let rs = fs.createReadStream(src);
    let ws = fs.createWriteStream(out);
    ws.on("error", () => {
      reject();
    });
    ws.on("close", () => {
      resolve();
    });
    rs.pipe(ws);
  });
};

const shapeAndColorsForSlotType = (slotType, extraInfo = {}) => {
  if (slotType === "@EXEC") {
    return Object.assign(
      {},
      {
        shape: LiteGraph.ARROW_SHAPE,
        color_on: Colors.EXEC_ON,
        color_off: Colors.EXEC_OFF,
      },
      extraInfo
    );
  }
  if (slotType === "method") {
    return Object.assign(
      {},
      {
        shape: LiteGraph.BOX_SHAPE,
        color_on: Colors.FUNCTION_ON,
        color_off: Colors.FUNCTION_OFF,
      },
      extraInfo
    );
  }
  if (slotType === "abstractMethod") {
    return Object.assign(
      {},
      {
        shape: LiteGraph.BOX_SHAPE,
        color_on: Colors.ABSTRACT_FUNCTION_ON,
        color_off: Colors.ABSTRACT_FUNCTION_OFF,
      },
      extraInfo
    );
  }
  if (slotType === "staticMethod") {
    return Object.assign(
      {},
      {
        shape: LiteGraph.BOX_SHAPE,
        color_on: Colors.STATIC_FUNCTION_ON,
        color_off: Colors.STATIC_FUNCTION_OFF,
      },
      extraInfo
    );
  }
  if (slotType === "enum") {
    return Object.assign(
      {},
      {
        color_on: Colors.ENUM_ON,
        color_off: Colors.ENUM_OFF,
      },
      extraInfo
    );
  }
  if (slotType === "REF" || slotType === "THIS" || slotType === "object") {
    return Object.assign(
      {},
      {
        shape: LiteGraph.BOX_SHAPE,
        color_on: Colors.OBJECT_ON,
        color_off: Colors.OBJECT_OFF,
      },
      extraInfo
    );
  }
  if (slotType === "boolean") {
    return Object.assign(
      {},
      {
        color_on: Colors.BOOLEAN_ON,
        color_off: Colors.BOOLEAN_OFF,
      },
      extraInfo
    );
  }
  if (isNumber(slotType)) {
    return Object.assign(
      {},
      {
        color_on: Colors.NUMBER_ON,
        color_off: Colors.NUMBER_OFF,
      },
      extraInfo
    );
  }
  if (slotType === "java.lang.String") {
    return Object.assign(
      {},
      {
        color_on: Colors.STRING_ON,
        color_off: Colors.STRING_OFF,
      },
      extraInfo
    );
  }

  return Object.assign({}, extraInfo);
};

const updateLinkColors = (slotType, node, slot) => {
  if (slotType === LiteGraph.OUTPUT) {
    let out = node.outputs[slot];
    if (out && out.links) {
      for (let i = 0; i < out.links.length; i++) {
        let color =
          LGraphCanvas.link_type_colors[out.type] ||
          LGraphCanvas.link_type_colors[out.linkType];
        if (color) {
          let link = graph.links[out.links[i]];
          if (link) {
            link.color = color;
          }
        }
      }
    }
  }
};

const scrollSpeedForLength = (length) => {
  let scrollSpeed = 0.1;
  if (length > 20) scrollSpeed = 0.2;
  if (length > 40) scrollSpeed = 0.3;
  if (length > 60) scrollSpeed = 0.4;
  return scrollSpeed;
};

const handleDescDrawBackground = (ctx) => {
  if (this.flags && this.flags.collapsed) return;
  if (!this.desc && !this.description) return;

  if (this.mouseOver) {
    ctx.fillStyle = "#AAA";
    this.descBlockHeight = wrapCanvasText(
      ctx,
      (this.desc || this.description) + " [shift-click for more]",
      0,
      this.size[1] + 14,
      this.size[0],
      14
    );
  }
};

const handleDescOnBounding = (rect) => {
  if (this.flags && this.flags.collapsed) return;
  if (!this.desc && !this.description) return;
  if (this.mouseOver) {
    rect[3] = this.size[1] + this.descBlockHeight + 40;
  }
};

const wrapCanvasText = (context, text, x, y, maxWidth, lineHeight) => {
  let words = text.split(" ");
  let line = "";

  let textHeight = 0;
  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + " ";
    let metrics = context.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
      textHeight += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);

  return textHeight;
};

module.exports = {
  copyFile,
  types,
  isPrimitive,
  isNumber,
  nullType,
  parseTypeSwitchEnum,
  getNumberSuffix,
  shapeAndColorsForSlotType,
  updateLinkColors,
  scrollSpeedForLength,
  handleDescDrawBackground,
  handleDescOnBounding,
  wrapCanvasText,
};
