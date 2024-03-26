---
layout: post
title:  "I won’t let Java confuse you #1: String concatenation operator +"
date:   2024-03-16 12:00:00 +0200
image: /assets/images/thumbnails/java_confuse_thumbnail.png
excerpt: "Welcome to the second episode of this little Java-unconfusing series. Today I would like to talk briefly about String concatenation operator +..."
---
Welcome to the second episode of this little Java-unconfusing series. 
Today I would like to talk briefly about String concatenation operator `+`.

First, let me share some interesting use-case, then we will take a look under the hood to understand what happened.

### Example
Let’s take a look at the following piece of code:
{% highlight java %}
System.out.println(1 + 5 + "text" + 5 + 1);
{% endhighlight %}

What do you think this code will output?

### What happened
If we look at the bytecode, we will see a very boring piece:
{% highlight text %}
0: getstatic     #7    // Field java/lang/System.out:Ljava/io/PrintStream;
3: ldc           #13   // String 6text51
5: invokevirtual #15   // Method java/io/PrintStream.println:(Ljava/lang/String;)V
8: return
{% endhighlight %}

We see that the String evaluation doesn't happen at runtime, 
it has happened at compile time. The whole expression got optimized away, 
so we're dealing with a constant value: `6text51`.

But how did this value come to be?

Going from left to right, only two first operands are taken into account at a time. 
If none of them is `String`, and the numeric operation can be performed, it is performed. 
If any of the two is `String`, the other operand will also be converted to a `String`, and they will be concatenated.

So, in our example, first operation is `1 + 5`, which can be evaluated as `6`. 
Next, we will have `6 + "text"`, which will result in concatenated String `"6text"`. 
Afterward, all the operations will be resulting in String concatenation, 
bringing us to the final result: `"6text51"`.

### Let's try something out
Let's try out something strange. As mentioned, the evaluation happens at compile time. 
What if we force it to happen at the runtime?

For example, we can create a situation where the exact type of some value is not known at compile time.

It looks ugly, but bear with me:
{% highlight java %}
boolean cond = args[0].contains("true");
var unknown = cond ? 1 : "text";
System.out.println(unknown + "text" + 5 + 1);
{% endhighlight %}

Based on what we discussed before, we know that here it doesn’t matter 
what is the type of the `unknown` variable, because the second operand is `String`, 
so the first two operands will be concatenated.

This is the relevant piece of bytecode:
{% highlight text %}
0: aload_0
1: iconst_0
2: aaload
3: ldc           #7       // String true
5: invokevirtual #9       // Method java/lang/String.contains:(Ljava/lang/CharSequence;)Z
8: istore_1
9: iload_1
10: ifeq          20
13: iconst_1              // this is just a constant integer value, but in the next line we're going to wrap it into an object
14: invokestatic  #15     // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
17: goto          22
20: ldc           #21     // String text
22: astore_2              // here we're saving a reference to some object,
// either a String or Integer, depending what's on our operand stack at the moment
23: getstatic     #23     // Field java/lang/System.out:Ljava/io/PrintStream;
26: aload_2               // loading our mystery object onto the stack again
// the next operation will call a String.valueOf method which will accept the
// mystery Object as an argument and convert it to a String
27: invokestatic  #29     // Method java/lang/String.valueOf:(Ljava/lang/Object;)Ljava/lang/String;
// finally, the actual operation will result in a String concatenation
30: invokedynamic #32,  0 // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;)Ljava/lang/String;
35: invokevirtual #36     // Method java/io/PrintStream.println:(Ljava/lang/String;)V
{% endhighlight %}

To summarize the above bytecode: we don't know at compile time, 
what’s the type of `unknown` variable. However, no matter what it is, 
it's going to be ultimately converted to a `String`, because the next operand in our expression 
is `String`, so they will be concatenated in any case.

Now the interesting part. What if we make the second operand non-String?

{% highlight java %}
boolean cond = args[0].contains("true");
var unknown = cond ? 1 : "text";
System.out.println(unknown + 1 + "text" + 5 + 1);
{% endhighlight %}

Now, the compiler knows that it's not necessarily a String concatenation. 
It can be something else depending on the type, but the type of the first operand is unknown... 
What would you do if you were a compiler?

The correct answer is: complain :) This simply won't compile.

### Lessons learned
String concatenation is a very interesting operation, because 
it leverages a lot of optimizations both at compile time and at runtime.

Today we saw how the compile time evaluation happens: two operands at a time, 
from left to right. And if you're giving your compiler hard time deciding what operation 
it should perform, it will shout at you.

Hope this was fun and educative! See you in the next one!

P.S.: If you liked this one, chances are you’d also like the one about [increments]({{ site.baseurl }}{% link _posts/2024-03-07-I-wont-let-Java-confuse-you-0.markdown %}).