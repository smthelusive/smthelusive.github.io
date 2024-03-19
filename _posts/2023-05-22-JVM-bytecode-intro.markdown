---
layout: post
title:  "JVM bytecode: introduction"
date:   2023-05-22 12:00:00 +0200
image: bytecode_explained.png
excerpt: "Recently, I had a chance to dive deeper into the JVM bytecode than I was ever expecting. It took me tons of documentation, articles, Stack Overflow topics, and bytecode listings to gain some understanding of the JVM internals. Generating my own bytecode and making a lot of mistakes also was a very insightful experience 😀."
---
Recently, I had a chance to dive deeper into the JVM bytecode than I was ever expecting. 
It took me tons of documentation, articles, Stack Overflow topics, and bytecode listings to gain some understanding 
of the JVM internals. Generating my own bytecode and making a lot of mistakes also was a very insightful experience 😀.

My goal is to bring that knowledge to one place and publish it in small chunks as a beginner-friendly blog series.

Now I’m going to dive right into it. Have fun!

### The bytecode
Let’s take a look at the following example class written in Java:

{% highlight java %}
public class Example {
    public static void main(String[] args) {
        int a = 1;
        a++;
        int b = a * a;
        int c = b - a;
        System.out.println(c);
    }
}
{% endhighlight %}

Let’s compile it:

{% highlight text %}
javac Example.java
{% endhighlight %}

After compilation, an `Example.class` file gets generated, and it contains the JVM bytecode. 
Now we can use the `javap` tool, which shows the bytecode in a human-readable format:

{% highlight text %}
javap -c -v Example
{% endhighlight %}

This is the full output:

{% highlight text %}
Classfile Example.class
    Last modified 19 May 2023; size 413 bytes
    MD5 checksum 8a9d6decdfbf31854a85a5db5f6a06cf
    Compiled from "Example.java"
public class Example
    minor version: 0
    major version: 55
    flags: (0x0021) ACC_PUBLIC, ACC_SUPER
    this_class: #4                          // Example
    super_class: #5                         // java/lang/Object
    interfaces: 0, fields: 0, methods: 2, attributes: 1
