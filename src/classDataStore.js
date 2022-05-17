const electron = require("electron");
const app = electron.app || electron.remote.app;
const path = require("path");
const fs = require("fs-extra");
const request = require("request");
const { methodToString } = require("adm-zip/util");

const INTERFACE_DUMMY_CONSTRUCTOR = {
  name: "....",
  isClass: false,
  isInterface: false,
  isEnum: false,
  isEnumConstant: false,
  isConstructor: true,
  isField: false,
  isMethod: false,
  isOrdinaryClass: false,
  signature: "()",
  flatSignature: "()",
  parameters: [],
  typeParameters: [],
};

function ClassDataStore() {
  this.store = {};
  this.loadClassFile = function(fileName) {
    console.log(path.join(__dirname, "../data", fileName + ".json"));
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(__dirname, "../data", fileName + ".json"),
        "utf-8",
        (err, data) => {
          if (err) {
            reject();
            return;
          }
  
          data = JSON.parse(data);
  
          for (let i = 0; i < data.classes.length; i++) {
            let clazz = Object.assign({}, data.classes[i]);
            clazz.fieldsByName = {};
            clazz.methodsBySignature = {};
            clazz.constructorsBySignature = {};
            clazz.isEvent = clazz.qualifiedName.endsWith("Event");
            clazz.isObject = !clazz.isEvent && !clazz.isEnum;
  
            if (clazz.comment) clazz.comment = clazz.comment.split(".")[0];
  
            if (clazz.isInterface) {
              let constructor = Object.assign({}, INTERFACE_DUMMY_CONSTRUCTOR);
              constructor.name = clazz.simpleName;
              clazz.constructors.push(constructor);
            }
  
            for (let j = 0; j < clazz.fields.length; j++) {
              let field = Object.assign({}, clazz.fields[j]);
              if (field.comment) field.comment = field.comment.split(".")[0];
              clazz.fieldsByName[field.name.toLowerCase()] = field;
            }
  
            for (let j = 0; j < clazz.methods.length; j++) {
              let method = Object.assign({}, clazz.methods[j]);
              method.paramsByName = {};
  
              if (method.comment) method.comment = method.comment.split(".")[0];
  
              for (let k = 0; k < method.parameters.length; k++) {
                let param = Object.assign({}, method.parameters[k]);
                method.paramsByName[param.name.toLowerCase()] = param;
              }
  
              method.fullSignature = method.name + method.signature;
              method.fullFlatSignature = method.name + method.flatSignature;
              clazz.methodsBySignature[method.fullSignature] = method;
            }
  
            for (let j = 0; j < clazz.constructors.length; j++) {
              let constructor = Object.assign({}, clazz.constructors[j]);
              constructor.paramsByName = {};
  
              if (constructor.comment)
                constructor.comment = constructor.comment.split(".")[0];
  
              for (let k = 0; k < constructor.parameters.length; k++) {
                let param = Object.assign({}, constructor.parameters[k]);
                constructor.paramsByName[param.name.toLowerCase()] = param;
              }
  
              constructor.fullSignature =
                constructor.name + constructor.signature;
              constructor.fullFlatSignature =
                constructor.name + constructor.flatSignature;
              clazz.constructorsBySignature[constructor.fullSignature] =
                constructor;
            }
  
            this.store[clazz.qualifiedName.toLowerCase()] = clazz;
          }
          resolve(this.store);
        }
      );
    });
  }
};

ClassDataStore.prototype.init = function() {
  return Promise.all([this.loadClassFile("java"), this.loadClassFile("spigot")]);
};

ClassDataStore.prototype.size = function() {
  return Object.keys(this.store).length;
};

ClassDataStore.prototype.getClassesByName = function() {
  return this.store;
};

ClassDataStore.prototype.getClass = function(className) {
  if (!className) return null;
  return this.store[className.toLowerCase()];
};

ClassDataStore.prototype.getField = function(className, fieldName) {
  if (!className || !fieldname) return null;
  let clazz = this.store[className.toLowerCase()];
  if (!clazz) return null;
  return clazz.fieldsByName[fieldName.toLowerCase()];
};

