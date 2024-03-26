---
layout: post
title:  "Java 20 Pattern Matching for Switch: What’s Under the Hood?"
date:   2023-06-10 12:00:00 +0200
image: /assets/images/thumbnails/pattern_matching.png
excerpt: "Pattern matching for switch statements and expressions has evolved as the latest releases unveiled. We can already play with the most exciting changes, such as pattern guards and record patterns, in the Java 19 and 20 preview versions..."
---

_Note: this article is written before Java 21 was released. In Java 21 and newer, the bootstrap method works slightly
differently, while the general idea is similar._

Pattern matching for switch statements and expressions has evolved as the latest releases unveiled. 
We can already play with the most exciting changes, such as pattern guards and record patterns, 
in the Java 19 and 20 preview versions.

Let’s consider the following example:

{% highlight java %}
public class PatternMatching {
    public record Test(int value) {}
    public record ParentTest(Test test) {}

    public static void main(String[] args) {
        test(115);
        test("a");
        test("long string");
        test(new Test(20));
        test(new ParentTest(new Test(40)));
    }

    public static void test(Object obj) {
        switch (obj) {
            case String s when s.length() == 1 -> System.out.println("1 symbol: " + s);
            case String s when s.length() == 2 -> System.out.println("2 symbols: " + s);
            case String s                      -> System.out.println("more symbols: " + s);
            case Test(int value)               -> System.out.println("value inside record: " + value);
            case ParentTest(Test(int value))   -> System.out.println("value inside nested record: " + value);
            default                            -> System.out.println("default");
        }
    }
}
{% endhighlight %}

We can now have multiple cases with the same type but with added guard conditions. 
Also, the records can be decomposed, giving us access to any nested parameters immediately. 
Pretty cool, isn’t it?

But I’m not here to tell you how to use the latest pattern matching. Instead, I invite you to delve beneath 
this beautiful syntax and explore how it works internally at the bytecode level.

### bytecode preparations for the switch statement
The full bytecode output for this class is huge, so let me show you the most interesting bits.

This is how the `Code` section of the test method starts:

{% highlight text %}
0: aload_0
1: dup
2: invokestatic  #33  // Method java/util/Objects.requireNonNull:(Ljava/lang/Object;)Ljava/lang/Object;
5: pop
6: astore_1
7: iconst_0
8: istore_2
9: aload_1
10: iload_2
11: invokedynamic #39,  0  // InvokeDynamic #0:typeSwitch:(Ljava/lang/Object;I)I
16: tableswitch   { // 0 to 4
                    0: 52
                    1: 85
                    2: 121
                    3: 143
                    4: 176
                    default: 236
    }
{% endhighlight %}

Let’s go step by step and see what’s happening here.

{% highlight text %}
0: aload_0
{% endhighlight %}

Since our test method takes an `Object` argument, the `Object` reference is initially stored in the local 
variable array at index `0`. The instruction `aload_0` is used to load the Object reference at index `0` onto 
the operand stack.

![](/assets/images/pattern_matching/pm1.png)

{% highlight text %}
1: dup
{% endhighlight %}

`dup` instructs to duplicate the top value of the stack:

![](/assets/images/pattern_matching/pm2.png)

{% highlight text %}
2: invokestatic #33 // Method java/util/Objects.requireNonNull:(Ljava/lang/Object;)Ljava/lang/Object;
{% endhighlight %}

This instruction invokes a static method `requireNonNull` residing in `java.util.Objects`. 
The method takes an `Object` as an argument and returns an `Object`. It checks if the value is not 
null and returns it; otherwise, it throws an exception.

The status of our local variable array and operand stack is the following:

![](/assets/images/pattern_matching/pm3.png)

{% highlight text %}
5: pop
{% endhighlight %}

`pop` instructs to remove the top value from the operand stack:

![](/assets/images/pattern_matching/pm4.png)

{% highlight text %}
6: astore_1
{% endhighlight %}

This operation stores the value from the top of the operand stack as a local variable at index `1`:

![](/assets/images/pattern_matching/pm5.png)

{% highlight text %}
7: iconst_0
{% endhighlight %}

Load a constant integer value `0` onto the stack:

![](/assets/images/pattern_matching/pm6.png)

{% highlight text %}
8: istore_2
{% endhighlight %}

Store the top integer value from the stack as a local variable:

![](/assets/images/pattern_matching/pm7.png)

{% highlight text %}
9: aload_1
{% endhighlight %}

Load an Object reference from local variables at index `1` onto the operand stack:

