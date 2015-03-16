from runtime import classonlymethod 


def sum(x, y):
    pass


class Foo(object):
    def __init__(self, x):
        pass

    def getX(self):
        pass

    def addX(self, y):
        pass

    @classonlymethod
    def bar(cls, multiplier):
        pass

print "hello, world!"
