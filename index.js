require("babel/register");
var transform = require("./src/transform");

var fs = require("fs");

var code = fs.readFileSync("test/hello_world.js", "utf-8");

transform(code);