![](/assets/images/pattern_matching/pm8.png)

{% highlight text %}
10: iload_2
{% endhighlight %}

Load an integer value from local variables at index `2` onto the operand stack:

![](/assets/images/pattern_matching/pm9.png)

The next instructions are `invokedynamic` and `tableswitch`, and they deserve a deeper explanation.

### `invokedynamic` and `tableswitch` teamwork
In this particular case, the `invokedynamic` and `tableswitch` instructions work together as a team. 
As the name suggests, `invokedynamic` invokes a dynamically determined method, meaning that we “don’t know” 
which method it will be at compile time.

Why is there a need to dynamically determine how exactly the switch statement should work? One idea behind 
this approach is to separate as much of the switch logic as possible from our bytecode, making it more compact. 
This logic, including type determination, is implemented in the bootstrap methods.

Another benefit of this approach is that if a newer Java version introduces more advanced logic for 
switch statements, our previously generated bytecode will continue to work without recompiling and can also 
benefit from the new features.

It’s supposed to work quickly since we only go through the method lookup logic the first time. 
After that, the target method is linked directly, and under the same circumstances, the JVM will invoke 
the linked method as any normal one.

The `invokedynamic` instruction is used for many bits of the Java functionality, including String concatenation, 
lambdas, etc.

Specifically for the switch functionality, `invokedynamic` is used along with one of the two bootstrap methods: 
`typeSwitch` or `enumSwitch`. They facilitate the invocation of `doTypeSwitch` or `doEnumSwitch` methods, respectively.

In our example, we are not dealing with enum types. However, our switch statement contains a mix of different 
types, which is the `doTypeSwitch` territory. The `doTypeSwitch` takes the Object and int values from the operand stack and returns an int. 
This integer value is then used by the `tableswitch` or `lookupswitch` instructions to determine 
the target address and jump to that location.

### `invokedynamic` for type switch
Let’s take a closer look at the `invokedynamic` instruction in our bytecode:

{% highlight text %}
11: invokedynamic #39,  0  // InvokeDynamic #0:typeSwitch:(Ljava/lang/Object;I)I
{% endhighlight %}

The hint provided by `javap` indicates that the reference `#39` in the constant pool points to the value: 
`InvokeDynamic #0:typeSwitch:(Ljava/lang/Object;I)I`, which contains another reference `#0`. 
That reference points to an interesting section in our bytecode called `BootstrapMethods`. Let’s see its entry `#0`, 
since it’s the relevant one for us:

{% highlight text %}
BootstrapMethods:
    0: #109 REF_invokeStatic java/lang/runtime/SwitchBootstraps.typeSwitch:(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;
        Method arguments:
            #43 java/lang/String
            #43 java/lang/String
            #43 java/lang/String
            #23 com/smthelusive/PatternMatching$Test
            #28 com/smthelusive/PatternMatching$ParentTest
{% endhighlight %}

Entry `#0` points to the `typeSwitch` method located in the `java.lang.runtime.SwitchBootstraps` class. 
This is the bootstrap method that will be invoked for our switch statement.

### the `typeSwitch` bootstrap method
All right, what is so special about this bootstrap method?

It has to dynamically (at runtime) determine and prepare the target method for invocation.

Let’s check the source code:

{% highlight java %}
public static CallSite typeSwitch(MethodHandles.Lookup lookup,
                                  String invocationName,
                                  MethodType invocationType,
                                  Object... labels) {
    if (invocationType.parameterCount() != 2
        || (!invocationType.returnType().equals(int.class))
        || invocationType.parameterType(0).isPrimitive()
        || !invocationType.parameterType(1).equals(int.class))
        throw new IllegalArgumentException("Illegal invocation type " + invocationType);
        requireNonNull(labels);

        labels = labels.clone();
        Stream.of(labels).forEach(SwitchBootstraps::verifyLabel);

        MethodHandle target = MethodHandles.insertArguments(DO_TYPE_SWITCH, 2, (Object) labels);
        return new ConstantCallSite(target);
    }
{% endhighlight %}

The bootstrap method accepts an instance of `Lookup`, which is the lookup context. 
JVM places the lookup context onto the operand stack before it invokes the method.

`invocationName` holds the name of the invoke method that actually performs the invocation. 
However, that value is not even used.

The `MethodType` holds the descriptor of the target method. This value is taken from a specific `NameAndType` 
entry in the constant pool, which is referenced for `invokedynamic` instruction.

These are the referenced entries:

