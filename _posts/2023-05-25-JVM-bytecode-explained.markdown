---
layout: post
title:  "JVM bytecode instructions explained"
date:   2023-05-25 12:00:00 +0200
image: /assets/images/thumbnails/bytecode_explained.png
excerpt: "In the first part, we discussed the bytecode and some parts that it contains, namely debug information and constant pool. In this part, we will discuss the bytecode execution. Below is the example Java class and the verbose javap output of its bytecode. Our main focus will be on the Code section of the main method..."
---
In the [first part]({{ site.baseurl }}{% link _posts/2023-05-22-JVM-bytecode-intro.markdown %}), we discussed the bytecode and some parts that it contains, namely debug information 
and constant pool. In this part, we will discuss the bytecode execution.

Below is the example Java class and the verbose `javap` output of its bytecode. 
Our `main` focus will be on the `Code` section of the main method.

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

### Main method
Let’s take a closer look at the `main` method. 
We can already see something familiar: descriptor: `([Ljava/lang/String;)V`.

Descriptor specifies the types of the method’s arguments and its return type. 
Inside the parentheses we can see the argument types. In our case, there is only one: `[Ljava/lang/String;`.

When a type descriptor begins with `[`, it indicates an array. 
Object types follow a specific format: they start with `L` and end with `;`. In this case, 
the construction specifies a String type: `Ljava/lang/String;`.

The `V` outside the parentheses means a `void` return type of our method.

Therefore, the `main` method accepts an array of String: `[Ljava/lang/String;` and returns `void`.

Now, let’s move on to the `Code` section.

The first line we encounter is as follows:

{% highlight text %}
stack=2, locals=4, args_size=1
{% endhighlight %}

This information is required for each method:

`args_size` specifies the maximum number of slots required by the arguments of this method during program execution.

`locals` indicates the maximum number of slots needed for local variables in this method.

`stack` specifies the maximum number of slots for the operand stack required during the execution of the method’s code.

### Frames, stack, and locals
There are typically one or more threads running in our application. 
Let’s imagine the following situation: a single thread is executing the code in a method called `amazingMethod`:

{% highlight text %}
public static void amazingMethod() {
    int a = 0;
    a = 15;
    System.out.println(a);
    amazingMethod();
    // a is still 15
}
{% endhighlight %}

In this method, we create a local variable `a` of type `int` with an initial value of 0. 
Later, we modify the value of `a` to 15. When `amazingMethod` calls itself, the variable `a` still 
retains the value of 15. After the recursive call returns, `a` continues to hold the value of 15.

When we enter the recursive call and reach the first line of `amazingMethod`, it does not have access to 
the variable `a` that was previously equal to 15, even though the variable still exists. 
Instead, we create a new local variable `a` and initialize it with 0. This local variable is only visible 
and accessible within this method, specifically within a particular method call. When a method is called, 
that method call has its own status, which is stored in memory as a "frame".

In the example above, when we invoke `amazingMethod`, a frame is created and placed on top of the frame stack. 
This frame stores all the local variables for this method within this call. For example, `a` equals 15 at 
this moment, and this state is saved.

Each time when we call `amazingMethod` recursively, a new frame is created and placed on top of the previous one, 
and it stores its own local variable `a`. When the method returns, the top frame is removed, and we end up in 
a previous frame where the local variables have been waiting for us, untouched. The variable `a` still equals 15.

Local variables are stored in each frame as an array. Only the values (or references) of the variables are stored, 
not their names. When we refer to a local variable in our bytecode, we access it by its index.

Actually, the bytecode operations that accept or return values do not operate directly on the variables themselves. 
Instead, there is a special structure within each frame called the “operand stack” that the bytecode operates on. 
When we simply use a variable in our Java code, the bytecode has to care for loading the value of that variable 
into the operand stack first. The bytecode performs operations or calls methods that may return a result, and this 
result is placed on top of the operand stack. The result remains stored until we utilize it by executing another 
instruction. That instruction can also be simply writing the result into a local variable.

So, what happens when we invoke a method that accepts two integer values and returns one?

{% highlight java %}
public int sum(int a, int b) {
    return a + b;
}
{% endhighlight %}

Let’s assume we’re calling method `sum`. This method call will take the two top integer values from the operand stack. 
If these values are not present or have different types, the method call will fail. However, if these values are 
available, they will be used by the method call, and eventually, a single resulting integer value will be placed on 
top of the operand stack.

What if the value we need to use is not on the top but located deeper within the stack? There are a couple of 
bytecode instructions available to manipulate the state of the stack. For example, we can swap the two top values, 
remove the top value, or duplicate it.

As a result, what looks like a single line of Java code may require multiple bytecode instructions to achieve.

### What does our bytecode do?
For reference, here is the original Java code of the main method:

{% highlight java %}
public static void main(String[] args) {
    int a = 1;
    a++;
    int b = a * a;
    int c = b - a;
    System.out.println(c);
}
{% endhighlight %}

Below is the part of the bytecode output that includes the `Code` section of the `main` method:

