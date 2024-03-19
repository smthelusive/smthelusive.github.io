---
layout: post
title:  "The Hidden Dynamic Life of Java"
date:   2023-11-13 12:00:00 +0200
image: indy.png
excerpt: "This article is an (elaborate) transcript of my talk, ‘The Hidden Dynamic Life of Java’, presented on J-Fall 2023..."
---
This article is an (elaborate) transcript of my talk, [‘The Hidden Dynamic Life of Java’][talk], 
presented on [J-Fall][j-fall] 2023.

![](/assets/images/indy/compilation.png)

It seems like a really smart idea, right? Having the possibility to host many different 
languages on top of the JVM, which, during compilation, get translated into the standard bytecode format. 
The JVM doesn’t care what the source language is, as long as the class file is valid.

![](/assets/images/indy/jvm_inspects.png)

JVM checks that the format of the class file corresponds to the expected format. Only then will it load and execute the program.

Designing such system is smart; however, it wasn’t designed with this idea in mind. Initially, the JVM was meant to host only one language — Java.

![](/assets/images/indy/java+jvm.png)

That means that some of the limitations of Java also constrained the JVM in the same way.

### Statically vs dynamically typed languages

![](/assets/images/indy/dynamic_static.png)

Java is a statically typed language. What does that mean? 
In statically typed languages, all code gets checked during compile time in order to verify all the types. 
If the types are incorrect, the compilation will fail, and we won’t even get to the point of invalid bytecode.

For example, if we have an instance of type `String` and attempt to invoke a method on this instance 
that belongs to another type, such as `StringBuilder`, clearly that won’t be valid. The typing is very strict; 
even if we were to generate an invalid class file using special tools, the JVM would throw it up before 
even trying to execute. The advantage of this approach is the short feedback loop and the trust that we 
have in our code at runtime.

In dynamically typed languages, types might be not specified in the code at all. 
Only at runtime will we see if the values we’re actually getting correspond to the types we’re expecting. 
That can lead to many unpredictable situations at runtime.

Because Java is a statically typed language, it also implies that the JVM was designed to host a 
statically typed language. It’s designed to deal with class files where everything is checked in 
terms of types before the runtime. One might think, is it impossible to build a dynamically typed 
language on the JVM then?

As we know, there were a lot of JVM languages emerging, including dynamically typed ones. 
Here are just a few examples:

![](/assets/images/indy/dynamic_languages.png)

The creators of dynamically typed languages faced challenges in circumventing the limitations. 
Specifically, they had to address method invocation in situations where the type of an instance that owns 
the method is unknown at compile time.

### Possible workarounds
Let’s consider this example:
{% highlight python %}
def absolute(num):
return num.__abs__()

print(absolute(-1))
print(absolute("a"))
{% endhighlight %}

This is a valid piece of Python code. We’re not specifying neither the return type, 
nor the type of the argument. However, inside the `absolute` function, we assume, 
that argument `num` is numeric, and we call a `__abs__` function on it. At runtime, we can call our 
function with a numeric value, and it will be fine. We can also call it with a `str` value, and it will fail.

Imagine you’re a language creator, and you want to make this piece of code runnable on the JVM. 
How would you work around the limitations?

One possible solution is to create a language-specific type that covers all possible types you might have. 
Under the hood, in the bytecode, you would have something like this:

{% highlight java %}
public static SuperType abs(SuperType num) {
    return num.abs();
}

public static void main(String[] args) {
    SuperType result1 = abs(SuperType.of(-2));
    SuperType result2 = abs(SuperType.of("a"));
}
{% endhighlight %}

`SuperType` becomes your global language-specific type. 
You accept it as the type of your argument, you return it. 
In this case, you would need to implement all possible methods that you might want to call 
on any of your types, and they all should be implemented in your `SuperType` class. 
That might be challenging, as it’s hard to know in advance all possible methods you want to have in your types. 
You’ll also need to consider how to convert Java types into a `SuperType`, etc.

This is a possible workaround, but it’s quite an ugly one. 
Other potential solutions involve reflection or additional interpreters, 
but they come with their own limitations and are often slow.

Still, those who were building the dynamically typed languages on JVM, had to use them. Until…

### Introduction of invokedynamic (indy)

![](/assets/images/indy/invokedynamic.png)

`invokedynamic` is a bytecode instruction introduced to support the dynamically typed languages on JVM. 
Let’s see some other instructions for method invocation and understand how `invokedynamic` is different.

In JVM, there are also `invokevirtual`, `invokestatic`, `invokespecial`, and `invokeinterface`. 
Let’s take a closer look at two of them that are very commonly used.

