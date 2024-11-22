---
layout: post
title:  "First months at Azul: how is it going?"
date:   2024-11-22 12:00:00 +0200
image: /assets/images/thumbnails/azul_brick.png
excerpt: "It's been over three months now since I started working at Azul. Everyone keeps telling me 'you're in the right place', and I can't agree more! I feel like I can use my skills and experience as a backend engineer, and also combine it with the subject of my curiosity and strong interest - JVM internals..."
---
It's been over three months now since I started working at Azul. Everyone keeps telling me, "you're in the right place,"
and I can't agree more! I feel like I can use my skills and experience as a backend engineer, and also combine it with
the subject of my curiosity and strong interest — JVM internals.

So, what am I doing, and how has it been going so far?

### the team
Many know Azul as one of the vendors that provide JDK distributions (except Brazilians — they keep telling me it’s an
airline 😃). Well, JDKs are not the only thing Azul provides. For example, there’s also an [Intelligence Cloud][intelligence-cloud]
that performs analysis of Java applications at runtime and reports things like used components, vulnerabilities,
and more. I’ve joined the Intelligence Cloud team as a backend engineer. :)

The team consists of really cool engineers, and I’m learning a lot from them. We work remotely, distributed around
the world. In order for us to get to know each other, we've actually met in person — which was pretty cool!

Here's an attempt to explain how Intelligence Cloud works without making it a marketing speech.

### the idea
Why analyze at runtime? Sure, you can do the vulnerability detection without any runtime information. As a result, you'll
know which vulnerabilities are present in your codebase and which have the highest scores, so you can
immediately jump into fixing them. However, are these vulnerabilities even located in the code that your application is
actually using? Runtime analysis can answer this question and help prioritize the problems that are truly threatening right
now — and this is what Azul Vulnerability Detection does.

Also, by collecting runtime information, it’s possible to see exactly when you were using certain classes or methods.
Or maybe they’re never used? In your source code, it may still look like something is calling this code, but maybe the
caller (together with the whole legacy flow) can be removed entirely. So these are the things that Code Inventory reports
try to address, and right now I’m mostly involved with this initiative.

These are just two examples, and there are more, which work on a similar principle.

### the principle
In a nutshell, you run your applications in your environment as usual. If you’re using a non-Azul JVM, you’ll need to
run it with an agent, which sends out the JVM events that are used for analysis. All events from all your
runtimes go to the backend through Forwarder, another app that you run in your environment. Only Forwarder needs to be
able to talk to the outside world.
Our backend sits in AWS. There, we analyze the events, keep the data, and provide the reports through the API or Web UI.

I think one of the most interesting parts of the flow is how the agent works. It does a lot of magic in order to track
the events that are interesting for the analysis. Even though I’m not working on the agent side, I often poke my nose
into their work, and sometimes brainstorm with them. This is where understanding JVM internals is really helpful.

### some things that I’ve learned
This section is highly subjective and messy — please bear with me.

#### AWS
This is actually my first experience with AWS. Some things are nice, and some are painful for me personally.

For example, CloudWatch is difficult to use, problems are hard to debug (keep forgetting, where was that logging hidden
again?). To see why a Lambda has failed, you have to go through a labyrinth of monitors. It’s not the same as
just going to a `Log` tab, guess I’m spoiled.

Lambdas can be nice for the infancy of the project, but become painful as the project matures. To give you an example,
a Lambda can run for up to 15 minutes, and that limit can’t be increased.

Navigating the platform in general is still difficult for me, but I'm getting used to it.

Estimating the costs of different options becomes a routine exercise, and that feels... new.

#### PostgreSQL
So much Postgres! At the start of my career, I worked on a product that was more than half written in PL/SQL, so I was
overly confident in my SQL skills for some reason. But here, I’ve seen some really cool things you can do with SQL.
I haven’t used such a rich SQL syntax before, and it’s been a while since I’ve seen people actually looking at the query plans
and taking query optimization seriously.

In summary, SQL is rich and beautiful, PostgreSQL is cool (and can handle a lot) 💙

#### code quality & performance
I once submitted a PR to a known open-source project which was doing a lot of JVM-internal stuff... and was written
in Java. But that Java didn’t always look like Java, because it was using `UNSAFE`, allocating memory, taking safepoints
into account... You know, it felt like C written in Java :)

That PR took months of slow implementation, when at times I wasn’t sure I’d be able to make it work at all. Then, it took
three months of reviewing (and fixing) but didn’t get merged, because there was so much more than just “making it work”
or even “making it work right”. There was more of making it work perfectly, and superfast, which might involve techniques
that you don’t commonly see, but when performance is crucial, devs get creative.

I’ve never worked in that domain before. In the domains where I worked, they just brought more servers in when necessary.

It’s not exactly the same in that sense in my current team, because here I’m a backender, and things are a bit more
familiar. But the feeling of measuring each and every inch of performance is still there. This is the place where the
code reviews are not just a formality. They become brainstorms, they involve a lot of research and a lot of effort.
It’s cool to train the code quality muscle and see how it actually matters.

#### JVM & The Java Community
Last, but not least, I’ve learned a lot about JVMs — to the point that I finally realize how little I know.

Now that my passion is my actual job, I find myself sharing less about it publicly. There are so many cool solutions
that I see every day, but unfortunately I can’t make a deep dive into those. I thought my usual deep dive format was an
expectation that everyone had from this blog, but in reality, it was my own expectation.

I’ve learned that to contribute to the Java community, I don’t necessarily need to dig through pages and pages of
JVM specs. I can share exciting findings, interesting learnings, all things Java, but also beyond, into a broader
perspective. So let's try that!

Thank you for reading! I hope you found this interesting and got something for yourself from it.

_P.S.: There’s a little kid in me that is making a comic story about debugging (because why not?). The story is still
in progress at the moment of writing, but will keep updating until it’s finished, so if you’re curious:
[Debugging Underworld]({{ site.baseurl }}{% link comics/debugging_underworld.markdown %})_

[intelligence-cloud]: https://www.azul.com/products/intelligence-cloud/