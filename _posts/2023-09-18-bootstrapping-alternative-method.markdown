---
layout: post
title:  "Java Invokedynamic: Bootstrapping an Alternative Method"
date:   2023-09-18 12:00:00 +0200
image: alternative_bootstrap.png
excerpt: "This experiment intends to demonstrate the power of the invokedynamic instruction in JVM. This instruction is used for different pieces of Java functionality these days, such as switch statements, lambdas, and many cases of String concatenation..."
---
This experiment intends to demonstrate the power of the `invokedynamic` instruction in JVM. 
This instruction is used for different pieces of Java functionality these days, such as switch statements, 
lambdas, and many cases of String concatenation.

The idea is that, in the bytecode of our compiled class, `invokedynamic` points to some specific `Bootstrap Method`, 
which at runtime can choose a target method to be invoked. This way, we can have compact bytecode without even 
knowing, for example, which method concatenates Strings for us. If newer Java versions improve performance 
or add more alternative methods to choose from, we won’t need to do anything to benefit from them.

### Redefining the Bootstrap method
Can we redefine the Bootstrap Method and invoke another target method at runtime? 
My experiment proves that it’s possible, although clearly, we shouldn’t ever want to do this :). 
It’s not intended for any real-life situations.

### The case of String concatenation
As I mentioned, String concatenation is widely leveraged by `invokedynamic`. Depending on the number of parts 
to concatenate and their types, the behaviour can differ.

Let’s consider the following example:

{% highlight java %}
public class Test {
    public static void main(String[] args) {
        String test = "something";
        System.out.println("something lalala something else " + test);
    }
}
{% endhighlight %}

When we compile this class and check the bytecode, we see the `invokedynamic` instruction in the `Code` 
section of our `main` method:

{% highlight text %}
...

0: ldc           #7       // String something
2: astore_1
3: getstatic     #9       // Field java/lang/System.out:Ljava/io/PrintStream;
6: aload_1
7: invokedynamic #15,  0  // InvokeDynamic #0:makeConcatWithConstants:(Ljava/lang/String;)Ljava/lang/String;
12: invokevirtual #19     // Method java/io/PrintStream.println:(Ljava/lang/String;)V
15: return

...

BootstrapMethods:
0: #36 REF_invokeStatic java/lang/invoke/StringConcatFactory.makeConcatWithConstants:(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;
    Method arguments:
        #34 something lalala something else \u0001
...
{% endhighlight %}

In the `BootstrapMethods` section, we see which method exactly is responsible for determining the dynamic behaviour: 
`StringConcatFactory.makeConcatWithConstants`.

Without going into too much detail, the functionality triggered by this method involves checking some parameters 
and their types. It then looks up the `MethodHandle` of a specific method and wraps it in a `CallSite` instance. 
Then, the found method is invoked via the JVM mechanisms.

`StringConcatFactory` is all about this bootstrapping logic. Most of the target methods it finds in the 
end are in `StringConcatHelper` class.

For example, this is the body of method `simpleConcat`, which will be called for our specific use case 
(for concatenating a constant `String` and a variable of non-primitive type):

{% highlight java %}
private static MethodHandle simpleConcat() {
    MethodHandle mh = SIMPLE_CONCAT;
    if (mh == null) {
        MethodHandle simpleConcat = JLA.stringConcatHelper("simpleConcat",
        methodType(String.class, Object.class, Object.class));
        SIMPLE_CONCAT = mh = simpleConcat.rebind();
    }
    return mh;
}
{% endhighlight %}

It looks up the method `StringConcatHelper::simpleConcat`, which accepts two `Object` arguments, 
and returns a `String`. At the moment when the target method is invoked, there will be two Objects 
sitting on top of our operand stack. We can also cheat a bit because we know that, in our case, 
these Objects will be Strings.

### How do we use this knowledge?
Can we override the body of this method and look up some other `MethodHandle`? Of course we can! But we should keep 
in mind that the signatures should match. Or, if they don’t match, we can manually inject some extra arguments.

I thought it would be fun to look up the `String::replaceAll` method. Unlike the original method that is called, 
it’s not a static method. Both of our Strings will come in as method arguments for the original method. 
However, for `replaceAll`, the first String will be the owner Object reference, and the second one will come 
in as the first method argument (replace what). We are missing the second argument (replacement), but we can 
inject this one ourselves.

### Looking up some other MethodHandle
This code does the job:

{% highlight java %}
MethodHandles.Lookup lookup = MethodHandles.lookup();
MethodType mt = MethodType.methodType(String.class, String.class, String.class);
MethodHandle mh = lookup.findVirtual(String.class, "replaceAll", mt);
return MethodHandles.insertArguments(mh, 2, "^_^");
{% endhighlight %}

We can test what this does with a simple example:

{% highlight java %}
mh.invoke("rrrrr aaa fffff", "aaa");
{% endhighlight %}

