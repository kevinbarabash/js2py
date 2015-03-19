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
        print Foo.bar(5)
        return self.x + y

    def nop(self):
        pass

    @classonlymethod
    def bar(cls, multiplier):
        return Foo.z * multiplier

Foo.z = 23
print "hello, world"
print "5 + 10 = " + str(sum(5, 10))
foo = Foo(5)
print foo.getX()
print foo.addX(10)
print Foo.bar(2)
print "hello, world!"
