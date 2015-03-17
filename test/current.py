from runtime import classonlymethod
import console

def sum(x, y):
    return x + y

def nop():
    pass

class Foo(object):
    def __init__(self, x):
        self.x = x

    def getX(self):
        return self.x

    def addX(self, y):
        console.log(Foo.bar(5))
        return self.x + y

    def nop(self):
        pass

    @classonlymethod
    def bar(cls, multiplier):
        return Foo.z * multiplier

console.log("hello, world!")
