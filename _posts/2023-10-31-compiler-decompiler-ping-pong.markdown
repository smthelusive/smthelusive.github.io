---
layout: post
title:  "Java compiler-decompiler ping-pong"
date:   2023-10-31 12:00:00 +0200
image: pingpong.png
excerpt: "This small episode related to Java compilation seemed interesting and a bit funny to me, so I’m sharing it here..."
---
This small episode related to Java compilation seemed interesting and a bit funny to me, so I’m sharing it here. 
Hope you enjoy it too 😊

I was working on a (pet) tool for editing class files in the format of Java code. 
For that, I was using the [Procyon][procyon] decompiler and the [Java Compiler API][java-compiler-api]. 
So, simply, I needed to “translate” the code back and forth, from the JVM bytecode to Java, 
and then back to the bytecode.

It was also important for me to ensure that I compiled the code using the exact Java version with which 
it was originally compiled. I used [ASM][asm] to retrieve the Java version from the class file, so then 
I could provide it to the compiler.

When I started testing it with some Java code, it went fine with my first (somewhat bigger) example. 
However, when I started trying out different Java versions, suddenly my method got empty in the final 
result (bytecode — > decompiled to Java — > compiled to bytecode). I thought that I broke it by using 
a different Java version, but actually the problem had a completely different origin.

Example Java code that I used for testing:

{% highlight java %}
public class Main {
    public static void main(String[] args) {
        int num = 42;
        String test = "I have " + num + " cows!";
    }
}
{% endhighlight %}

When this code is compiled, it utilizes the `invokedynamic` instruction in the bytecode for 
this case of String concatenation. Usually, when you view class files in IntelliJ IDEA, 
they are shown decompiled with [Fernflower][fernflower]:

{% highlight java %}
public class Main {
    public Main() {
    }

    public static void main(String[] args) {
        int num = 42;
        String test = "I have " + num + " cows!";
    }
}
{% endhighlight %}

Looks good.

In my project, this was decompiled using Procyon and looked slightly differently:

{% highlight java %}
public class Main
{
    public static void main(final String[] args) {
        final int num = 42;
        final String test = "I have " + num + " cows!";
    }
}
{% endhighlight %}

And then, if the above Java code is compiled, the `Code` section in the bytecode for the `main` method is empty! 
Decompiled again, it would look like this:

{% highlight java %}
public class Main {
    public Main() {
    }

    public static void main(String[] var0) {
    }
}
{% endhighlight %}

I understood that the variables are optimized away because they are not used. 
So I added a “blackhole” for them, which was represented by `System.out::println`:

{% highlight java %}
public static void main(String[] args) {
    int num = 42;
    String test = "I have " + num + " cows!";
    System.out.println(test);
}
{% endhighlight %}

Eventual result from my project (decompiled again):

{% highlight java %}
public class Main {
    public Main() {
    }

    public static void main(String[] var0) {
        System.out.println("I have 42 cows!");
    }
}
{% endhighlight %}

I was like, no `invokedynamic`? Just a boring constant value? What happened? 
The thing is, Procyon added the final keyword for my variables, which tells the compiler 
that they have fully constant values in the end:

{% highlight java %}
final int num = 42;
{% endhighlight %}

For the case of String concatenation that involves only constant (final) values, 
there will be no `invokedynamic` whatsoever. It will simply be a constant value.

Two different decompilers produce results that are not incorrect, but vary a bit. 
Procyon was smart enough to analyse the code and figure out that the variables were _effectively_ final, 
so it marked them as `final` (I’d argue if it really had to).

To be honest, I had some Google Translate vibes (try translating between two languages back and forth for several times).

It seems, if my tool ever comes to life, it will be fun to use it 😛

[procyon]: https://github.com/mstrobel/procyon
[java-compiler-api]: https://docs.oracle.com/javase/8/docs/api/javax/tools/JavaCompiler.html
[asm]: https://asm.ow2.io/documentation.html
[fernflower]: https://github.com/fesh0r/fernflower