{% highlight text %}
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
        13: getstatic     #2  // Field java/lang/System.out:Ljava/io/PrintStream;
        16: iload_3
        17: invokevirtual #3. // Method java/io/PrintStream.println:(I)V
        20: return
{% endhighlight %}

Let’s now go line by line and see how the local variable array and the operand stack change throughout the execution.

### Step 1

{% highlight text %}
0: iconst_1
{% endhighlight %}

`0` is the address of the start of current bytecode instruction. The instruction begins with `i`, 
indicating that `iconst` operates on an integer value. In this case, the instruction `iconst_1` is used to 
load a constant integer value of `1` onto the operand stack.

**Stack:** `int`
**Locals:** `[Ljava/lang/String;`

### Step 2

{% highlight text %}
1: istore_1
{% endhighlight %}

`istore_1` instructs to store the integer value that is currently at the top of the operand stack as a variable. 
It removes the top integer value from the operand stack and saves it in the local variable array at index `1`. 
Why not `0`? Because we are in the `main` method, which accepts one argument: an array of strings. 
The method arguments are also stored in the local variable array, so index `0` is already occupied.

**Stack:**
**Locals:** `String[], int`

### Step 3

{% highlight text %}
2: iinc 1, 1
{% endhighlight %}

`iinc` instructs to increment an integer value. The values `1, 1` specify the index of the variable to be 
incremented and the value by which it should be incremented, respectively.

**Stack:**
**Locals:** `String[], int`

### Step 4

{% highlight text %}
5: iload_1
{% endhighlight %}

Suddenly, after address `2`, we see address `5`. This shift in addresses is due to the previous operation, `iinc`, 
which had additional values provided and occupied extra space. As a result, the addresses of the subsequent 
bytecode operations got shifted. The `iload_1` instruction is used to load the integer value from index `1` in 
the local variables onto the operand stack.

**Stack:** `int`
**Locals:** `String[], int`

### Step 5

{% highlight text %}
6: iload_1
{% endhighlight %}

This instruction performs the same action as the previous instruction, once again.

**Stack:** `int, int`
**Locals:** `String[], int`

### Step 6

{% highlight text %}
7: imul
{% endhighlight %}

The `imul` operation tales two integer values from the top of the operand stack, multiplies them, 
and places the resulting integer value on top of the operand stack.

**Stack:** `int`
**Locals:** `String[], int`

### Step 7

{% highlight text %}
8: istore_2
{% endhighlight %}

This operation takes the top integer value from the operand stack and save it in a variable at index `2`.

**Stack:**
**Locals:** `String[], int, int`

### Step 8

{% highlight text %}
9: iload_2
{% endhighlight %}

This instruction loads the integer variable from index `2` onto the operand stack.

**Stack:** `int`
**Locals:** `String[], int, int`

### Step 9

{% highlight text %}
10: iload_1
{% endhighlight %}

This instruction loads the integer variable from index `1` onto the operand stack.

**Stack:** `int, int`
**Locals:** `String[], int, int`

### Step 10

{% highlight text %}
11: isub
{% endhighlight %}

This operation takes two integer values from the operand stack. 
It subtracts the integer value loaded last from the integer value loaded first. 
The resulting integer is loaded onto the operand stack.

**Stack:** `int`
**Locals:** `String[], int, int`

### Step 11

{% highlight text %}
12: istore_3
{% endhighlight %}

This operation takes the top integer value from the operand stack and stores it into a variable under index `3`.

**Stack:**
**Locals:** `String[], int, int, int`

### Step 12

{% highlight text %}
13: getstatic #2 // Field java/lang/System.out:Ljava/io/PrintStream;
{% endhighlight %}

This operation loads the value of a static field onto the operand stack. The reference `#2` directs us to 
the constant pool to determine which field exactly needs to be loaded. We immediately see which one it is 
thanks to the hint: `// Field java/lang/System.out:Ljava/io/PrintStream;`.

So, it is the static field of type `java.io.PrintStream` located in class `java.lang.System` and called out.

**Stack:** `PrintStream`
**Locals:** `String[], int, int, int`

### Step 13

{% highlight text %}
16: iload_3
{% endhighlight %}

The address of this operation is `16`, as the previous operation used a reference to the constant pool, 
which required additional space.

This operation loads the integer value stored at index `3` in the local variable array onto the operand stack.

**Stack:** `int, PrintStream`
**Locals:** `String[], int, int, int`

### Step 14

{% highlight text %}
17: invokevirtual #3 // Method java/io/PrintStream.println:(I)V
{% endhighlight %}

This instruction invokes a virtual method of an object whose reference should be located in the operand stack 
below all the arguments. The specific method being invoked is determined by the reference `#3` in the constant pool. 
The referenced value is the following: `java/io/PrintStream.println:(I)V`.

In summary, we are invoking the `println` method, which accepts an integer and returns `void`, on an instance 
of the `PrintStream` that was earlier loaded onto the operand stack. The integer value at the top of the operand 
stack is consumed by the method as an argument. The method does not return any value, but it does print something 
in the console.

**Stack:**
**Locals:** `String[], int, int, int`

### Step 15

{% highlight text %}
20: return
{% endhighlight %}

This operation returns void from the method. The top frame gets removed from the frame stack.
