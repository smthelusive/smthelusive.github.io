---
layout: post
title:  "I won’t let Java confuse you #4: unreachable statements"
date:   2024-05-09 12:00:00 +0200
image: /assets/images/thumbnails/unreachable.png
excerpt: "Do you think Java consistently rejects all unreachable code? Well...<br><br><i>Welcome back to the Java-unconfusing series!
Usually here we take a look at the pieces of code which may look really innocent, but not work as we expect. Or not compile at all.
It's good to dive into the reasons why it is a certain way, so we can learn more about Java ideology and design decisions.
Let's get unconfused together!</i>"
---
Do you think Java consistently rejects all unreachable code? Well...

_Welcome back to the Java-unconfusing series! Usually here we take a look at the pieces of code which may look really
innocent, but not work as we expect. Or not compile at all. It's good to dive into the reasons why it is a certain way,
so we can learn more about Java ideology and design decisions.
Let's get unconfused together!_

### Let's talk about unreachable statements
There are a number of different use-cases when the code is considered _unreachable_. The compiler doesn't accept this
code. Examples include statements that follow `break` or `return`, or infinite `while(true)` loops, for example.
We have all seen these.

Let's take a look at this particular example:

{% highlight java %}
int a = 0;
while (false) {
    a = 10;
}
{% endhighlight %}

The compiler tells us that the loop condition is always `false`, and that makes the loop body unreachable. Makes sense
that it doesn't compile.

What about the following example?

{% highlight java %}
int a = 0;
if (false) {
    a = 10;
}
{% endhighlight %}

The condition is always `false`, which means that the body can never be executed. However, this piece of code
is accepted by the compiler! Technically, the Java compiler doesn't even consider it 'unreachable'.

### Why is it so?
This choice has been made consciously.
When the condition is a constant `false` value, the compiler doesn't add the contents of the entire conditional block to
the resulting set of the bytecode instructions. This allows developers to define flags such as:

{% highlight java %}
static final boolean FEATURE = false;
{% endhighlight %}

And then use it in a condition.

Later on, it's easy to change the value of the `FEATURE` flag to `true`, but there's one important detail to it. If the
flag itself and the conditional block are located in different classes, it's important to recompile the class containing
the condition, since the whole new set of instructions might be added to the bytecode.

### When is it so?
Coming back to our `while (false)` example, such behaviour is only happening when the condition is a **constant** `false` value.

So, this would work without any issue:

{% highlight java %}
int a = 0;
int b = 10;
while (b + b < 10) {
    a = 1;
}
{% endhighlight %}

While this wouldn't compile:

{% highlight java %}
int a = 0;
final int b = 10;
while (b + b < 10) {
    a = 1;
}
{% endhighlight %}

The reason is that the compiler is performing optimisation called 'constant folding'. All known (constant) values can be
used in order to pre-calculate anything where possible. If the values are constant, the assumptions can be safely made,
but not otherwise.

So, in the example above, the compiler knows that our actual condition is `10 + 10 < 10`, and it is `false`, and it can't be
changed from anywhere else in the code. So it is safe to conclude that the code is invalid.

### Crazy thoughts
Curious minds might wonder: if `if (false) {}` block contents are not placed into the bytecode at all, does it mean that
the compilation of that block is skipped entirely? So any nonsense inside that block would not result in a compile error?
The answer is no. The compiler still diligently does its work and reports any compile errors within that block.

Hope this was educative and fun! Here are the related [docs](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html#jls-14.22).

If you liked this little post, take a look at the previous posts from the series:
- [Widening]({{ site.baseurl }}{% link _posts/2024-05-01-I-wont-let-Java-confuse-you-3.markdown %})
- [Expressions]({{ site.baseurl }}{% link _posts/2024-03-25-I-wont-let-Java-confuse-you-2.markdown %})
- [String operator `+`]({{ site.baseurl }}{% link _posts/2024-03-16-I-wont-let-Java-confuse-you-1.markdown %})
- [Increment]({{ site.baseurl }}{% link _posts/2024-03-07-I-wont-let-Java-confuse-you-0.markdown %})