### Invokevirtual
`**invokevirtual**` is used when we would like to invoke a method of some instance. 
Before using this instruction, we should put a reference to the instance that owns this method on top 
of the operand stack. Afterwards, we have to put all the arguments on top of the operand stack as well, 
ensuring they all have the correct types. When we use the `invokevirtual`, we specify the type where the 
method is located, the method name, the types of the arguments, and return type:

![](/assets/images/indy/screenshot_1.png)

So, in this case, we put a reference stored in a static field `System.out` onto the stack. 
Its type is `PrintStream`. Afterward, we place the constant `String` value on top of the stack, 
which will be the argument that the method accepts. When we use `invokevitual`, we specify 
that the method’s name is println, the method is located inside `PrintStream`, 
it accepts a single argument of type `String`, and returns `void`. It’s not possible to use `invokevirtual` 
without this diligent specification of all these details, so for dynamically typed languages it’s not usable.

### Invokestatic
`**invokestatic**` does a similar job. The only difference is that we’re invoking a static method, 
so there is no instance that owns it. That means we don’t need to place any reference of the owner 
instance onto the stack. Still, we have to place all the arguments there:

![](/assets/images/indy/screenshot_2.png)

For the `invokestatic` instruction, we also need to specify the type where the method is located, 
along with the method name and all the types. In this case, the method belongs to the `String` type, 
its name is `valueOf`, and it accepts an int while returning a `String`.

### How is indy different?
As in the previous examples, the `**invokedynamic**` instruction also requires you to provide 
the arguments onto the stack. However, it doesn’t require you to specify either where the method 
is located or its name. We are only specifying that eventually, we would like to call a method that 
accepts an `int` and returns a `String`. We are also specifying some method name `makeConcatWithConstants`, 
but in this case, it’s arbitrary and won’t play any role.

![](/assets/images/indy/screenshot_3.png)

The crucial element is the reference `#0`, which points to another section in 
the bytecode called `BootstrapMethods`. A bootstrap method is a method that makes a decision 
at runtime about which target method we would like to invoke. This means that at compile time, 
we don’t even know where that method is located and how it’s called, but the bytecode is still valid!

![](/assets/images/indy/indy_diagram.png)

When the JVM executes the bytecode and encounters the `invokedynamic` instruction, 
it invokes the bootstrap method. The bootstrap method performs some logic (which can include generating 
synthetic code, among other things), and ultimately, it looks up a `MethodHandle` for the method that needs 
to be invoked. A `MethodHandle` is a mechanism, similar to reflection but faster, that provides a direct 
reference to the method. The JVM then links that target method handle to the specific `invokedynamic` instruction 
and invokes the target method.

When the JVM encounters this particular `invokedynamic` instruction again, if nothing has changed, 
it directly invokes the linked target method. The method handle lookup doesn’t happen again in this case.

### Alright, back to Java
This provides a lot of possibilities for creators of dynamically typed languages, but I promised to talk about Java.

![](/assets/images/indy/clouds.png)

It turns out that `invokedynamic` is often used by the Java compiler, 
so there are more and more use-cases where we can find it in the bytecode generated by `javac`.

Let’s take a look at some of them.

### String concatenation
In Java, `invokedynamic`(indy) is used for some cases of String concatenation. 
Of course, when we're concatenating constant values, the compiler optimizes the entire 
concatenation away. However, if we're dealing with non-final variables, we will find `invokedynamic` in the bytecode.

![](/assets/images/indy/screenshot_4.png)

In the example above, we’re concatenating two String variables. 
In the bytecode, we place both references to them onto the operand stack. 
Then, we use indy, where we say that we want to find a target method at runtime, 
and that method will accept two Strings and return a String.

In the `BootstrapMethods` section, we use the `StringConcatFactory::makeConcatWithConstants` method. 
It accepts many arguments, most are automatically filled in by the JVM. 
We can also provide some arguments through `Method arguments`. In this case, we’re providing a “recipe”, 
which is kind of a template with placeholders for parameters. This way, we provide information to 
the Bootstrap Method on how exactly we’d like to concatenate the elements.

What does the Bootstrap Method do? This is some of its logic:

![](/assets/images/indy/screenshot_5.png)

It turns out that both unary and binary concatenations can go through a faster implementation than other cases. 
We have two elements, both being parameters and non-primitive and non-null values, so we lookup a `simpleConcat` 
method for them. This method performs basic byte array manipulations, similar to how `StringBuilders` work.

What did indy give us in this case? The ability to make a decision at runtime: determine which logic is more 
performant for this use-case and eliminate unnecessary logic at all.

### Pattern matching for switch
In the newest Pattern Matching for Switch, we’re also using the `invokedynamic`! 
We now have the ability to switch over different types:

![](/assets/images/indy/screenshot_6.png)

