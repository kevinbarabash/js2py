var esprima = require("esprima");
var estraverse = require("estraverse");
var fs = require("fs");

var code = fs.readFileSync("../test/hello_world.js", "utf-8");


var ast = esprima.parse(code);


// TODO(ordered dictionary)
var funcsByName = {};
var funcOrder = [];


var getMemberParts = function(node) {
    var parts = [];
    
    var getParts = function(node) {
        var obj = node.object;
        if (obj.type === "MemberExpression") {
            getParts(obj);
        } else if (obj.type === "Identifier") {
            parts.push(obj.name);
        } else {
            throw "something's wrong in getParts";
        }
        var prop = node.property;
        parts.push(prop.name);
    };
    
    getParts(node);
    
    return parts;
};

estraverse.traverse(ast, {
    enter: function(node, parent) {
        var func, name;
        
        if (node.type === "FunctionExpression") {
            if (parent.type === "AssignmentExpression") {
                if (parent.left.type === "MemberExpression") {
                    var parts = getMemberParts(parent.left);
                    var cls = parts[0];
                    
                    func = funcsByName[cls];
                    if (!func) {
                        throw "class not defined yet";
                    }
                    
                    if (parts[1] === "prototype") {
                        if (!func.methods) {
                            // TODO use an ordered dict for this as well
                            func.methods = {};
                        }
                        name = parts[2];
                        if (!name) {
                            throw "replacing the prototype isn't supported yet"
                        }
                        func.methods[name] = {
                            name: name,
                            params: node.params.map(function (param) {
                                return param.name;
                            })
                        }
                    } else {
                        if (!func.static) {
                            // TODO use an ordered dict for this as well
                            func.static = {};
                        }
                        name = parts[1];
                        if (!name) {
                            throw "changing what the class is pointing at isn't supported";
                        }
                        func.static[name] = {
                            name: name,
                            params: node.params.map(function (param) {
                                return param.name;
                            })
                        }
                    }
                }
            } else if (parent.type === "VariableDeclarator") {
                func = {
                    name: parent.id.name,
                    params: node.params.map(function (param) {
                        return param.name;
                    })
                };
                funcsByName[func.name] = func;
                funcOrder.push(func.name);
            }
        }
        
        if (node.type === "FunctionDeclaration") {
            func = {
                name: node.id.name,
                params: node.params.map(function (param) {
                    return param.name;
                })
            };
            funcsByName[func.name] = func;
            funcOrder.push(func.name);
            // transform the body?
        }
    },
    leave: function(node, parent) {
        
    }
});


funcOrder.forEach(function (name) {
    var func = funcsByName[name];
    
    // TODO: upgrade source to ES6 so that we can use template strings
    if (func.methods) {
        console.log("class " + func.name + "(object):");
        var params = func.params.slice();
        params.unshift("self"); // ["self", ...func.params] with ES6
        console.log("    def __init__(" + params.join(", ") + "):");
        console.log("        pass");
        console.log("");
        Object.keys(func.methods).forEach(function(name) {
            var value = func.methods[name];
            var params = value.params.slice();
            params.unshift("self");
            console.log("    def " + name + "(" + params.join(", ") + "):");
            console.log("        pass");
            console.log("");
        });
    } else {
        console.log("def " + func.name + "(" + func.params.join(", ") + "):");
        console.log("    pass");
        console.log("");
        
        if (func.static) {
            // TODO printout private numbered functions
            //Object.keys(func.static).forEach(function (name) {
            //    var value = func.static[name];
            //    console.lo
            //    console.log(func.name + "." + name 
            //});
        }
    }
    
});