Constant pool:
    #1 = Methodref          #5.#14         // java/lang/Object."<init>":()V
    #2 = Fieldref           #15.#16        // java/lang/System.out:Ljava/io/PrintStream;
    #3 = Methodref          #17.#18        // java/io/PrintStream.println:(I)V
    #4 = Class              #19            // Example
    #5 = Class              #20            // java/lang/Object
    #6 = Utf8               <init>
    #7 = Utf8               ()V
    #8 = Utf8               Code
    #9 = Utf8               LineNumberTable
    #10 = Utf8               main
    #11 = Utf8               ([Ljava/lang/String;)V
    #12 = Utf8               SourceFile
    #13 = Utf8               Example.java
    #14 = NameAndType        #6:#7          // "<init>":()V
    #15 = Class              #21            // java/lang/System
    #16 = NameAndType        #22:#23        // out:Ljava/io/PrintStream;
    #17 = Class              #24            // java/io/PrintStream
    #18 = NameAndType        #25:#26        // println:(I)V
    #19 = Utf8               Example
    #20 = Utf8               java/lang/Object
    #21 = Utf8               java/lang/System
    #22 = Utf8               out
    #23 = Utf8               Ljava/io/PrintStream;
    #24 = Utf8               java/io/PrintStream
    #25 = Utf8               println
    #26 = Utf8               (I)V
{
    public Example();
        descriptor: ()V
        flags: (0x0001) ACC_PUBLIC
        Code:
            stack=1, locals=1, args_size=1
                0: aload_0
                1: invokespecial #1                  // Method java/lang/Object."<init>":()V
                4: return
            LineNumberTable:
                line 1: 0

    public static void main(java.lang.String[]);
        descriptor: ([Ljava/lang/String;)V
        flags: (0x0009) ACC_PUBLIC, ACC_STATIC
        Code:
            stack=2, locals=4, args_size=1
                0: iconst_1
                1: istore_1
                2: iinc          1, 1
                5: iload_1
                6: iload_1
                7: imul
                8: istore_2
                9: iload_2
                10: iload_1
                11: isub
                12: istore_3
                13: getstatic     #2                  // Field java/lang/System.out:Ljava/io/PrintStream;
                16: iload_3
                17: invokevirtual #3                  // Method java/io/PrintStream.println:(I)V
                20: return
            LineNumberTable:
                line 3: 0
                line 4: 2
                line 5: 5
                line 6: 9
                line 7: 13
                line 8: 20
}
SourceFile: "Example.java"
{% endhighlight %}

When we write a program in Java and compile it, the compiler translates our code into JVM bytecode. 
If we write our code in Scala or any other JVM language, it will be compiled to the same bytecode format. 
The bytecode is the “code” that the JVM understands and can execute, so the task of compilers is to translate 
any code to that standard bytecode format.

Bytecode, by itself, is just an array of bytes, and it’s not readable for us humans. However, the format of 
bytecode is very strict, and each byte has a meaning. The JVM will only accept the compiled classes that comply 
with a specific format.

The `javap` tool shows the bytecode in a readable way. The bytecode operations are represented with helpful special 
aliases, such as `iload` or `istore`. The references to the special memory area called the **constant pool** are 
complemented with hints about the actual values, for example: `// Method java/io/PrintStream.println:(I)V`.

If we run `javap` with `-v` flag, we can see all the verbose information, which includes everything that is 
written in the bytecode, including the constant pool, the debug information, etc.

### Debug information
The debug information consists of three parts: the source file name, line tables, and variable tables. 
Variable tables are only necessary for debugging purposes, so they are generated only when we compile with 
debug mode enabled. To compile Java code with debug more, we should use the `-g` flag:

{% highlight text %}
javac -g Example.java
{% endhighlight %}

The source file name and line tables are present by default even when debug mode is off. 
So you can already see these parts in the bytecode:

{% highlight text %}
Compiled from "Example.java"

...

LineNumberTable:
    line 3: 0
    line 4: 2
    line 5: 5
    line 6: 9
    line 7: 13
    line 8: 20
{% endhighlight %}

The line table is the mapping of line numbers in Java code (or any other language from which the program is compiled) 
to the bytecode indices. The above example shows the line table of the main method of the `Example` class. 
In our Java code, line `4` contains the following:

{% highlight text %}
a++;
{% endhighlight %}

The line table maps line `4` of the Java code to index `2` of the bytecode `main` method `code` section:

{% highlight text %}
2: iinc          1, 1
{% endhighlight %}

This instruction increments an integer value by one.

Each method has a separate code section in the bytecode, so there is a separate line table for each method 
including the constructor.

Line tables are not super important for running the application if we’re not debugging it. 
However, when we get an exception, we can see helpful line numbers in the stack trace. 
These line numbers are available thanks to the line tables.

If we compile our class with debug mode enabled, we will also see the variable tables for each method:

{% highlight text %}
LocalVariableTable:
    Start  Length  Slot  Name   Signature
        0      21     0  args   [Ljava/lang/String;
        2      19     1     a   I
        9      12     2     b   I 
       13       8     3     c   I
{% endhighlight %}

This table contains the variable names (`Name`), types (`Signature`), the starting code index where they 
become available (`Start`), for how many code lines they are available (`Length`), and the index in the 
local variable array where the variable is stored (`Slot`).

Internally, the JVM doesn’t know about our variable names, it stores and accesses the variables by their indices. 
However, when we debug our application, we are asking to provide a value for a variable with a certain name. 
For this purpose the JVM needs to know the names too. Also, in order to request the value of a certain variable, 
the JVM needs to know exactly where it’s stored and what is the type.

### Constant pool
This whole section describes the constant pool:

{% highlight text %}
Constant pool:
    #1 = Methodref          #5.#14         // java/lang/Object."<init>":()V
    #2 = Fieldref           #15.#16        // java/lang/System.out:Ljava/io/PrintStream;
    #3 = Methodref          #17.#18        // java/io/PrintStream.println:(I)V
    #4 = Class              #19            // Example
    #5 = Class              #20            // java/lang/Object
    #6 = Utf8               <init>
    #7 = Utf8               ()V
    #8 = Utf8               Code
    #9 = Utf8               LineNumberTable
   #10 = Utf8               main
   #11 = Utf8               ([Ljava/lang/String;)V
   #12 = Utf8               SourceFile
   #13 = Utf8               Example.java
   #14 = NameAndType        #6:#7          // "<init>":()V
   #15 = Class              #21            // java/lang/System
   #16 = NameAndType        #22:#23        // out:Ljava/io/PrintStream;
   #17 = Class              #24            // java/io/PrintStream
   #18 = NameAndType        #25:#26        // println:(I)V
   #19 = Utf8               Example
   #20 = Utf8               java/lang/Object
   #21 = Utf8               java/lang/System
   #22 = Utf8               out
   #23 = Utf8               Ljava/io/PrintStream;
   #24 = Utf8               java/io/PrintStream
   #25 = Utf8               println
   #26 = Utf8               (I)V
{% endhighlight %}

The `Code` section contains the information describing what and how should be executed: 
what methods should be invoked, in which classes they reside, what constant values should be loaded in memory, 
and so on. However, certain values take too much space, so they are put in the `Constant pool`, 
and the `Code` section contains the references to them.

Let’s take a look at the first line:

{% highlight text %}
#1 = Methodref          #5.#14 // java/lang/Object."<init>":()V
{% endhighlight %}

This is the value under reference `#1`. We can see that it’s a method reference, but the value is actually 
constructed of two other references: `#5` and `#14`.

This is the `#5`:

{% highlight text %}
#5 = Class              #20 // java/lang/Object
{% endhighlight %}

It’s a class name, and the actual value is stored at `#20`:

{% highlight text %}
#20 = Utf8               java/lang/Object
{% endhighlight %}

Finally, this is the string, and the actual value is: `java/lang/Object`.

Now, let’s see what is located under `#14`:

{% highlight text %}
#14 = NameAndType #6:#7 // "<init>":()V
{% endhighlight %}

If we go through the labyrinth of `#6` and `#7` references, we will end up with this value: `“<init>”:()V`.

When we combine `#20.#6:#7` together, we will have the following: `java/lang/Object.”<init>”:()V`.

This is exactly the value that the `javap` tool nicely provides for us as a hint comment, 
so now we know where it comes from.

What does that value actually mean? It is a method descriptor. 
Internally, the JVM represents types and methods with descriptors. `java/lang/Object` specifies the class where 
the method is located, `“<init>”` is the actual method name. Normally the method names are just regular method 
names we are used to, but this particular one is an internal name for constructors. This last bit: 
`()V` describes the types that the method accepts and returns. Argument types are written within the parentheses, 
in this case there are no arguments at all. Outside the parentheses is what the method returns: 
`V` means that it returns a void type.

We can see that this value `#1` is referenced in the code section of the constructor:

{% highlight text %}
1: invokespecial #1 // Method java/lang/Object."<init>":()V
{% endhighlight %}

This is the instruction to invoke the constructor of a `java.lang.Object` class.

Let’s talk about the Code section in the [next part]({{ site.baseurl }}{% link _posts/2023-05-25-JVM-bytecode-explained.markdown %}).

{% highlight text %}{% endhighlight %}