---
layout: post
title:  "Java's synchronized explained"
date:   2025-02-02 00:00:00 +0200
image: /assets/images/thumbnails/synchronized.png
excerpt: "There's a ton of documentation and specifications describing the internal workings of the JVM. However, going through all of that
to simply gain some understanding might be a bit too much. I've read those specs and looked inside, so here's a simple little explanation of how `synchronized` works in Java..."
---

There's a ton of documentation and specifications describing the internal workings of the JVM. However, going through all of that
to simply gain some understanding might be a bit too much. I've read those specs and looked inside, so here's a simple little
explanation of how `synchronized` works in Java.

Java syntax allows for `synchronized` methods and `synchroized` blocks (in docs, they call them "statements").
The idea is that only one thread can execute them at a time, so we can avoid competition for resources etc. etc.

## monitors
Synchronized methods and statements look slightly different under the hood.

Here's an example of a `synchronized` statement:

```java
final Object a = new Object();

public void normalMethod() {
    System.out.println("outside synchronized block");

    synchronized (a) {
        System.out.println("inside synchronized block");
    }
}
```

Here's the bytecode of the `normalMethod`:

```text
 0: getstatic     #23    // Field java/lang/System.out:Ljava/io/PrintStream;
 3: ldc           #39    // String normal method outside synchronized block
 5: invokevirtual #31    // Method java/io/PrintStream.println:(Ljava/lang/String;)V
 8: aload_0
 9: getfield      #7     // Field a:Ljava/lang/Object;
12: dup
13: astore_1
14: monitorenter
15: getstatic     #23    // Field java/lang/System.out:Ljava/io/PrintStream;
18: ldc           #41    // String normal method inside synchronized block
20: invokevirtual #31    // Method java/io/PrintStream.println:(Ljava/lang/String;)V
23: aload_1
24: monitorexit
25: goto          33
28: astore_2
29: aload_1
30: monitorexit
31: aload_2
32: athrow
33: return
```

The most interesting part begins when we encounter `synchronized` in Java code, which, in the bytecode, starts with the
`monitorenter` instruction. Before that instruction, the compiler made sure that a reference to our `Object a` is present
on top of the operand stack, so `monitorenter` could use it and lock its **monitor**.

What is a monitor? You can think of it as some metadata that every instance has.
Every object has a "monitor" associated with it, and when a thread locks it, other threads must wait until it's released.
It's possible to see whether that object's monitor is locked by simply checking its header.
The object knows: who is the owner, and how many times that owner has obtained that same lock (reentered).
Eventually, the thread must let go of the monitor exactly as many times as it has acquired it.

In the example above, we use a dummy `Object` to control that only one thread executes the piece of code
inside `synchronized`. Alternatively, we can synchronize on a specific instance that we don't want to access concurrently.
But the rule is, there always must be some object.

Further in the bytecode, after we're done with our single-threaded piece of logic, we encounter a `monitorexit` instruction.
If `monitorenter` uses the reference and increments its counter of locks by this thread, the `monitorexit` works similarly -
it uses the reference and decrements the counter. If a thread tries to release a monitor it does not own, an `IllegalMonitorStateException` is thrown.

Did you notice? The `monitorexit` instruction appears twice!
Well, while we're executing some code inside a `synchronized` block, we might encounter an exception, which would lead to
us missing a `monitorexit` instruction. But because it's very important to let go of that monitor in any case,
the compiler inserted a piece of logic identical to a `finally` block:

```text
Exception table:
 from    to  target type
    15    25    28   any
    28    31    28   any
```

If things don't go well while we're in a `synchronized` block (lines `15` - `25`), we jump to instruction at line `28`,
and proceed with the following set of instructions:

```text
28: astore_2
29: aload_1
30: monitorexit
31: aload_2
32: athrow
33: return
```

Basically: save a reference pointing to the exception, put the reference used for `synchronized` onto the stack, use it to
execute `monitorexit`, take that exception reference again and throw it using `athrow`. Done!

Also, if something goes wrong between lines `28` and `31` (the "finally" block), we'll end up in that same block again.

## synchronized methods
As I mentioned earlier, synchronized methods look a bit different. They don't have explicit `monitorenter`
or `monitorexit` instructions, but internally, the JVM still uses monitors.

### virtual
Let's consider an example of a virtual synchronized method:

```java
synchronized public void virtualSyncMethod() {
    System.out.println("virtual synchronized method");
}
```

Here's the bytecode:
```text
public synchronized void virtualSyncMethod();
descriptor: ()V
flags: (0x0021) ACC_PUBLIC, ACC_SYNCHRONIZED
Code:
  stack=2, locals=1, args_size=1
     0: getstatic     #23                 // Field java/lang/System.out:Ljava/io/PrintStream;
     3: ldc           #37                 // String virtual synchronized method
     5: invokevirtual #31                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
     8: return
  LineNumberTable:
    line 18: 0
    line 19: 8
  LocalVariableTable:
    Start  Length  Slot  Name   Signature
        0       9     0  this   Lorg/example/SyncMethods;
```

The JVM knows that a method is `synchronized` based on the `ACC_SYNCHRONIZED` flag. Even though we don't see any
monitor-something instructions, internally, the JVM still needs an object to coordinate the locking. When the method
is called, some monitor must be locked, and on `return` or `athrow` instructions, the lock must be released.
The solution is simple: JVM uses `this` reference, which is the reference to the owner instance.
This means that if a class contains multiple `synchronized` methods, and one of these methods is in use, other threads
cannot access any other `synchronized` methods of the same instance. Different instance - no problem.

In our example, in the `LocalVariableTable`, we can see a `this` reference, which points to an instance of the class
containing my demo methods, `SyncMethods`. This reference will come in handy for the JVM.

### static
Let's take a quick look at the same situation, but with a static method:

```java
synchronized public static void staticSyncMethod() {
    System.out.println("static synchronized method");
}
```

The bytecode:

```text
public static synchronized void staticSyncMethod();
descriptor: ()V
flags: (0x0029) ACC_PUBLIC, ACC_STATIC, ACC_SYNCHRONIZED
Code:
  stack=2, locals=0, args_size=0
     0: getstatic     #23                 // Field java/lang/System.out:Ljava/io/PrintStream;
     3: ldc           #29                 // String static synchronized method
     5: invokevirtual #31                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
     8: return
  LineNumberTable:
    line 14: 0
    line 15: 8
```

Looks very similar, but of course, it can't have any kind of `this` reference because there is no owning instance for this method.
In this case, the JVM uses a reference to the whole class containing the method (for example, `SyncMethods.class`).
That is why, **across all instances**, two `synchronized` methods of the `SyncMethods` class can't be executed 
concurrently by different threads.

---
Of course, there are more details about synchronization in the JVM that I didn't cover, and that was done intentionally
to keep it digestible. If you have any specific feedback or would like to read about a particular topic in the future,
feel free to contact me on [Bluesky][bluesky].

Thanks and see you soon!

References:\
[monitorenter/monitorexit specs][1] \
[Intrinsic Locks and Synchronization][2] \
[Synchronization][3] \
[Threads and Locks][4]

[1]: https://docs.oracle.com/javase/specs/jvms/se6/html/Instructions2.doc9.html
[2]: https://docs.oracle.com/javase/tutorial/essential/concurrency/locksync.html
[3]: https://docs.oracle.com/javase/specs/jvms/se6/html/Compiling.doc.html#6530
[4]: https://docs.oracle.com/javase/specs/jvms/se6/html/Threads.doc.html#21294
[bluesky]: https://bsky.app/profile/nataliiadziubenko.com