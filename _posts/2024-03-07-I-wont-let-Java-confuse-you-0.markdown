---
layout: post
title:  "I won’t let Java confuse you #0: increment"
date:   2024-03-07 12:00:00 +0200
image: /assets/images/thumbnails/java_confuse_thumbnail.png
excerpt: "Sometimes the code that seems really clear can turn out to be quite deceiving, even in some really basic concepts. In these situations, it’s good to question whether that code doesn’t smell..."
---
Sometimes the code that seems really clear can turn out to be quite deceiving, 
even in some really basic concepts. In these situations, 
it’s good to question whether that code doesn’t smell...

Either way, it’s interesting to know about the cases where Java can be confusing. 
So I decided to make the series of little Java surprises.

Traditionally, I will be peeking under the hood, so we can be efficiently unconfused :)

### Example
Let’s take a look at the following piece of code:
{% highlight java %}
int a = 0;
a = a++;
{% endhighlight %}

What is the value of `a` as result? Did you get it right? It’s `0`.

### What happened?
In the bytecode, increment will be performed using the `iinc` bytecode instruction. 
The value that we want to increment does not need to be placed onto the operand stack, 
because `iinc` modifies the variable directly in the array of local variables.

Now, still, the post-increment (`a++`) should work as follows: 
first use the unmodified value, then increment it.

Does it mean that it will:

- assign `a = a` (`a` is still `0`, redundant, but ok)
- increment variable `a` directly (`a` should become `1`?)

Not exactly! Let’s take a look at the bytecode, shall we?

This is the relevant piece:
{% highlight text %}
0: iconst_0      // load constant value 0 onto the stack
1: istore_1      // save the value from the stack in slot 1
2: iload_1       // load from slot 1 to the stack (value = 0)
3: iinc     1, 1 // increment the variable in slot 1, it becomes 1 (not the value on the stack, it's still 0!!)
6: istore_1      // save the value from the stack into variable 1 (override variable 1, so it becomes 0)
{% endhighlight %}


To summarise:
- the value was used in the expression before it was incremented (`0`)
- the variable was indeed modified afterward (`1`)
- but then we override it with the result of our expression (`0`)

### Ok, another example:
{% highlight java %}
int a = 0;
a = a++ + ++a;
{% endhighlight %}

What is the value of `a`? Just take a second to process, result will be at the end :)

Ok, what’s happening:
{% highlight text %}
0: iconst_0        // load 0 onto the stack
1: istore_1        // store it in slot 1 (value 0)

// now our expression is processed from left to right:

2: iload_1         // load it back onto the stack (value 0),
// means we will use this a = 0 in the first half of expression,
// and any increments of this variable in the next lines
// will affect the variable, but not our stack:
3: iinc     1, 1   // post-increment variable in slot 1 (value = 1)
6: iinc     1, 1   // this is part of following pre-increment, same variable (value = 2)
9: iload_1         // load the variable onto the stack (value = 2)
10: iadd           // calculate sum of two top values from the stack (2 + 0 = 2)
11: istore_1       // save the resulting value into variable 1
{% endhighlight %}

This time, the result of post-increment in first part of the expression is not ignored. 
The expression continues after post-increment, so we are not yet saving anything to 
the final resulting variable, and we do use the incremented variable again in the expression.

As result, `a` becomes `0 + 2 = 2`.

### Lessons learned
Unlike post-increment, pre-increment would have modified the value first, 
and then loaded it onto the stack and used in the expression. So we would have seen a less unexpected result…

**However:**
- having increment (or decrement) as part of expressions is **BAD** (makes the code confusing, as you see);
- it is redundant to assign incremented value to itself, because increment modifies the variable directly, so in our example you can do just: `a++;`.

Hope this was fun and educative! See you in the next one!