{% highlight text %}
#39 = InvokeDynamic      #0:#40        // #0:typeSwitch:(Ljava/lang/Object;I)I
#40 = NameAndType        #41:#42       // typeSwitch:(Ljava/lang/Object;I)I
{% endhighlight %}

Here, the `MethodType` is expressed through the following descriptor: `(Ljava/lang/Object;I)I`, 
which means that the argument types are `Object` and `int` and the return type is `int`.

The most interesting argument of the `typeSwitch` method is `Object… labels`. It is an array of all types 
for the cases in our switch statement. For us, these types are: `String`, `String`, `String`, `Test` and `ParentTest`.

The names of these types reside in the constant pool as `Class` entries. We pass references to these 
types as arguments to the bootstrap method in the `BootstrapMethods` section:

{% highlight text %}
Method arguments:
    #43 java/lang/String
    #43 java/lang/String
    #43 java/lang/String
    #23 com/smthelusive/PatternMatching$Test
    #28 com/smthelusive/PatternMatching$ParentTest
{% endhighlight %}

Now, the `typeSwitch` method has all the information it requires.

What does it do exactly?

It verifies the arguments, then creates an instance of `CallSite` and puts it onto the stack. 
The call site contains a `MethodHandle`, which is the target method to be called the final goal of 
`invokedynamic` instruction.

How does it obtain that super important `MethodHandle`? There’s a special mechanism that can be considered 
a more modern, safer, and faster kind of reflection. It is used to look up the `MethodHandle` instance.

In the bootstrapping code for switch cases, we see that we are looking for a specific `MethodHandle DO_TYPE_SWITCH`, 
which is initialized in a static block:

{% highlight text %}
DO_TYPE_SWITCH = LOOKUP.findStatic(SwitchBootstraps.class, "doTypeSwitch",
    MethodType.methodType(int.class /* return type */,
        Object.class /* argument 0 */,
        int.class /* argument 1 */,
        Object[].class /* argument 2 that we didn't know about */));
{% endhighlight %}

We see here that the target method’s name is `“doTypeSwitch”`. Surprisingly, it accepts more arguments 
than we expected. Why? The first two arguments are taken normally from the operand stack, and the last 
argument is injected by the bootstrap method:

{% highlight java %}
MethodHandle target = MethodHandles.insertArguments(DO_TYPE_SWITCH, 2, (Object) labels);
{% endhighlight %}

As you remember, we accepted labels (collection of case types) as the bootstrap method argument, 
now we inject it as the second argument for our target method.

Finally, the `invokeExact` method is going to use the `CallSite` previously placed onto the stack to 
invoke the target method.

### the target `doTypeSwitch` method
Here is the source code of the target `doTypeSwitch` method:

{% highlight java %}
private static int doTypeSwitch(Object target, int startIndex, Object[] labels) {
    if (target == null)
    return -1;

    // Dumbest possible strategy
    Class<?> targetClass = target.getClass();
    for (int i = startIndex; i < labels.length; i++) {
        Object label = labels[i];
        if (label instanceof Class<?> c) {
            if (c.isAssignableFrom(targetClass))
                return i;
        } else if (label instanceof Integer constant) {
            if (target instanceof Number input && constant.intValue() == input.intValue()) {
                return i;
            } else if (target instanceof Character input && constant.intValue() == input.charValue()) {
                return i;
            }
        } else if (label.equals(target)) {
            return i;
        }
    }

    return labels.length;
}
{% endhighlight %}

In the beginning, we have pushed the following values onto the stack: a reference to an `Object` for which 
the entire switch statement is being executed, and an integer value initialized to `0`. 
If the first one is clear, then what is that integer value for?

Let’s look at our switch statement again:

{% highlight java %}
switch (obj) {
    case String s when s.length() == 1 -> System.out.println("1 symbol: " + s);
    case String s when s.length() == 2 -> System.out.println("2 symbols: " + s);
    case String s                      -> System.out.println("more symbols: " + s);
    case Test(int value)               -> System.out.println("value inside record: " + value);
    case ParentTest(Test(int value))   -> System.out.println("value inside nested record: " + value);
    default                            -> System.out.println("default");
}
{% endhighlight %}

We have three cases where the type is `String`. Let’s assume that the incoming `Object` is indeed an 
instance of `String`. The mysterious integer value (let’s call it `tmp`) at this moment is equal to `0`. 
So, what happens next?

We reach the `invokedynamic` instruction, which looks up and calls the `doTypeSwitch` method. 
The result of this method is the integer value sitting at the operand stack.

