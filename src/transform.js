var esprima = require("esprima-fb");

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
        
        if (node.operator === "+") {
            if (node.left.type === "Literal" && 
                typeof node.left.value === "string" &&
                node.right.type !== "Literal") {
                    return `${left} + str(${right})`;
                }
        }
        
        return `${left} ${node.operator} ${right}`;
    } else if (node.type === "CallExpression" || node.type === "NewExpression") {
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
        if (typeof node.value === "string") {
            return `"${node.value}"`
        }
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
    } else if (node.type === "VariableDeclarator") {
        var name = node.id.name;
        var init = renderExpression(node.init);
        console.log(`${tab.repeat(indent)}${name} = ${init}`);
    }

};

var transform = function(code) {
    var ast = esprima.parse(code);
    
    // TODO(ordered dictionary)
    var funcsByName = {};
    var statements = [];

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
    
    // TODO: add a scope of object to track what classes/functions have already been defined
    ast.body.forEach(node => {
        var func, name, parts, right;
        
        if (node.type === "ExpressionStatement") {
            var expr = node.expression;
            if (expr.type === "AssignmentExpression") {
                parts = getMemberParts(expr.left);
                right = expr.right;

                if (right.type === "FunctionExpression") {
                    if (parts[0] in funcsByName) {
                        if (parts[1] === "prototype" && parts.length === 3) {
                            name = parts[2];
                            func = funcsByName[parts[0]];
                            func.methods = func.methods || {};
                            func.methods[name] = {
                                name: name,
                                params: right.params.map(function (param) {
                                    return param.name;
                                }),
                                body: right.body
                            }
                        } else if (parts.length === 2) {
                            name = parts[1];
                            func = funcsByName[parts[0]];
                            func.static = func.static || {};
                            func.static[name] = {
                                name: name,
                                params: right.params.map(function (param) {
                                    return param.name;
                                }),
                                body: right.body
                            }
                        }
                    }
                } else {
                    statements.push(node);
                }
            } else {
                statements.push(node);
            }
        } else if (node.type === "VariableDeclaration") {
            node.declarations.forEach(decl => {
                var init = decl.init;
                if (init.type === "FunctionExpression") {
                    func = {
                        name: decl.id.name,
                        params: init.params.map(function (param) {
                            return param.name;
                        }),
                        body: init.body
                    };
                    funcsByName[func.name] = func;
                    statements.push(func);
                } else {
                    statements.push(decl);
                }
            });
        } else if (node.type === "FunctionDeclaration") {
            func = {
                name: node.id.name,
                params: node.params.map(function (param) {
                    return param.name;
                }),
                body: node.body
            };
            funcsByName[func.name] = func;
            statements.push(func);
            // transform the body?
        } else {
            statements.push(node);
        }
    });

    // preface
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
    
    statements.forEach(function (stmt) {
        if (stmt.type) {
            renderStatement(stmt);
        } else {
            var func = stmt;

            if (func.methods) {
                console.log(`${tab.repeat(indent)}class ${func.name}(object):`);
                indent++;

                renderMethod({ name: "__init__", params: func.params, body: func.body });

                if (func.methods) {
                    Object.keys(func.methods).forEach(function(name) {
                        renderMethod(func.methods[name]);
                    });
                }

                if (func.static) {
                    Object.keys(func.static).forEach(function(name) {
                        renderMethod(func.static[name], true);
                    });
                }

                indent--;
            } else {
                renderFunction(func);

                if (func.static) {
                    // TODO printout private numbered functions
                }
            }
        }
    });
    
    console.log(`${tab.repeat(indent)}print "hello, world!"`);
};

module.exports = transform;
