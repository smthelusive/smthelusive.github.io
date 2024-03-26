---
layout: post
title:  "I won’t let Java confuse you #2: expressions"
date:   2024-03-25 12:00:00 +0200
image: /assets/images/thumbnails/java_confuse_thumbnail.png
excerpt: "Welcome to the third episode of the Java-unconfusing series, where we talk about the things that look innocent, while the results seem confusing. Today I'm going to show you a simple numeric expression..."
---
Welcome to the third episode of the Java-unconfusing series, where we talk about the things that look 
innocent, while the results seem confusing. Often that means that the code is not of the best quality.
Yet, it's good to know about such cases and learn how exactly it works.

Today I'm going to show you a simple numeric expression...

### Example
Let’s take a look at the following line:
{% highlight java %}
System.out.println(1 / 2 + 3.0 * 1 / 2);
{% endhighlight %}

What do you think is the output?

### What happened
There is nothing interesting happening in the bytecode:

{% highlight text %}
0: getstatic     #7     // Field java/lang/System.out:Ljava/io/PrintStream;
3: ldc2_w        #13    // double 1.5d
6: invokevirtual #15    // Method java/io/PrintStream.println:(D)V
9: return
{% endhighlight %}

The result of the expression is a constant value `1.5d`, which means that the expression has been
fully pre-calculated (optimised) during compilation.

But how come it's `1.5`?

We do expect that the type of the result is `double`, since we have an explicitly double value `3.0` in the expression.

### But let's start with integers
If instead of `3.0` we had just `3`, we could have expected a result to be an integer.

So, for integers, we'd have: `1 / 2 + 3 * 1 / 2 = 1`.

#### Explanation:
`1 / 2` results in `0`, because the rounding to an integer value happens by simply chopping off the remainder, 
even when it's `0.5` or greater. 
So, the expression becomes: `0 + 3 * 1 / 2`.
Next operation is `3 * 1`, because multiplication dominates over addition. We will end up with `3 / 2`, 
which normally equals `1.5`, but since it's an integer value, it becomes `1`.

### Now let's mix in some doubles
Original expression, for reference: `1 / 2 + 3.0 * 1 / 2`.
This will result in `1.5`.

#### Explanation:
If we follow the appropriate priorities, the first operation we encounter is the leftmost `1 / 2`.
There are no doubles participating in this operation, so the result is an integer value.
Normally, `1 / 2 = 0.5`, but with integers it results into `0`.

Now we have: `0 + 3.0 * 1 / 2`.
The next operation by priority is `3.0 * 1`, which will result in a double value `3.0`. 
Our expression transforms into `0 + 3.0 / 2`.
Next operation is division: `3.0 / 2 = 1.5`, the result is `double`, since we do have a `double` participant here.
The final result is `0 + 1.5 = 1.5`.

### Lessons learned
In such confusing expressions with mixed types, it's important to keep track of the two things:
- What is the next binary operation by priority? Expressions inside the parentheses dominate over the ones outside, the more nested they are, the higher the priority. Multiplication and division dominate over addition and subtraction.
- What are the types of the participants? Double type dominates over integer. String dominates over them all :)

Remembering that, it's easy to perform one binary operation at a time (in your head) and keep track of the type and resulting value.

Hope this was educative and fun!

If you liked this one, take a look at the previous posts from the series:
- [Increment]({{ site.baseurl }}{% link _posts/2024-03-07-I-wont-let-Java-confuse-you-0.markdown %})
- [String operator `+`]({{ site.baseurl }}{% link _posts/2024-03-16-I-wont-let-Java-confuse-you-1.markdown %})