This value allows us to determine the address and jump to a specific bytecode instruction. 
Only after the jump will we evaluate the guard condition `s.length() == 1`. If this condition is not satisfied, 
we overwrite the value of `tmp` to `1` and go back to the start. Once there, we push it again onto the 
operand stack and invoke the `doTypeSwitch` method again, where we accept `startIndex` equal to `1` this time.

When we hit the `doTypeSwitch` method for the second time, we once again end up in a String case. 
However, the different `startIndex` will result in a different return value. That will bring us to a 
different bytecode address. We will jump to a second branch, where we assess the guard condition for that 
branch: `when s.length() == 2`.

We will continue this process until we satisfy a guard condition or encounter a section of code that 
does not have a guard condition. We can exit the switch statement once we execute a code block for one of the cases.

Let’s check the part of the bytecode that illustrates this logic (see my comments in bold):

{% highlight text %}
9: aload_1
10: iload_2
11: invokedynamic #39,  0  // InvokeDynamic #0:typeSwitch:(Ljava/lang/Object;I)I
16: tableswitch   { // 0 to 4
        0: 52 // **using the returned integer value 0, we find address 52**
        1: 85 // **if the first guard failed, target returns 1, which maps to address 85**
        2: 121 // **int value == 2, go to address 121**
        3: 143 // **different type, the target method returns 3, which points to address 143**
        4: 176 // **and so on**
        default: 236
    }
52: aload_1 // **first case for String brings us here**
53: checkcast     #43  // class java/lang/String // **check if type is String, so the guard on String length can be performed safely**
56: astore_3
57: aload_3
58: invokevirtual #45  // Method java/lang/String.length:()I
61: iconst_1
62: if_icmpeq     70 // **if guard condition is satisfied, go to 70, else:**
65: iconst_1 // **put integer 1 to opstack**
66: istore_2 // **overwrite tmp variable from 0 to 1**
67: goto          9 // **jump to the top and start over**
70: getstatic     #49  // Field java/lang/System.out:Ljava/io/PrintStream;
73: aload_3
74: invokedynamic #55,  0  // InvokeDynamic #1:makeConcatWithConstants:(Ljava/lang/String;)Ljava/lang/String;
79: invokevirtual #59  // Method java/io/PrintStream.println:(Ljava/lang/String;)V
82: goto          247 // **if guard condition is satisfied and code was executed from address 70 until here, we can jump to the end of switch statement**
85: aload_1 // **second case for String brings us here, where we do all the same casting, condition checking, and so on**
...
{% endhighlight %}

### dynamic enum switch
As mentioned earlier, there is another dynamically bootstrapped method for switch statements: `doEnumSwitch`. 
This method is responsible for handling cases similar to the following:

{% highlight java %}
enum Color { YELLOW, GREEN, BLUE; }

static void test(Color value) {
    switch(value) {
        case BLUE -> System.out.println("The color blue");
        case YELLOW -> System.out.println("The color yellow");
        case Color c -> System.out.println("Another color" + c);
    }
}
{% endhighlight %}

This example contains the enum type and the specific enum values in the same switch statement. 
The bootstrapping process is similar. In the `BootstrapMethods` section, we will see the `enumSwitch` 
method that will facilitate the invocation of `doEnumSwitch`.

### `tableswitch` vs `lookupswitch`
Let’s slightly change our example:

{% highlight java %}
switch (obj) {
    case String s when s.length() == 1 -> System.out.println("1 symbol: " + s);
    case String s                      -> System.out.println("more symbols: " + s);
    default                            -> System.out.println("default");
}
{% endhighlight %}

If we compile it and check the bytecode, we will find lookupswitch instead of tableswitch:

{% highlight text %}
16: lookupswitch  { // 2
        0: 44
        1: 77
        default: 99
    }
{% endhighlight %}

What is the difference between these two?

`tableswitch` holds the table of bytecode addresses, where we can get any address by index, 
like in an array, which is super fast. The complexity is `O(1)`.

The `lookupswitch`, on the other hand, holds the mapping of keys to addresses. 
The keys in the table must always be sorted. When searching for a specific address, it performs a 
binary search through the keys. This operation is slightly slower but still quite fast, 
with a complexity of `O(log n)`.

What is the benefit of using the `lookupswitch` then?

Well, in our case, the reason is the size of this construction. We have only two entries in the table, 
which takes up less space compared to the minimum space required for the `tableswitch`. 
So the speed benefit of the `tableswitch` is not worth the extra space that can be saved.

