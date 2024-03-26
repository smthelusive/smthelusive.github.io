---
layout: post
title:  "Java 21: So How Should We Construct Strings Now?"
date:   2023-08-18 12:00:00 +0200
image: /assets/images/thumbnails/java_21_strings.png
excerpt: "Java 21 brings in a lot of cool features, and one of them is the preview of String Templates*. While it serves more purposes than just classic String interpolation, for us Java developers, it’s yet another way to concatenate Strings in a “proper” way..."
---
Java 21 brings in a lot of cool features, and one of them is the preview of String Templates*. 
While it serves more purposes than just classic String interpolation, for us Java developers, 
it’s yet another way to concatenate Strings in a “proper” way.

What is _proper_, though? I poked around the bytecode and learned some interesting and surprising things 
about different String concatenation and interpolation techniques in modern Java.

I’ve also compared it with the Kotlin way (under the hood) 😏.

But let’s begin with Java.

### `+` operator
We’ve always known that using a `+` operator is bad practice since Strings are immutable, and under the hood, 
a new String gets instantiated for every part we concatenate. However, as they say in Dutch, “meten is weten,” 
which means “measuring is knowing.” Let’s see what is _really_ happening inside:

{% highlight java %}
// example #1:
String example1 = "some String " + 42;

// example #2:
int someInt = 42;
String example2 = "some String " + someInt + " other String " + someInt;

// example #3:
String example3 = "";
for (int i = 0; i < 10; i++) {
    example3 += someInt;
}
{% endhighlight %}

In the bytecode, example #1 translates into a single String allocation. Java compiler is smart enough to see that the magic number is constant, so it is loaded as part of the String onto the operand stack:

{% highlight text %}
0: ldc     #7  // String some String42
{% endhighlight %}

Of course, we don’t want to use the magic values, so let’s see what happens with the variables.

In example #2, the Java compiler can’t perform the same optimisation when we’re using a variable, 
but it does some advanced stuff with `invokedynamic`:

{% highlight text %}
0: bipush        42
2: istore_1
3: iload_1
4: iload_1
5: invokedynamic #7,  0  // InvokeDynamic #0:makeConcatWithConstants:(II)Ljava/lang/String;

...

BootstrapMethods:
0: #22 REF_invokeStatic java/lang/invoke/StringConcatFactory.makeConcatWithConstants:(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;
Method arguments:
#23 some String \u0001 other String \u0001
{% endhighlight %}

This instruction allows bootstrapping the method at runtime that needs to be called for concatenation. 
We’re giving it a recipe: `some String \u0001 other String \u0001`, which in this case, contains two placeholders. 
If we concatenate more variables, there will be more placeholders, but it will still be a single String in the 
Constant Pool.

The cool thing about `invokedynamic` approach is that when the newer JDK versions appear with newer concatenation 
techniques, the bytecode can stay the same while the bootstrap method does something more advanced 
(more on the current implementation a bit later).

What about example #3? In this case, the following instruction will be executed in a loop:

{% highlight text %}
16: invokedynamic #9,  0  // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;I)Ljava/lang/String;
{% endhighlight %}

This will lead to unnecessary amounts of String instances being allocated.

### String::format
I had a preconception that `String::format` is a better alternative to the `+` operator. 
This method can indeed offer improved readability in some cases and supports localization. 
Some basic benchmarking shows slightly better performance compared to concatenation. However, 
implementing the `format` method creates a new String for each parameter.

Let’s run a small experiment:

{% highlight java %}
int firstValue = 12345;
int secondValue = 987654321;
int thirdValue = 117117;
String test = String.format("test %s and %s and %s", firstValue, secondValue, thirdValue);
{% endhighlight %}

In the bytecode, we’re placing all the values on the operand stack and simply invoking a static method:

{% highlight text %}
34: invokestatic  #15  // Method java/lang/String.format:(Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/String;
{% endhighlight %}

Now, let’s look at the heap dump taken after this method is invoked. 
For that, let’s compile the program and run it with the garbage collector disabled 
(so it doesn’t collect the String instances before we can take a look at them):

{% highlight text %}
javac --enable-preview --source=21 Main.java
java --enable-preview -XX:+UnlockExperimentalVMOptions -XX:+UseEpsilonGC Main
{% endhighlight %}

I am using VisualVM to create a heap dump. In the String instances section, I can see the following values:

![](/assets/images/concat_strings/screenshot_1.png)

