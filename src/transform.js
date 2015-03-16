var esprima = require("esprima");
var estraverse = require("estraverse");

var transform = function(code) {
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
        enter(node, parent) {
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
                    }),
                    body: node.body
                };
                funcsByName[func.name] = func;
                funcOrder.push(func.name);
                // transform the body?
            }
        },
        leave(node, parent) {

        }
    });

    console.log("from runtime import classonlymethod");
    console.log();
    
    var tab = "    ";
    var indent = 0;
    
    var renderFunction = function(func) {
        var params = func.params.join(", ");
        console.log(`${tab.repeat(indent)}def ${func.name}(${params}):`);
        indent++;
        
        var body = func.body;
        if (body.type === "BlockStatement") {
            body.body.forEach(node => {
                var stmt = "";
                // TODO create a render statement function
                // only call it if node.type contains "Statement"
                if (node.type === "ReturnStatement") {
                    stmt += "return ";
                    // TODO do the same for epxressions
                    if (node.argument.type === "BinaryExpression") {
                        
                    }
                } 
            });
        }
        
        console.log(`${tab.repeat(indent)}pass`);
        indent--;
        console.log();
    };
    
    var renderMethod = function(func, isClassMethod) {
        var firstParam = isClassMethod ? "cls" : "self";
        var params = [firstParam, ...func.params].join(", ");
        var name = func.name;
        
        if (isClassMethod) {
            console.log(`${tab.repeat(indent)}@classonlymethod`);
        }
        console.log(`${tab.repeat(indent)}def ${name}(${params}):`);
        indent++;
        console.log(`${tab.repeat(indent)}pass`);
        console.log();
        indent--;
    };

    funcOrder.forEach(function (name) {
        var func = funcsByName[name];
        
        if (func.methods) {
            console.log(`${tab.repeat(indent)}class ${func.name}(object):`);
            indent++;
            
            renderMethod({ name: "__init__", params: func.params });
            
            Object.keys(func.methods).forEach(function(name) {
                renderMethod(func.methods[name]);
            });
            
            Object.keys(func.static).forEach(function(name) {
                renderMethod(func.static[name], true);
            });

            indent--;
        } else {
            renderFunction(func);

            if (func.static) {
                // TODO printout private numbered functions
            }
        }

    });
    
    console.log(`${tab.repeat(indent)}print "hello, world!"`);
};

module.exports = transform;