However, there are more fun cases in nature where `lookupswitch` becomes much more sensible than `tableswitch`.

Let’s consider the following example:

{% highlight java %}
static void test(int value) {
    switch (value) {
        case 1:    System.out.println(1);
        case 2:    System.out.println(10);
        case 3:    System.out.println(100);
        case 4:    System.out.println(1000);
        default:   System.out.println(10000);
    }
}
{% endhighlight %}

This will result in a `tableswitch`:

{% highlight text %}
0: iload_0
1: tableswitch   { // 1 to 4
        1: 32
        2: 39
        3: 47
        4: 55
        default: 64
    }
{% endhighlight %}

The integer value itself is used as a key to find a bytecode address in the `tableswitch`. 
Since all values from `1` to `4` are covered in a switch statement, they become excellent indices.

Let’s change the code to the following:

{% highlight java %}
static void test(int value) {
    switch (value) {
        case 1:    System.out.println(1);
        case 10:   System.out.println(10);
        case 100:  System.out.println(100);
        case 1000: System.out.println(1000);
        default:   System.out.println(10000);
    }
}
{% endhighlight %}

In this case, to use a `tableswitch`, we need to cover all indices between `1` and `10`, `10` and `100`, 
and so on in that table. This would result in a large structure, making it impractical to use a `tableswitch`. 
Instead, we look up the address using `lookupswitch`, where we compare our integer value to the keys to find 
the correct address.

The bytecode transforms to the following:

{% highlight text %}
0: iload_0
1: lookupswitch  { // 4
        1: 44
        10: 51
        100: 59
        1000: 67
        default: 76
    }
{% endhighlight %}

In summary, `lookupswitch` is more suitable for cases where the values are more scattered, with gaps between the keys.

### Last Thoughts
Dynamic method invocation was not originally supported in the JVM.

Initially, the JVM was designed with a single statically typed language in mind — Java. However, generating 
the class files and letting the JVM run them was so convenient that more and more JVM languages started emerging.

Dynamically-typed languages had a hard time because in the JVM, everything had to be known at compile time. 
So, the `invokedynamic` instruction was introduced to support dynamically typed languages, too*.

It proved to be useful for Java as well. For example, it helps ensure that certain classes or methods are 
generated at runtime only when necessary (like for lambdas). If the lambda function is never executed at 
runtime, we save space with a more compact bytecode.

The only advantage of dynamic invocation for switch statements is the separation of the type-checking 
logic away from our bytecode. However, let’s highlight this again: when we see a `typeSwitch` method in our 
bytecode, we already know precisely which method it will bootstrap (because currently, there is only one 
option: `doTypeSwitch`). The same applies to `enumSwitch`, which exclusively bootstraps the `doEnumSwitch` method.

So, why can’t it be a normal invocation of a method known at compile time accepting an array of 
Strings with the case types? Perhaps it’s related to the work required in the bytecode to load all 
the necessary parameters onto the operand stack before calling such a method. 
Another possible reason is that there are plans to introduce more options that could be dynamically 
selected.

Another mystery is related to the benefits of using the dynamic enum switch.

I did some basic performance comparisons for the new syntax that uses the enum switch and the old way 
of reaching the same result without dynamic invocation.

With dynamic invocation:

{% highlight java %}
static void test(Color value) {
    switch(value) {
        case YELLOW -> System.out.println("The color yellow");
        case BLUE -> System.out.println("The color blue");
        case Color c -> System.out.println("Another color" + c);
    }
}
{% endhighlight %}

Without dynamic invocation:

{% highlight java %}
static void test(Color value) {
    switch(value) {
        case YELLOW -> System.out.println("The color yellow");
        case BLUE -> System.out.println("The color blue");
        default -> System.out.println("Another color" + value);
    }
}
{% endhighlight %}

I couldn’t prove that the new way for this particular case gives a performance benefit. 
In fact, it seems to work a little slower (which is not unexpected), and the bytecode takes up more space.

So, I’m looking forward to seeing what will change around this functionality in the upcoming releases.

Stay tuned 😎.

-----

* I learned the JVM was initially designed exclusively for Java from [Edoardo][edoardo]’s talk 
“WebAssembly for the Java Geek” at [JNation 2023][j-nation]. Check out this [paper][paper].

[edoardo]: https://twitter.com/evacchi
[j-nation]: https://jnation.pt/
[paper]: https://dl.acm.org/doi/10.1145/1711506.1711508