### Java newest String templates
The new String template feature is good, but not because it uses memory efficiently. 
Actually, for basic cases, it behaves exactly the same as String concatenation under the hood. 
It utilizes the `invokedynamic` instruction passes the recipe over to the bootstrap method allowing it to do its magic.

The String templates are amazing because they can redefine the way of template processing and allow us 
to create other types besides String (if we want to). I enjoyed reading this [article][article] 
that tells more about it.

### `invokedynamic` approach

We figured out that `invokedynamic` is used for most of the modern String concatenation/interpolation 
techniques in Java.

Is it perfect? In terms of redundant String allocation, it’s not.

We’ve seen that we’re passing the recipe (template with placeholders) as a single String. 
Now, if the values that have to be inserted into the placeholders are coming from the Constant Pool 
(the `\u0002` placeholder code), then there will be no extra Strings allocated.

On the other hand, if we’re using normal variables, the placeholder code will be `\u0001`. 
In this case, at runtime, the bootstrap method creates a separate String instance for every 
piece between placeholders, and these Strings are combined with the parameters to construct a final String.

To see the proof of that, let’s consider this small example:

{% highlight java %}
int firstValue = 12345;
int secondValue = 987654321;
int thirdValue = 117117;

// alright, we can use the fancy string templates:
String test = STR."test \{firstValue} and \{secondValue} and \{thirdValue}";

// but this line would result in exactly identical bytecode:
// String test = "test " + firstValue + " and " + secondValue + " and " + thirdValue;
{% endhighlight %}

In the bytecode, we see the `invokedynamic` with the single String which contains the recipe:

{% highlight text %}
13: invokedynamic #9,  0  // InvokeDynamic #0:makeConcatWithConstants:(III)Ljava/lang/String;

...

BootstrapMethods:
    0: #27 REF_invokeStatic java/lang/invoke/StringConcatFactory.makeConcatWithConstants:(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;
        Method arguments:
            #25 test \u0001 and \u0001 and \u0001
{% endhighlight %}

If we run the program with the garbage collector disabled and take the heap dump, we will see the following String 
instances (plus the resulting String, of course):

![](/assets/images/concat_strings/screenshot_2.png)

For comparison, if we used the `StringBuilder` instead, it would look like this:

{% highlight java %}
String test = new StringBuilder()
    .append("test ")
    .append(firstValue)
    .append(" and ")
    .append(secondValue)
    .append(" and ")
    .append(thirdValue)
    .toString();
{% endhighlight %}

There would be only one `“ and “` value allocated even if we type it in twice. 
There will be three String instances: two fragments and the result.

### What about Kotlin?
I apologize for the lack of fun in this section, but Kotlin (1.9.0) behaves similarly to Java under the hood. 
The `+` operator as well as the `plus()` function and String interpolation syntax (for example, 
`val testStr = “this is $testNum test”`) all use `invokedynamic`.

Some versions ago, both Java and Kotlin were using `StringBuilder` internally to optimize String concatenation. 
Now they use `invokedynamic`, which allows to split the concatenation logic away from the bytecode 
(it’s sitting in the bootstrap and target methods). The implementation will probably evolve, and other 
JVM languages can benefit from it without making any changes (or with minor changes).

### Conclusion
Regarding best practices, we probably don’t want to go against conventions. But we do want to know what’s 
happening inside.

What should we use? I only have the classic answer to this: it depends!

Perhaps, it’s not too bad to use regular `+` operator sometimes? Maybe it does look more readable 
in some cases (teeny tiny percent).

If we care about efficiency, we‘re better off using a `StringBuilder` or a `StringBuffer`. 
`StringBuffer` also gives all kinds of thread safety. `String::format` seems to work somewhat fast,
but `StringBuilder` is a lot faster. The downside of `StringBuilder` is verbosity.

If we’re not too concerned about memory and speed but want to use powerful help in formatting and readability, 
String templates will be a great choice. Remember that they might become more efficient in newer versions 
and are much more than just a String interpolation mechanism.

Thank you for reading.

-----

\* The [String Templates][string-templates] are a Preview feature in Java 21. 
This means that this feature is still being tested by the community; it’s not final and may 
change in the next versions. I’m not suggesting using preview features in production, but simply 
inviting you to analyse it alongside other concatenation techniques from the perspective of the internal workings.


[article]: https://medium.com/@benweidig/looking-at-java-21-string-templates-17d9f655e7f3
[string-templates]: https://openjdk.org/jeps/430