import runtime


def sum(x,y):
    return x + y


class Foo(runtime.JSObject):
    prototype = {}
    
    def __init__(self,x):
        self.x = x
        
Foo.z = 23
        
def _getX(self):
    return self.x
    
Foo.prototype["getX"] = _getX
        
def _addX(self,y):
    print Foo.bar(5)
    return self.x + y
    
Foo.prototype["addX"] = _addX
        
@classmethod
def _bar(cls, multiplier=1):
    return cls.z * multiplier
    
Foo.bar = _bar

    
print "hello, world" 
print "5 + 10 = " + str(sum(5,10))

foo = Foo(5)
print foo.getX()
print foo.addX(10)
print Foo.bar(2)

class Bar(object):
    @classmethod
    def bar(cls):
        print "bar"
        
bar = Bar();
bar.bar()
