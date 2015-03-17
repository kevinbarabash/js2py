function sum(x,y) {
    return x+y;
}

function nop() {
    
}

var Foo = function(x) {
    this.x = x;
};

Foo.prototype.getX = function() {
    return this.x;
};

Foo.prototype.addX = function(y) {
    console.log(Foo.bar(5));
    return this.x + y;
};

Foo.prototype.nop = function() {
    
};

Foo.z = 23;

Foo.bar = function(multiplier) {
    return Foo.z * multiplier;  
};

console.log("hello, world");
console.log("5 + 10 = " + sum(5,10));

var foo = new Foo(5);
console.log(foo.getX());
console.log(foo.addX(10));
console.log(Foo.bar(2));