Here, we have `String` and `Integer` types, and there could be more. 
We can also use guard conditions, in which case the types might be repeated. 
But what is happening under the hood?

![](/assets/images/indy/screenshot_7.png)

The task of the target method here is to return an integer. 
That integer value helps the next instruction to find the location in the bytecode where to jump 
and execute some block of code. That’s it.

We provide the arguments to the bootstrap method, which is simply a list of all types 
we’re switching over. For each type, the bootstrap method looks up a method handle for a 
method that does type checking for that particular type, and these method handles are then 
combined in a chain and encapsulated into a final `MethodHandle`. When invoked at runtime, this 
final `MethodHandle` executes all the checks for all the types, and depending on these checks, 
it calculates the integer value to return.

In summary, we have a dynamic decision-making logic that is executed at runtime.

### Lambdas
The most exciting part where indy is used in Java is with Lambdas.

When we define a lambda body, we’re essentially implementing a functional interface 
(an interface with a single abstract method). Indy allows us to have a synthetic class that 
implements that method with whatever implementation we provide as the lambda body. 
Then, we can get instances of this implementation whenever needed, and all of this happens at runtime! 
No extra classes are generated during compilation.

Let’s take a look at this example:

![](/assets/images/indy/screenshot_8.png)

Here, our functional interface is `Consumer`. We use `invokedynamic`, specifying that we want the 
`accept` method to be implemented with the code from the lambda body.

At runtime, the bootstrap method creates a synthetic class that implements the `accept` method of `Consumer`. 
The target method handle that the bootstrap method gives us back is simply a factory, which returns an 
instance of this `Consumer` implementation whenever we hit this `invokedynamic` instruction. 
Afterward, we can provide this instance to the `forEach` method.

In this case, we specify that we want the `accept` method to do what `System.out::println` does, 
so we simply provide a reference to that method as an argument. Alternatively, we could use a custom block of code. 
In that case, during compilation, that block of code would be placed in a separate method, and we would provide 
a reference to that method.

In summary, indy allows us to generate code only in the case when the lambda is actually hit and only once. 
Moreover, we're not polluting our bytecode with all the extra classes because all of this is taken care of 
during runtime.

### What about AOT?
As we know, AOT compilation doesn’t like any dynamic behavior because all possible invocations should be known ahead of time.

Consider GraalVM native image, for instance. If there’s anything dynamic, such as reflection, 
we also have to provide a configuration where we specify all the possible methods that could be 
called through reflection at runtime.

How does the `invokedynamic` work then?

Well, anything that `javac` (as well as the Kotlin compiler) places in the bytecode 
is supported by GraalVM out of the box. These cases are known, and there’s a limited amount of them, 
so GraalVM simply takes them into account inside the logic of native image creation.

If you’re building a new compiler, you probably want to establish some agreements about such support. 
If you’re manipulating the bytecode, be careful (and not too creative) when playing with the 
`invokedynamic` instruction; otherwise, the produced bytecode might fail inside the native image.

### Final words

![](/assets/images/indy/conclusions.png)

After playing with `invokedynamic` for several months... I have finally stopped asking myself ‘why’. 
Why is it good for Java? What are the benefits?

Indy helps us reduce the **complexity** of the bytecode. We save **space** by not polluting our 
bytecode with all the things that are not even related to our program, such as all the language logic. 
The logic becomes more and more complicated with the newer versions of Java, 
so it’s good to have it **abstracted away**.

The implementation of some language features can improve from version to version, 
and we **don’t even need to change the bytecode** (rebuild the project) to benefit from them. 
We won’t even notice that something has changed, but the program might become more **performant**.

Believe me, the implementation of language features does change. For pattern matching, I looked at how 
it worked in the Java 21 Early Access version, and then I looked again when Java 21 was actually released. 
The implementation was completely different… and yet, the bytecode remained the same.

Can there be any downsides? Of course. The **predictability** of our program might decrease without 
us making any changes. Perhaps the previous implementation of String concatenation was less performant 
but gained performance by taking up more space? By putting more String instances onto the heap? 
That might be the case, as the previous implementation of String concatenation used `StringBuilders`, 
and now it’s different.

Things might change for better or worse, but, of course, all these changes are intended to benefit us in future versions.

### Resources
I was heavily relying on this [article][oracle] when I spoke about dynamically typed languages on JVM. 
Take a look if you’re interested to dig deeper into the topic.

[j-fall]: https://jfall.nl/
[talk]: https://sessionize.com/s/nataliia-dziubenko/the-hidden-dynamic-life-of-java/76482
[oracle]: https://www.oracle.com/technical-resources/articles/javase/dyntypelang.html?source=post_page-----12ba9bf95a44--------------------------------