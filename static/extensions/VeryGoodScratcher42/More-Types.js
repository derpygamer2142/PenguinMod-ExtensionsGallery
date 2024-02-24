(function(Scratch) {
  'use strict';
  // This is built for PM
  // NOTE: add structuredClone() block.
  if (!Scratch.extensions.unsandboxed) {
    throw new Error('This Hello World example must run unsandboxed');
  }
    // i stole all of this code from here: https://github.com/BlueDome77/Turbowarp-Extension-List/blob/main/Extensions/Inline%20Blocks.js
    const PATCHES_ID = "__patches_" + "vgscompiledvalues";
	const patch = (obj, functions) => {
		if (obj[PATCHES_ID]) return;
		obj[PATCHES_ID] = {};
		for (const name in functions) {
			const original = obj[name];
			obj[PATCHES_ID][name] = obj[name];
			if (original) {
				obj[name] = function(...args) {
					const callOriginal = (...args) => original.call(this, ...args);
					return functions[name].call(this, callOriginal, ...args);
				};
			} else {
				obj[name] = function (...args) {
					return functions[name].call(this, () => {}, ...args);
				}
			}
		}
	}
	const unpatch = (obj) => {
		if (!obj[PATCHES_ID]) return;
		for (const name in obj[PATCHES_ID]) {
			obj[name] = obj[PATCHES_ID][name];
		}
		obj[PATCHES_ID] = null;
	}
	
	// Fix report bubble
	patch(Scratch.vm.runtime.constructor.prototype, {
		visualReport(original, blockId, value) {
			if (Scratch.vm.editingTarget) {
				const block = vm.editingTarget.blocks.getBlock(blockId);
				if (block?.opcode === ("vgscompiledvalues" + "_function") && !block.topLevel) return;
			}
			original(blockId, value);
		}
	});

  class HelloWorld {
    constructor(runtime) {
      let jsValues = this
      jsValues.runtime = runtime;
      jsValues.throwErr = (msg) => {
        throw msg;
      }
      const stores = new Map();
      jsValues.getStore = function(thread, str) {
        if (!stores.get(thread)) {
          stores.set(thread, {[str]: {}});
        }
        return stores.get(thread)[str];
      }
      jsValues.retireStore= function(thread, str) {
        const store = jsValues.getStore(thread, str);
        const val = store[str];
        delete store[str]; 
        return val;
      }
      jsValues.getVar = function(id, name, type = "") {
        const targets = Scratch.vm.runtime.targets;
        for (const name in targets) {
          const target = targets[name];
          if (!target.isOriginal) continue;
          if (target.variables.hasOwnProperty(id)) {
            return target.variables[id].value.toString();
          }
          for (const varId in target.variables) {
            if (target.variables.hasOwnProperty(varId)) {
              const variable = target.variables[varId];
              if (variable.name === name && variable.type === type) {
                return variable.value.toString();
              }
            }
          }
        }
      }
      jsValues.typeof = function TYPEOF(value) {
        let isPrimitive = Object(value) !== value;
        if (isPrimitive) {
          let type = Object.prototype.toString.call(value).slice(8, -1).toLowerCase()
          return type;
        }
        if (value === jsValues.Nothing) {
          return "nothing"; // its basically just undefined.
        }
        if (value instanceof jsValues.Object) {
          return "Object";
        }
        if (value instanceof jsValues.Array) {
          return "Array";
        }
        if (value instanceof jsValues.Set) {
          return "Set"
        }
        if (value instanceof jsValues.Map) {
          return "Map"
        }
        if (value instanceof jsValues.RegExp) {
          return "RegularExpression"
        }
        return "unknown"
      }
      jsValues.clone = function CLONE(value) {
        if (jsValues.typeof(value) === "Object") {
          return new (jsValues.Object)(structuredClone(value.__values))
        } else if (jsValues.typeof(value) === "Array") {
          return new (jsValues.Array)(structuredClone(value.__values))
        } else if (jsValues.typeof(value) === "Set") {
          return new (jsValues.Set)(structuredClone(value.__values))
        } else if (jsValues.typeof(value) === "Map") {
          return new (jsValues.Map)(structuredClone(value.__values))
        } else if (jsValues.typeof(value) === "RegularExpression") {
          return new (jsValues.RegExp)(structuredClone(value.__values))
        } else if (jsValues.typeof(value) === "Function") {
          throw "Cannot clone a function."
        } 
        throw `Attempted to clone value of type ${jsValues.typeof(value)}`
      }
      jsValues.Object = class PlainObject {
        constructor(obj) {
          this.__values = obj || {}
        }
        get(key) {
          if (typeof key !== "string" && typeof key !== "symbol") {
            throw "Attempted to index <Object> with a non-string and non-symbol key. "
          }
          let exists = Object.hasOwn(this.__values, key);
          if (!exists) return jsValues.Nothing;
          let value = this.__values[key];
          if (jsValues.typeof(value) === "unknown") {
            return jsValues.Nothing
          }
          if (value === undefined) {
            return jsValues.Nothing
          }
          return value;
        }
        set(key, value) {
          if (typeof key !== "string" && typeof key !== "symbol") {
            throw "Attempted to set property of <Object> with a non-string and non-symbol key. "
          }
          if (jsValues.typeof(value) === "unknown") {
            throw `Attempted to set property of <Object> with unknown value: ${value}`
          }
          return this.__values[key] = value
        }
        delete(key) {
          return (delete this.__values[key])
        }
        get toString() {
          return () => "<Object>"
        }
        set toString(e) {
          throw "Cannot overwrite the toString method of an object."
        }
        get size() {
          return Object.values(this.__values).length;
        }
        has(key) {
          return this.get(key) !== jsValues.Nothing
        }
        toJSON() {
          return "Objects do not save."
        }
      }
      jsValues.Object.prototype.type = "PlainObject";
      jsValues.Array = class Array{
        constructor(arr) {
          this.__values = arr || [];
        }
        get(num) {
          let key = Math.abs(Math.floor(Number(num))) - 1;
          if (num === "length") {
            return this.__values.length
          }
          if (typeof num !== "number" && typeof num !== "boolean" && (typeof num !== "string" || Number.isNaN(key))) {
            throw "Attempted to index <Array> with a key that cannot be parsed as a number and is not length."
          }
          let value = this.__values[key];
          if (value === undefined) {
            return jsValues.Nothing;
          }
          return value;
        }
        set(num, value) {
          let key = Math.abs(Math.floor(Number(num))) - 1;
          if (num === "length") {
            return this.setLength(key)
          }
          if (typeof num !== "number" && typeof num !== "boolean" && (typeof num !== "string" || Number.isNaN(key))) {
            throw "Attempted to set property of <Array> with a key that cannot be parsed as a number and is not length."
          }
          if (jsValues.typeof(value) === "unknown") {
            throw `Attempted to set property of <Array> with unknown value: ${value}`
          }
          return this.__values[key] = value;
        }
        delete(num) {
          return (delete this.__values[num])
        }
        add(value) {
          return this.__values.push(value);
        }
        has(num) {
          return this.get(num) !== jsValues.Nothing
        }
        setLength(num) {
          let len = this.__values.length
          if (num === len) return num;
          if (num < len) return this.__values.length = num;
          // It must be larger
          for (let i = len; i < num; i++) {
            this.__values.push(jsValues.Nothing);
          }
          return num;
        }
        get size() {
          return this.__values.length;
        }
        get toString() {
          return () => "<Array>"
        }
        set toString(e) {
          throw "Cannot overwrite the toString method of an object."
        }
        toJSON() {
          return "Arrays do not save."
        }
      };
      jsValues.Array.prototype.type = "Array";
      jsValues.Set = class Set {
        constructor(obj) {
          this.__values = obj || new (globalThis.Set)()
        }
        add(value) {
          return this.__values.add(value);
        }
        has(value) {
          return this.__values.has(value);
        }
        clear() {
          return this.__values.clear();
        }
        delete(value) {
          return this.__values.delete(value);
        }
        forEach(func) {
          return this.__values.forEach(func, this.__values);
        }
        toArray() {
          return Array.from(this.__values);
        }
        get size() {
          return this.__values.size;
        }
        get toString() {
          return () => "<Set>"
        }
        set toString(e) {
          throw "Cannot overwrite the toString method of an object."
        }
        toJSON() {
          return "Sets do not save."
        }
      }
      jsValues.Set.prototype.type = "Set";
      jsValues.Map = class Map {
        constructor(obj) {
          this.__values = obj || new (globalThis.Map)()
        }
        set(key, value) {
          return this.__values.set(key, value);
        }
        get(key) {
          return this.__values.get(key);
        }
        has(key) {
          return this.__values.has(key);
        }
        toArray() {
          return Array.from(this.__values);
        }
        delete(key) {
          return this.__values.delete(key)
        }
        get size() {
          return this.__values.size;
        }
        get toString() {
          return () => "<Map>"
        }
        set toString(e) {
          throw "Cannot overwrite the toString method of an object."
        }
        toJSON() {
          return "Maps do not save."
        }
      }
      jsValues.Map.prototype.type = "Map";
      
      jsValues.RegExp = class RegularExpression {
        constructor(obj) {
          this.__values = obj || new RegExp();
        }
        get toString() {
          return () => "<RegularExpression>"
        }
        set toString(e) {
          throw "Cannot overwrite the toString method of an object."
        }
        toJSON() {
          return "Regular Expressions do not save. "
        }
      }
      jsValues.RegExp.prototype.type = "RegularExpression";
      
      jsValues.forEach = (value, func) => {
        if (jsValues.typeof(value) === "Map") {
          return value.__values.forEach(func);
        } else if (jsValues.typeof(value) === "Set") {
          return (new Map(Object.entries(Array.from(value.__values)))).forEach(func);
        } else if ((jsValues.typeof(value) === "Object" || jsValues.typeof(value) === "Array" || jsValues.typeof(value) === "string")) {
          // String is a special case here, that we will allow
          return (new Map(Object.entries(value.__values || value))).forEach(func);
        } else {
          // Something is wrong
          throw "Attempted to iterate over something that is not iterable. "
        }
      }
      jsValues.toIterable = (value) => {
        // since forEach does not allow continue, i have to use toIterable.
        if (jsValues.typeof(value) === "Map" || jsValues.typeof(value) === "Set" || jsValues.typeof(value) === "Array") {
          return value.__values.entries(); // set.prototype.entries is a joke
        } else if (jsValues.typeof(value) === "Object") {
          return Object.entries(value.__values);
        } else if (jsValues.typeof(value) === "string") {
          return Array.from(value).entries()
        }
        throw "Attempted to create an iterable for something that is not iterable."
      }
      
      jsValues.NothingClass = class Nothing extends Object.assign(function(){}, {prototype: null}) {
        get toString() {
          return () => "<Nothing>"
        }
        set toString(e) {
          throw "uhhhh how did you do this?."
        }
        toJSON() {
          return "Nothing does not save."
        }
      }
      jsValues.NothingClass.prototype.type = "Nothing";
      jsValues.Nothing = new (jsValues.NothingClass);
      
      jsValues.pcall = (func, target) => {
        try {
          return func(target)
        } catch(e) {
          if ((""+e.message).includes("Class constructor")) {
            throw ""
          }
          return e
        }
      }
      
      jsValues.pconstruct = (constructor) => {
        try {
          return new constructor()
        } catch(e) {
          return e
        }
      }
      Scratch.vm.runtime.registerCompiledExtensionBlocks("vgscompiledvalues", this.getCompileInfo());
    }
    getInfo() {
      return {
        id: 'vgscompiledvalues',
        name: 'Advanced Compiled Values',
        blocks: [
          this.makeLabel("If you hover over blocks,"),
          this.makeLabel("there will be a tooltip."),
          "---",
          this.makeLabel("Core"),
          {
            opcode: 'log',
            func: "noComp",
            blockType: Scratch.BlockType.COMMAND,
            text: 'print [TXT] to console',
            tooltip: "Allows you to use the \"say block\" but say an object into the console. Use Ctrl + Shift + I to open the console.",
            arguments: {
              TXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Hello, World!"
              }
            }
          },
          {
            opcode: "throw",
            blockType: Scratch.BlockType.COMMAND,
            text: "throw an error.",
            hideFromPalette: true // yeah this isnt supposed to be used.
          },
          {
            opcode: "outputCode",
            func: "noComp",
            blockType: Scratch.BlockType.COMMAND,
            text: "outputs compiled code into the console. ",
            hideFromPalette: true // this one too
          },
          {
            opcode: "setVar",
            func: "noComp",
            blockType: Scratch.BlockType.COMMAND,
            text: "set [VARIABLE] to [VALUE] (works with these values)",
            arguments: {
              VARIABLE: {
                type: Scratch.ArgumentType.VARIABLE,
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0"
              }
            }
          },
          {
            opcode: "getVar",
            func: "noComp",
            blockType: Scratch.BlockType.REPORTER,
            outputShape: 3,
            blockShape: Scratch.BlockShape.SQUARE,
            text: "variable [VARIABLE]",
            arguments: {
              VARIABLE: {
                type: Scratch.ArgumentType.VARIABLE
              }
            }
          },
          {
            opcode: "newObject",
            func: "noComp",
            output: ["Object", "Array", "Map", "Set"],
            blockShape: Scratch.BlockShape.SQUARE,
            blockType: Scratch.BlockType.REPORTER,
            text: "new [CLASS]",
            tooltip: "Creates a JavaScript object with type Object, Array, Map, or Set",
            arguments: {
              CLASS: {
                type: Scratch.ArgumentType.STRING,
                tooltip: "The type of the JavaScript object to create. ",
                menu: "objectClasses"
              }
            }
          },
          "---",
          this.makeLabel("Objects, Arrays, Sets, and Maps"),
          {
            opcode: "getIndex",
            func: "noComp",
            blockShape: Scratch.BlockShape.SQUARE,
            blockType: Scratch.BlockType.REPORTER,
            text: "get key [KEY] of [OBJECT]",
            tooltip: "For objects, key has to be a string or symbol\nFor arrays, key has to be a number\nFor maps, key can be anything",
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "foo"
              },
              OBJECT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Insert Object / Array / Map Here"
              }
            }
          },
          {
            opcode: "setIndex",
            func: "noComp",
            blockType: Scratch.BlockType.COMMAND,
            text: "set key [KEY] of [OBJECT] to [VALUE]",
            tooltip: "Read the tooltip of the above block first.\nThis block is like the above block, but sets a value into the key.",
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "foo"
              },
              OBJECT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Insert Object / Array / Map Here"
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "bar",
              }
            }
          },
          {
            opcode: "deleteIndex",
            func: "noComp",
            blockType: Scratch.BlockType.COMMAND,
            text: "remove key [KEY] of [OBJECT]",
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "foo"
              },
              OBJECT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Insert Object / Array / Set / Map Here"
              }
            }
          },
          // Add set stuff here
          {
            opcode: "addItem",
            func: "noComp",
            blockType: Scratch.BlockType.COMMAND,
            text: "add [VALUE] to the end of [OBJECT]",
            tooltip: "self-explanatory",
            arguments: {
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "foo"
              },
              OBJECT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Insert  Array / Set Here"
              }
            }
          },
          "---",
          {
            opcode: "isSame",
            func: "noComp",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "is [X] and [Y] EXACTLY the same?",
            tooltip: "Accepts all values, unlike the regular scratch =, and can also find the difference between 0 and -0.",
            arguments: {
              X: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "0"
              },
              Y: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "-0"
              }
            }
          },
          {
            opcode: "keyExists",
            func: "noComp",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[KEY] in [OBJECT]?",
            tooltip: "Checks if the key exists in the object / array / map\nFor sets, it checks if the value is in the set.",
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "foo"
              },
              OBJECT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Insert Object / Array / Set / Map Here"
              }
            }
          },
          {
            opcode: "sizeof",
            func: "noComp",
            blockType: Scratch.BlockType.REPORTER,
            text: "sizeof [OBJECT]",
            tooltip: "Gets the number of values in an object.",
            arguments: {
              OBJECT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Insert Object / Array / Set / Map Here"
              }
            }
          },
          "---",
          {
            opcode: "iterateObject",
            func: "noComp",
            blockType: Scratch.BlockType.LOOP,
            text: ["for key [KEY] value [VALUE] in [OBJECT]"],
            branchCount: 1,
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.VARIABLE
              },
              VALUE: {
                type: Scratch.ArgumentType.VARIABLE
              },
              OBJECT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Insert Object / Array/ Set / Map Here" // you can use string too
              }
            }
          },
          "---",
          this.makeLabel("More Values"),
          {
            opcode: "createSymbol",
            func: "noComp",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: Scratch.BlockShape.SQUARE,
            text: "create a symbol",
          },
          {
            opcode: "nothingValue",
            func: "noComp",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: Scratch.BlockShape.SQUARE,
            text: "nothing"
          }
          // Planning on adding ==, === and ==== (basically just Object.is) for objects
          /* this is just way too buggy, plus, yield doesnt work here. 
          this.makeLabel("Anonymous Functions"),
          {
            opcode: "anonymousFunction",
            func: "noComp",
            output: ["Function"],
            blockShape: Scratch.BlockShape.SQUARE,
            blockType: Scratch.BlockType.OUTPUT, // basically just undefined
            branchCount: 1,
            text: "Anonymous Function"
          },
          {
            opcode: "returnFromFunction",
            func: "noComp",
            blockType: Scratch.BlockType.COMMAND,
            text: "return [VALUE]",
            tooltip: "Returns a value from a function, immediately stopping its execution. ",
            arguments: {
              VALUE: {
                type: Scratch.ArgumentType.STRING,
              }
            },
            isTerminal: true,
          },
          {
            opcode: "callFunction",
            func: "noComp",
            blockType: Scratch.BlockType.COMMAND,
            text: "call function [FUNCTION]",
            tooltip: "Executes a function, and discards its return value. ",
            arguments: {
             FUNCTION: {
               type: Scratch.ArgumentType.STRING,
               defaultValue: "Insert Function Here",
             }
            }
          },
          {
            opcode: "callFunctionOutput",
            func: "noComp",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: Scratch.BlockShape.SQUARE,
            text: "call function [FUNCTION] and get return value",
            tooltip: "Executes a function. ",
            arguments: {
             FUNCTION: {
               type: Scratch.ArgumentType.STRING,
               defaultValue: "Insert Function Here",
             }
            }
          },*/
        ],
        menus: {
          objectClasses: {
            allowReporters: false,
            items: ["Object", "Array", "Set", "Map"]
          }
        }
      };
    }
    noComp(args, util) {
      // Check if monitor
      //console.log(util, util.thread.peekStack());
      switch (util.thread.peekStack()) {
        case ("vgscompiledvalues_newObject_Object"):
          return "<Object>"
        case ("vgscompiledvalues_newObject_Array"):
          return "<Array>"
        case ("vgscompiledvalues_newObject_Set"):
          return "<Set>"
        case ("vgscompiledvalues_newObject_Map"):
          return "<Map>"
        case ("vgscompiledvalues_createSymbol"):
          return "Symbol()"
        case ("vgscompiledvalues_nothingValue"):
          return "<Nothing>"
        default:
          if (util.thread.peekStack().startsWith("vgscompiledvalues_getVar")) {
            // do stuff
            //console.log(args.VARIABLE)
            return this.getVar(args.VARIABLE.id, args.VARIABLE.name)
          }
      }
      throw "Please turn on compiler. " // If its not monitor
    }
    getCompileInfo() {
      return {
        ir: {
          log: (generator, block) => ({
            kind: "stack",
            contents: generator.descendInputOfBlock(block, "TXT")
          }),
          newObject: (generator, block) => ({
            kind: "input",
            type: block.fields.CLASS.value,
          }),
          anonymousFunction: (generator, block) => ({
            kind: "input",
            stack: generator.descendSubstack(block, "SUBSTACK")
          }),
          returnFromFunction: (generator, block) => ({
            kind: "stack",
            value: generator.descendInputOfBlock(block, "VALUE")
          }),
          callFunction: (generator, block) => ({
            kind: "stack",
            func: generator.descendInputOfBlock(block, "FUNCTION")
          }),
          callFunctionOutput: (generator, block) => ({
            kind: "input",
            func: generator.descendInputOfBlock(block, "FUNCTION")
          }),
          setVar: (generator, block) => ({
            kind: "stack",
            variable: generator.descendVariable(block, "VARIABLE", ""),
            value: generator.descendInputOfBlock(block, "VALUE")
          }),
          getVar: (generator, block) => ({
            kind: "input",
            variable: generator.descendVariable(block, "VARIABLE", ""),
          }),
          getIndex: (generator, block) => ({
            kind: "input", /// gotta finish later.
            key: generator.descendInputOfBlock(block, "KEY"),
            object: generator.descendInputOfBlock(block, "OBJECT")
          }),
          setIndex: (generator, block) => ({
            kind: "stack", /// gotta finish later.
            key: generator.descendInputOfBlock(block, "KEY"),
            value: generator.descendInputOfBlock(block, "VALUE"),
            object: generator.descendInputOfBlock(block, "OBJECT")
          }),
          iterateObject: (generator, block) => ({
            kind: "stack",
            stack: generator.descendSubstack(block, "SUBSTACK"),
            key: generator.descendVariable(block, "KEY"),
            value: generator.descendVariable(block, "VALUE"),
            object: generator.descendInputOfBlock(block, "OBJECT")
          }),
          isSame: (generator, block) => ({
            kind: "input",
            left: generator.descendInputOfBlock(block, "X"),
            right: generator.descendInputOfBlock(block, "Y")
          }),
          outputCode: (generator, block) => ({
            kind: "stack"
          }),
          deleteIndex: (generator, block) => ({
            kind: "stack",
            key: generator.descendInputOfBlock(block, "KEY"),
            object: generator.descendInputOfBlock(block, "OBJECT")
          }),
          addItem: (generator, block) => ({
            kind: "stack",
            value: generator.descendInputOfBlock(block, "VALUE"),
            object: generator.descendInputOfBlock(block, "OBJECT"),
          }),
          keyExists: (generator, block) => ({
            kind: "input",
            key: generator.descendInputOfBlock(block, "KEY"),
            object: generator.descendInputOfBlock(block, "OBJECT")
          }),
          sizeof: (generator, block) => ({
            kind: "input",
            object: generator.descendInputOfBlock(block, "OBJECT")
          }),
          createSymbol: (generator, block) => ({
            kind: "input"
          }),
          nothingValue: (generator, block) => ({
            kind: "input"
          })
        },
        js: {
          log: (node, compiler, imports) => {
            let x = compiler.descendInput(node.contents)
            compiler.source += `console.log(${x.asUnknown()});\n`
            console.log(x)
            console.log(compiler)
          },
          newObject: (node, compiler, imports) => {
            let object;
            switch (node.type) {
              case "Object":
                object = `new ((runtime.ext_vgscompiledvalues).Object)()`
                break;
              case "Array":
                object = `new ((runtime.ext_vgscompiledvalues).Array)()`
                break;
              case "Set":
                object = `new ((runtime.ext_vgscompiledvalues).Set)()`
                break;
              case "Map":
                object = `new ((runtime.ext_vgscompiledvalues).Map)()`
                break;
              default:
                object = `new ((runtime.ext_vgscompiledvalues).Object)()`
                break;
            }
            return new (imports.TypedInput)(object, imports.TYPE_UNKNOWN)
          },
          anonymousFunction: (node, compiler, imports) => {
            // big hack ALSO STOLEN
			const oldSrc = compiler.source;
			compiler.descendStack(node.stack, new (imports.Frame)(false));
			const stackSrc = compiler.source.substring(oldSrc.length);
			compiler.source = oldSrc;
			
			return new (imports.TypedInput)(`Object.assign((function(target = __target){try{${stackSrc};}catch(e){throw e};return runtime.ext_vgscompiledvalues.Nothing}), {type: "Function", original: target.isOriginal, sprite: target.getName(),e:console.log(target), toString: function(){return \`<Function in \${this.sprite}\${!this.original ? "'s clone" : ""}>\`}})`, imports.TYPE_UNKNOWN)
          },
          returnFromFunction: (node, compiler, imports) => {
            compiler.source += `try{if(!new.target){return ${compiler.descendInput(node.value).asUnknown()}}}catch(e){throw "You can only return from a function"}\n`
          },
          callFunction: (node, compiler, imports) => {
            compiler.source += `(function(){const func=${compiler.descendInput(node.func).asUnknown()};(typeof func === "function" && func.type === "Function")?func():null})()\n`
          },
          callFunctionOutput: (node, compiler, imports) => {
            return new (imports.TypedInput)(`(function(){const func=${compiler.descendInput(node.func).asUnknown()};if(typeof func==="function"&&func.type==="Function"){return func()}return runtime.ext_vgscompiler.Nothing})()`, imports.TYPE_UNKNOWN)
          },
          setVar: (node, compiler, imports) => {
            const variable = compiler.descendVariable(node.variable);
            const value = compiler.descendInput(node.value);
            variable.setInput(value);
            compiler.source += `${variable.source} = ${value.asUnknown()};\n`
          },
          getVar: (node, compiler, imports) => {
            const variable = compiler.descendVariable(node.variable);
            return new (imports.TypedInput)(`${variable.source}`, imports.TYPE_UNKNOWN)
          },
          getIndex: (node, compiler, imports) => {
            const key = compiler.descendInput(node.key);
            const obj = compiler.descendInput(node.object);
            
            const local1 = compiler.localVariables.next();
            // i forgor that we cannot use const in an expression.
            // so i had to implement a store system.
            const getObj = `(runtime.ext_vgscompiledvalues.getStore(globalState.thread, "${local1}")).obj`
            return new (imports.TypedInput)(`((${getObj} = ${obj.asUnknown()}),(typeof (${getObj} ? ${getObj} : \{\}).get === "function")\n    ? ${getObj}.get(${key.asUnknown()})\n    : runtime.ext_vgscompiledvalues.throwErr(\`Cannot read properties of \${${getObj}}\`))`, imports.TYPE_UNKNOWN)
          },
          setIndex: (node, compiler, imports) => {
            const key = compiler.descendInput(node.key);
            const value = compiler.descendInput(node.value);
            const obj = compiler.descendInput(node.object);
            
            const local1 = compiler.localVariables.next();
            compiler.source += `const ${local1} = ${obj.asUnknown()}\n;((typeof (${local1} ? ${local1} : \{\}).set === "function")\n  ? ${local1}.set(${key.asUnknown()}, ${value.asUnknown()})\n  : runtime.ext_vgscompiledvalues.throwErr(\`Cannot set properties of \${${local1}}\`));\n`
          },
          iterateObject: (node, compiler, imports) => {
            const keyVar = compiler.descendVariable(node.key);
            const valueVar = compiler.descendVariable(node.value);
            const obj = compiler.descendInput(node.object);
            // im stupid and dont know which variables are used so im just going to use a local variable
            const objVar = compiler.localVariables.next();
            const iterable = compiler.localVariables.next();
            const keyValue = compiler.localVariables.next();
            compiler.source += `const ${objVar} = ${obj.asUnknown()};\nconst ${iterable} = runtime.ext_vgscompiledvalues.toIterable(${objVar});\nfor (const ${keyValue} of ${iterable}) {${keyVar.source}=${keyValue}[0];${valueVar.source}=${keyValue}[1];`
            // time to add the substack
            compiler.descendStack(node.stack, new (imports.Frame)(true, "vgscompiledvalues.iterateObject"));
            compiler.yieldLoop();
            compiler.source += "};\n"
          },
          isSame: (node, compiler, imports) => {
            return new (imports.TypedInput)(`Object.is(${compiler.descendInput(node.left).asUnknown()}, ${compiler.descendInput(node.right).asUnknown()})`, imports.TYPE_BOOLEAN)
          },
          outputCode: (node, compiler, imports) => {
            console.log(imports, compiler)
            compiler.source += `async return;\n`
          },
          deleteIndex: (node, compiler, imports) => {
            const key = compiler.descendInput(node.key);
            const obj = compiler.descendInput(node.object);
            
            const local1 = compiler.localVariables.next();
            
            compiler.source += `const ${local1} = ${obj.asUnknown()};\n(typeof (${local1} ? ${local1} : {}).delete === "function")\n  ? ${local1}.delete(${key.asUnknown()})\n  : runtime.ext_vgscompiledvalues.throwErr(\`Cannot delete properties of \${${local1}}\`)\n`
          },
          addItem: (node, compiler, imports) => {
            const value = compiler.descendInput(node.value);
            const obj = compiler.descendInput(node.object);
            
            const local1 = compiler.localVariables.next();
            
            compiler.source += `const ${local1} = ${obj.asUnknown()};\n(typeof (${local1} ? ${local1} : {}).add === "function")\n  ? ${local1}.add(${value.asUnknown()})\n  : runtime.ext_vgscompiledvalues.throwErr(\`Cannot add to the end of \${${local1}}\`)\n`
          },
          keyExists: (node, compiler, imports) => {
            const key = compiler.descendInput(node.key);
            const obj = compiler.descendInput(node.object);
            
            const local1 = compiler.localVariables.next();
            // i forgor that we cannot use const in an expression.
            // so i had to implement a store system.
            const getObj = `(runtime.ext_vgscompiledvalues.getStore(globalState.thread, "${local1}")).obj`
            return new (imports.TypedInput)(`((${getObj} = ${obj.asUnknown()}),(typeof (${getObj} ? ${getObj} : \{\}).has === "function")\n  ? ${getObj}.has(${key.asUnknown()})\n  : runtime.ext_vgscompiledvalues.throwErr(\`Cannot read properties of \${${getObj}}\`))`, imports.TYPE_BOOLEAN)
          },
          sizeof: (node, compiler, imports) => {
            const obj = compiler.descendInput(node.object);
            
            const local1 = compiler.localVariables.next();
            // i forgor that we cannot use const in an expression.
            // so i had to implement a store system.
            const getObj = `(runtime.ext_vgscompiledvalues.getStore(globalState.thread, "${local1}")).obj`
            return new (imports.TypedInput)(`((${getObj} = ${obj.asUnknown()}),(typeof (${getObj} ? ${getObj} : \{\}).size === "number")\n  ? ${getObj}.size\n  : runtime.ext_vgscompiledvalues.throwErr(\`Cannot read properties of \${${getObj}}\`))`, imports.TYPE_NUMBER)
          },
          createSymbol: (node, compiler, imports) => {
            return new (imports.TypedInput)(`Symbol("")`, imports.TYPE_UNKNOWN);
          },
          nothingValue: (node, compiler, imports) => {
            return new (imports.TypedInput)(`runtime.ext_vgscompiledvalues.Nothing`, imports.TYPE_UNKNOWN);
          }
        }
      }
    }
    makeLabel(text) {
      return {
        blockType: Scratch.BlockType.LABEL,
        text: text
      }
    }
    throw() {
      throw "User generated Error. "
    }
    hello() {
      return 'World!';
    }
  }
  
  // Reimplementing the "output" and "outputShape" block parameters, also stolen.
	const cbfsb = Scratch.vm.runtime._convertBlockForScratchBlocks.bind(Scratch.vm.runtime);
	Scratch.vm.runtime._convertBlockForScratchBlocks = function(blockInfo, categoryInfo) {
		const res = cbfsb(blockInfo, categoryInfo);
		if (blockInfo.outputShape) {
			if (!res.json.outputShape) res.json.outputShape = blockInfo.outputShape;
		}
		if (blockInfo.output) {
			if (!res.json.output) res.json.output = blockInfo.output;
		}
		if (!res.json.branchCount) res.json.branchCount = blockInfo.branchCount;
		//f (!res.json.inputsInline) res.json.inputsInline = blockInfo.inputsInline
		blockInfo.tooltip ? res.json.tooltip = blockInfo.tooltip : 0;
		if (blockInfo.opcode === "anonymousFunction" && categoryInfo.id === "vgscompiledvalues") {
		  res.json.colour = "#FF0000"
		  res.json.colourSecondary = "#CC0000"
		  res.json.colourTertiary = "#880000"
		}
		// Add argument tooltips.
		const args0 = res.json.args0;
		console.log(args0)
		
		for (const input in (args0 || {})) {
		  for (const argument in (blockInfo.arguments || {})) {
		    if (args0[input].name === argument) {
		       blockInfo.arguments[argument].tooltip ? args0[input].tooltip = blockInfo.arguments[argument].tooltip : 0;
		    }
		  }
		}
		console.log(res.json)
		return res;
	}
	
  Scratch.extensions.register(new HelloWorld(Scratch.vm.runtime));
})(Scratch);
