var esprima = require("esprima");
var estraverse = require("estraverse");

var tab = "    ";
var indent = 0;

var renderExpression = function(node) {
    var left, right;
    if (node.type === "AssignmentExpression") {
        // TODO handle left Patterns correctly
        left = renderExpression(node.left); 
        right = renderExpression(node.right);
        return `${left} ${node.operator} ${right}`;
    } else if (node.type === "BinaryExpression") {
        left = renderExpression(node.left);
        right = renderExpression(node.right);
        return `${left} ${node.operator} ${right}`;
    } else if (node.type === "CallExpression") {
        var callee = renderExpression(node.callee);
        var args = node.arguments.map(renderExpression).join(", ");
        
        // make the output more pythonic
        if (callee === "console.log") {
            callee = "print";
            return `${callee} ${args}`
        }
        
        return `${callee}(${args})`;
    } else if (node.type === "ThisExpression") {
        return "self";
    } else if (node.type === "MemberExpression") {
        var obj = renderExpression(node.object);
        var prop = renderExpression(node.property);
        return `${obj}.${prop}`;
    } else if (node.type === "Identifier") {
        return node.name;
    } else if (node.type === "Literal") {
        // TODO convert regex
        return node.value;
    }
};

var renderStatement = function(node) {
    var expr;
    
    if (node.type === "ReturnStatement") {
        expr = renderExpression(node.argument);
        console.log(`${tab.repeat(indent)}return ${expr}`);
    } else if (node.type === "ExpressionStatement") {
        expr = renderExpression(node.expression);
        console.log(`${tab.repeat(indent)}${expr}`);
    }

};

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
                                }),
                                body: node.body
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
                                }),
                                body: node.body
                            }
                        }
                    }
                } else if (parent.type === "VariableDeclarator") {
                    func = {
                        name: parent.id.name,
                        params: node.params.map(function (param) {
                            return param.name;
                        }),
                        body: node.body
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
    console.log("import console");
    console.log();
    
    var renderFunction = function(func) {
        var params = func.params.join(", ");
        console.log(`${tab.repeat(indent)}def ${func.name}(${params}):`);
        indent++;
        
        // TODO: two-pass
        // first pass = find all statements that contribute to a class defn and mark them
        // second pass = spit out class definitions and remaining statements
        var body = func.body;
        if (body.type === "BlockStatement") {
            if (body.body.length > 0) {
                body.body.forEach(node => {
                    renderStatement(node);
                });
            } else {
                console.log(`${tab.repeat(indent)}pass`);
            }
        }
        
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

        var body = func.body;
        if (body.type === "BlockStatement") {
            if (body.body.length > 0) {
                body.body.forEach(node => {
                    renderStatement(node);
                });
            } else {
                console.log(`${tab.repeat(indent)}pass`);
            }
        }
        
        console.log();
        indent--;
    };

    funcOrder.forEach(function (name) {
        var func = funcsByName[name];
        
        if (func.methods) {
            console.log(`${tab.repeat(indent)}class ${func.name}(object):`);
            indent++;
            
            renderMethod({ name: "__init__", params: func.params, body: func.body });
            
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