ClassDataStore.prototype.getConstructor = function(className, constructorSignature) {
  if (!className || !constructorSignature) return null;
  let clazz = this.store[className.toLowerCase()];
  if (!clazz) return null;
  return clazz.constructorsBySignature[constructorSignature];
};

ClassDataStore.prototype.getConstructorParam = function(
  className,
  constructorSignature,
  paramName
) {
  if (!className || !constructorSignature || !paramName) return null;
  let clazz = this.store[className.toLowerCase()];
  if (!clazz) return null;
  let constructor = clazz.constructorsBySignature[constructorSignature];
  if (!constructor) return null;
  return constructor.paramsByName[paramName.toLowerCase()];
};

ClassDataStore.prototype.getMethod = function(className, methodSignature) {
  if (!className || !methodSignature) return null;
  let clazz = this.store[className.toLowerCase()];
  if (!clazz) return null;
  return clazz.methodsBySignature[methodSignature];
};

ClassDataStore.prototype.getMethodParam = function(
  className,
  methodSignature,
  paramName
) {
  if (!className || !methodSignature || !paramName) return null;
  let clazz = this.store[className.toLowerCase()];
  if (!clazz) return null;
  let method = clazz.methodsBySignature[methodSignature];
  if (!method) return null;
  return method.paramsByName[paramName.toLowerCase()];
};

ClassDataStore.prototype.getMethodSignatureFromMethodAndParamTypes = function(
  methodName,
  paramTypes
) {
  return methodName + "(" + paramTypes.join(",") + ")";
};

ClassDataStore.prototype.getMethodSignatureFromData = function(methodData) {
  let params = [];
  for (let i = 0; i < methodData.parameters.length; i++) {
    params.push(
      methodData.parameters[i].type.simpleName +
        methodData.parameters[i].type.dimension
    );
  }
  return this.getMethodSignatureFromMethodAndParamTypes(
    methodData.name,
    params
  );
};

ClassDataStore.prototype.getAllImplementingClasses = function(rootClass) {
  return getImplementingClasses(this.store, rootClass, []);
};

ClassDataStore.prototype.getAllExtendingClasses = function(rootClass) {
  return getExtendingClasses(this.store, rootClass, []);
};

ClassDataStore.prototype.getAllImplementingAndExtendingClasses = function(
  rootClass
) {
  return getImplementingAndExtendingClasses(this.store, rootClass, []);
};

const getImplementingAndExtendingClasses = function(store, className, target) {
  if (target.indexOf(className) === -1) target.push(className);
  let clazz = store[className.toLowerCase()];
  if (
    !clazz ||
    ((!clazz.subInterfaces || clazz.subInterfaces.length === 0) &&
      (!clazz.subClasses || clazz.subClasses.length === 0))
  )
    return target;
  if (clazz.subInterfaces) {
    for (let i = 0; i < clazz.subInterfaces.length; i++) {
      let cl = clazz.subInterfaces[i];
      getImplementingAndExtendingClasses(store, cl, target);
    }
  }
  if (clazz.subClasses) {
    for (let i = 0; i < clazz.subClasses.length; i++) {
      let cl = clazz.subClasses[i];
      getImplementingAndExtendingClasses(store, cl, target);
    }
  }
  return target;
};

const getImplementingClasses = function(store, className, target) {
  let clazz = store[className.toLowerCase()];
  if (target.indexOf(className) === -1) target.push(className);
  if (!clazz || !clazz.subInterfaces || clazz.subInterfaces.length === 0)
    return target;
  for (let i = 0; i < clazz.subInterfaces.length; i++) {
    let cl = clazz.subInterfaces[i];
    getImplementingClasses(store, cl, target);
  }
  return target;
};

const getExtendingClasses = function(store, className, target) {
  let clazz = store[className.toLowerCase()];
  if (target.indexOf(className) === -1) target.push(className);
  if (!clazz || !clazz.subClasses || clazz.subClasses.length === 0)
    return target;
  for (let i = 0; i < clazz.subClasses.length; i++) {
    let cl = clazz.subClasses[i];
    getExtendingClasses(store, cl, target);
  }
  return target;
};

module.exports = ClassDataStore;
