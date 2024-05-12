---
layout: post
title:  "I won’t let Java confuse you #3: widening"
date:   2024-05-01 12:00:00 +0200
image: /assets/images/thumbnails/java_confuse_thumbnail.png
excerpt: "Welcome to the fourth episode of our Java-unconfusing series, where we look at some basic concepts in Java (in fact, it applies to many other languages too) that result in confusing outcomes in certain cases..."
---
Welcome to the fourth episode of our Java-unconfusing series, where we look at some basic concepts in Java (in fact, it applies to many other languages too)
that result in confusing outcomes in certain cases. When that happens, most likely the code quality could do with some improvements.
In any case, it's good to know what we can expect from Java and never be confused by it.

Today, I would like to talk about 'widening'...

### Example
Assume we have two `short` values and we'd like to calculate their sum. It would make sense to write the following piece of code:
{% highlight java %}
short a = 10000;
short b = 20000;
short c = a + b;
{% endhighlight %}

However, this code does not compile. Java compiler considers the result of this expression as integer value instead of `short`.
We could, of course, cast the result to `short`, successfully compile it and get the expected result:

{% highlight java %}
short a = 10000;
short b = 20000;
short c = (short)(a + b); // c == 30000
{% endhighlight %}

### Why do we have to cast?
If we look at the bytecode of the previous example, we will find a following piece:
{% highlight text %}
0: sipush        10000
3: istore_1
4: sipush        20000
7: istore_2
8: iload_1
9: iload_2
10: iadd
11: i2s
12: istore_3
{% endhighlight %}

It starts with `sipush`, and the function of this bytecode operation is literally to push a `short` onto the stack as an **integer value**.
The following operation is `istore_1`, and it already tells us that it stores variable `a` as integer. Same happens for `b`.
All the following operations are simply integer manipulations, including `iadd` which sums two integer values.

At the end, because we performed the casting, we find `i2s` (integer to short) casting operation, but still the final result that is
stored in the local variables is again an integer value.

### But why?
What we have observed is called 'widening primitive conversion'. The `short` value, which takes two bytes, is put in a bigger 'box' of 4 bytes, which is an integer type.

Why is this happening in this case? There are simply no bytecode instructions which would allow to perform operations directly on `short` values, so they are converted to integers.

### OMG, what's that though?
If we write our original code without any casting, but make our variables `final`, there is no problem compiling that!

{% highlight java %}
final short a = 10000;
final short b = 20000;
short c = a + b;
{% endhighlight %}

This behaviour is easy to explain. Let's take a look at the relevant piece of bytecode:

{% highlight text %}
 0: sipush        10000
 3: istore_1
 4: sipush        20000
 7: istore_2
 8: sipush        30000
11: istore_3
{% endhighlight %}

As we can see, all values including the resulting sum are considered as constant values. The sum is calculated during
compilation and placed directly into the bytecode. This is one of the compiler optimizations called 'constant folding'.

In this case, compiler could calculate the sum and see that the resulting value `30000` indeed fits into 2 bytes to be of a `short` type.

If we do a slight change to our code so the sum wouldn't fit into a `short` type, the compiler immediately starts to complain:

{% highlight java %}
final short a = 20000;
final short b = 20000;
short c = a + b; // won't compile, because 40000 doesn't fit in 2 bytes
{% endhighlight %}

Note: if we had the same code, but all our values were integer, and the sum didn't fit into an integer, 
we would have gotten a warning, but compiler would have accepted it anyway.

### Cases of widening
There are different use-cases of widening primitive conversion. Often it is happening when one of the values in a single operation is of a wider type,
so the other value is widened to match.

Also, `short`, `byte`, `char` and `boolean` values are always converted to `int` under the hood. 
There is simply no means of dealing with these types on the bytecode level.

### Short doesn't exist?
It's a good question. 

We have seen from the above examples that `short` is saved into the local variables as an integer value. 
So is it just a Java code sugar?

Using the following code, we can try and figure out, what is the type of our primitive variable:

{% highlight java %}
short a = 20000;
System.out.println(((Object)a).getClass().getName());
{% endhighlight %}

The code above outputs `java.lang.Short`. So did we get something wrong?

If we look in the bytecode, we will find our answers:

{% highlight text %}
0: sipush        20000
3: istore_1
4: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
7: iload_1
8: invokestatic  #13                 // Method java/lang/Short.valueOf:(S)Ljava/lang/Short;
11: invokevirtual #19                 // Method java/lang/Object.getClass:()Ljava/lang/Class;
14: invokevirtual #23                 // Method java/lang/Class.getName:()Ljava/lang/String;
17: invokevirtual #29                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
{% endhighlight %}

What is happening here is that we are saving our value as an integer variable. Then we load it onto the stack and
use `Short::valueOf` method to make it `short` again. Compiler knows, that it's a `short`, because we specified it in our code.
So it makes sure that our `short` variables behave as they should. But in the end...

`short` is a lie :)

(yes, and `byte` as well)

Hope this was educative and fun!

If you liked this little post, take a look at the previous posts from the series:
- [Expressions]({{ site.baseurl }}{% link _posts/2024-03-25-I-wont-let-Java-confuse-you-2.markdown %})
- [String operator `+`]({{ site.baseurl }}{% link _posts/2024-03-16-I-wont-let-Java-confuse-you-1.markdown %})
- [Increment]({{ site.baseurl }}{% link _posts/2024-03-07-I-wont-let-Java-confuse-you-0.markdown %})