As a result, it will replace all `“aaa”` in `“rrrrr aaa fffff”` with cute smileys `“^_^”`, 
so we will end up with `“rrrrr ^_^ fffff”`.

### The bytecode
To override the method in `StringConcatFactory` class, we will need to manipulate the bytecode. 
The above code that we want to use as the new body for `simpleConcat` method results in this bytecode:

{% highlight text %}
0: invokestatic  #35  // Method java/lang/invoke/MethodHandles.lookup:()Ljava/lang/invoke/MethodHandles$Lookup;
3: astore_0
4: ldc           #41  // class java/lang/String
6: ldc           #41  // class java/lang/String
8: iconst_1
9: anewarray     #43  // class java/lang/Class
12: dup
13: iconst_0
14: ldc           #41 // class java/lang/String
16: aastore
17: invokestatic  #45 // Method java/lang/invoke/MethodType.methodType:(Ljava/lang/Class;Ljava/lang/Class;[Ljava/lang/Class;)Ljava/lang/invoke/MethodType;
20: astore_1
21: aload_0
22: ldc           #41 // class java/lang/String
24: ldc           #51 // String replaceAll
26: aload_1
27: invokevirtual #53 // Method java/lang/invoke/MethodHandles$Lookup.findVirtual:(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;
30: astore_2
31: aload_2
32: iconst_2
33: iconst_1
34: anewarray     #2  // class java/lang/Object
37: dup
38: iconst_0
39: ldc           #59 // String  ^_^
41: aastore
42: invokestatic  #61 // Method java/lang/invoke/MethodHandles.insertArguments:(Ljava/lang/invoke/MethodHandle;I[Ljava/lang/Object;)Ljava/lang/invoke/MethodHandle;
45: areturn
46: astore_0
47: aconst_null
48: areturn
{% endhighlight %}

### The plan
To achieve my goal, I need to:
- Create a Java Agent that redefines the Bootstrap Method. When running a test program, we can simply specify a `javaagent` that we want to hook into the JVM. The Java Agent then does its dirty job before the invocation of the `main` method of our test program.
- Java 21 has a beautiful (internal) [Class-File API][class-file-api] for manipulating bytecode. Pretty cool thing, by the way! I’m looking forward to it coming out. We will try and use it to override a method body.

### Simplest Java agent
Java `Agent`s and `Instrumentation` give a lot of possibilities, such as transformation of classes when they are 
loaded, access to `ClassLoader` information and many more.

We will make a very simple Java Agent. We will create a class that implements this method:

{% highlight java %}
public static void premain(String agentArguments, Instrumentation instrumentation) {}
{% endhighlight %}

This method, as the name suggests, is triggered before the `main` method of our test program. 
Once the implementation is done, we will specify some settings in the manifest file and create a `jar` package. 
Finally, we can use the `jar` package as a `javaagent` when we run the JVM.

Alternatively, we could have created a class transformer and added it via `Instrumentation`:

{% highlight java %}
instrumentation.addTransformer(new BootstrapStringConcatTransformer(), true);
{% endhighlight %}

Then, our class transformer `BootstrapStringConcatTransformer` would be triggered for 
all classes that get loaded. However, our target class is not loaded before runtime because, 
before runtime, the JVM doesn’t even know what `invokedynamic` will need! So, we will need to load 
the class of interest ourselves and then redefine it.

### Class-File API
There aren’t a lot of docs for the Class-File API yet. 
This API is not exposed to the world yet, but it’s interesting to try it out! 
[This][class-file-api] is the only good example of usage that I found. 
To be able to use it, we have to add the `--add-exports` option to use the closed `jdk.internal.*` packages.

After playing with it a bit, I got to the following code, which is not polished, but it works:

