---
layout: post
title:  "Java Integer Caching: why and how"
date:   2024-10-13 12:00:00 +0200
image: /assets/images/thumbnails/integer_cache.png
excerpt: "As Java developers, we know that we shouldn't compare objects using the `==` operator because this way we
compare the references and not the actual values. That would also apply to Integer objects, however..."
---

As Java developers, we know that we shouldn't compare objects using the `==` operator because this way we compare the
references and not the actual values. That would also apply to `Integer` objects:

```java
Integer x = 256;
Integer y = 256;
System.out.println(x == y); // false
```

This result can surprise nobody.

However, Java has a little trick for us:

```java
Integer x = 127;
Integer y = 127;
System.out.println(x == y); // true
```

### what is going on?

We are observing a mechanism called Integer Caching, which is one of the tricks that Java has for us in order to improve
performance and memory usage.

Normally, when we create an `Integer` object, we claim some space on the heap and put the object there —
for example, with the value `256`. When we create another `Integer` object with the same value, we allocate some more space
on the heap and put there another `Integer` with value `256`, even though such an object was already created previously.

The idea behind Integer Caching is that certain small integer values are used a lot more often than others.
For example, we often use small integers as default values, counters etc. We could argue that they are usually primitives,
but often primitives are wrapped into `Integer` objects, for example if we store them in a `List`.

When the `Integer` class is loaded, Java caches all `Integer` objects with values in range `[-128, 127]` inclusive.
Every time we create an `Integer` object, Java checks for us if this value is within the range, and if so, it's not allocated
but taken from the cache instead.

Two things are achieved this way:
- our application becomes faster because it doesn't need to do all the work for extra value allocation;
- _potentially_, less space is used because these values are stored only once.

### how does this happen exactly?

This simple piece of code `Integer x = 127;` is going to become the following in the bytecode:

```text
 0: bipush        127
 2: invokestatic  #7     // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
 5: astore_1
```

First operation is `bipush`, meaning that we take the byte value `127` and put it onto the operand stack as an integer.
Next, we see `invokestatic`, which calls a static method `Integer.valueOf` that accepts a primitive `int` value and
returns an `Integer` object.
Finally, there is an `astore`, which simply stores the resulting value as a variable.

What is the most interesting for us is that during compilation with `javac`, the code

```java
Integer x = 127;
```

is converted into

```java
Integer x = Integer.valueOf(127);
```

The range checks are happening inside of that `Integer.valueOf` method.

This is how it looks:

```java
// IntegerCache.low = -128;
// IntegerCache.high = 127;
public static Integer valueOf(int i) {
    if (i >= IntegerCache.low && i <= IntegerCache.high)
        return IntegerCache.cache[i + (-IntegerCache.low)];
    return new Integer(i);
}
```

The cache itself is a trivial array of `Integer`, and it's populated when `Integer` class is loaded.

```java
static final Integer[] cache;
```

Since it's a `static final` array, it's kept around for as long as the `Integer` class is loaded, so pretty much for
the lifetime of your application.

### what if this range is insufficient?

If you know you have a specific use-case where you're often reusing `Integer` values of a bigger range, say `[-1000, 1000]`,
you can ask Java to cache a different range for you.
This can be achieved by running your app with a flag: `-XX:AutoBoxCacheMax=1000`.

With all the benefits described above, one might wonder: why not cache more values by default, or even all of them?
Performance wins, less space is taken, so why not?

Well, if we imagine caching the whole range of integers, it would result in storing over 4 billion objects!
They are not garbage collected, so we will have this large space occupied permanently. JVM will have difficulties managing
it efficiently. In summary, the cost of having such an enormous cache defeats the memory and performance benefits gained from it.

### summary

Java does a lot of things that are designed to sneakily improve performance and memory usage, and the Integer Cache is one of them.
A small range of `Integer` objects (the ones that are considered frequently used) is stored all the time,
so we don't need to reallocate these objects again and again. The range is small, so it doesn’t occupy too much space and
overwhelm the JVM.