{% highlight java %}
public static void premain(String agentArguments, Instrumentation instrumentation) throws ClassNotFoundException, IOException, UnmodifiableClassException, URISyntaxException {
Class clazz = Class.forName("java.lang.invoke.StringConcatFactory"); // here we actually load the class
ClassModel classModel = Classfile.parse(Path.of(clazz.getResource("StringConcatFactory.class").toURI()));

    var bytes =  Classfile.build(classModel.thisClass().asSymbol(), classBuilder -> {
        for (ClassElement classElement : classModel) {
            if (classElement instanceof MethodModel methodModel &&
                    methodModel.methodName().equalsString("simpleConcat")) {
                classBuilder.withMethod(methodModel.methodName(), methodModel.methodType(),
                        methodModel.flags().flagsMask(), methodBuilder -> {
                            methodBuilder.withCode(codeBuilder -> {
                                var stringClassEntry = classBuilder.constantPool().classEntry(classBuilder.constantPool().utf8Entry("java/lang/String"));
                                // using the beautiful API below, I pretty much wrote the bytecode above 1:1 to the code
                                codeBuilder
                                        .invokestatic(ClassDesc.of("java.lang.invoke.MethodHandles"),
                                                "lookup", MethodTypeDesc.ofDescriptor("()Ljava/lang/invoke/MethodHandles$Lookup;"))
                                        .astore(0)
                                        .ldc(stringClassEntry)
                                        .ldc(stringClassEntry)
                                        .iconst_1()
                                        .anewarray(classBuilder.constantPool().classEntry(classBuilder.constantPool().utf8Entry("java/lang/Class")))
                                        .dup()
                                        .iconst_0()
                                        .ldc(stringClassEntry)
                                        .aastore()
                                        .invokestatic(ClassDesc.of("java.lang.invoke.MethodType"),
                                                "methodType", MethodTypeDesc.ofDescriptor("(Ljava/lang/Class;Ljava/lang/Class;[Ljava/lang/Class;)Ljava/lang/invoke/MethodType;"))
                                        .astore(1)
                                        .aload(0)
                                        .ldc(stringClassEntry)
                                        .ldc(classBuilder.constantPool().stringEntry("replaceAll"))
                                        .aload(1)
                                        .invokevirtual(ClassDesc.ofDescriptor("Ljava/lang/invoke/MethodHandles$Lookup;"), "findVirtual",
                                                MethodTypeDesc.ofDescriptor("(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;"))
                                        .astore(2)
                                        .aload(2)
                                        .iconst_2()
                                        .iconst_1()
                                        .anewarray(classBuilder.constantPool().classEntry(classBuilder.constantPool().utf8Entry("java/lang/Object")))
                                        .dup()
                                        .iconst_0()
                                        .ldc(classBuilder.constantPool().stringEntry("^_^"))
                                        .aastore()
                                        .invokestatic(ClassDesc.of("java.lang.invoke.MethodHandles"),
                                                "insertArguments", MethodTypeDesc.ofDescriptor("(Ljava/lang/invoke/MethodHandle;I[Ljava/lang/Object;)Ljava/lang/invoke/MethodHandle;"))
                                        .areturn()
                                        .astore(0)
                                        .aconst_null()
                                        .areturn();
                            });
                        });
            }
            else classBuilder.with(classElement);
        }
    });
    // this is useful for debugging the result as the decompiled code:
    Files.write(new File("lalala.class").toPath(), bytes);
    instrumentation.redefineClasses(new ClassDefinition(clazz, bytes));
}
{% endhighlight %}

### Packaging the agent
I compiled the Java Agent code with these options:

{% highlight text %}
javac --add-exports java.base/jdk.internal=ALL-UNNAMED --add-exports java.base/jdk.internal.classfile=ALL-UNNAMED --add-exports java.base/jdk.internal.classfile.instruction=ALL-UNNAMED --add-exports java.base/jdk.internal.classfile.constantpool=ALL-UNNAMED smthelusive/Main.java
{% endhighlight %}

Then, I created the manifest with the following settings:

{% highlight text %}
Manifest-Version: 1.0
Premain-Class: smthelusive.Main
Can-Retransform-Classes: true
Can-Redefine-Classes: true
{% endhighlight %}

And packaged a `jar`:

{% highlight text %}
jar cfm fakebootstrapagent.jar META-INF/MANIFEST.MF smthelusive/
{% endhighlight %}

### Testing the result
For reference, this is our test program again:

{% highlight java %}
public class Test {
    public static void main(String[] args) {
        String test = "something";
        System.out.println("something lalala something else " + test);
    }
}
{% endhighlight %}

Let’s test our program without `javaagent` using the `java Test` command. This is the result:

{% highlight text %}
something lalala something else something
{% endhighlight %}

Now, let’s attach our `javaagent` (unfortunately, we need to keep all the package opening options for it to work):

{% highlight text %}
java --add-exports java.base/jdk.internal=ALL-UNNAMED --add-exports java.base/jdk.internal.classfile=ALL-UNNAMED --add-exports java.base/jdk.internal.classfile.instruction=ALL-UNNAMED --add-exports java.base/jdk.internal.classfile.constantpool=ALL-UNNAMED -javaagent:fakebootstrapagent.jar Test
{% endhighlight %}

Here’s the result:

{% highlight text %}
^_^ lalala ^_^ else 
{% endhighlight %}

The concatenation is no longer concatenating 😛.

### Final Thoughts
Would have been fun to replace the target method with some custom method, right? Unfortunately, 
that didn’t work out for me. I tried providing my custom method packaged in a `jar` through `Instrumentation` 
(yes, it’s also possible) so it’s available for bootstrap `ClassLoader`.

This code would be accessible by any code in my Test program. However, JDK internal code isn’t allowed 
to access the code I provide. If you know the options to “make it allowed,” please let me know.

I have also tried to add an extra method in the `StringConcatHelper` class, but it’s impossible to 
add any methods or change the signatures of existing ones. The reason is that the class is already loaded now, 
and the class data is stored in appropriate memory slots.

You may be wondering, why did I try this in the first place? Because, why not? Thank you for your attention, 
and stay tuned for the next JVM torturing episodes!

[class-file-api]: https://openjdk.org/jeps/8280389
