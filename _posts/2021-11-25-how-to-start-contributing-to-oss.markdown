---
layout: post
title:  "How to start contributing to OSS"
date:   2021-11-25 12:00:00 +0200
image: /assets/images/thumbnails/oss_thumbnail.png
excerpt: "Many of us, software engineers, at some point in time decide that we would like to get involved with an open-source project. Many of us indeed become contributors, but it’s not always clear where to start and how to find a project that would be a perfect match. For some years these questions were holding me back from starting, and I thought that possibly I’m not the only one. So I decided to share my experience and hopefully it saves you some time or frees you of unnecessary frustrations..."
---
<em>This article was first published at [Xebia blog][xebia-blog]</em>

Many of us, software engineers, at some point in time decide that we would like to get involved with an open-source project. Many of us indeed become contributors, but it’s not always clear where to start and how to find a project that would be a perfect match. For some years these questions were holding me back from starting, and I thought that possibly I’m not the only one. So I decided to share my experience and hopefully it saves you some time or frees you of unnecessary frustrations.

### Why contribute?
Open-source contributions are not often placed onto the CVs or used for marketing. In many cases potential employers don’t take a look at your GitHub account. Of course, they probably should, it’s a great indication about the skills and enthusiasm! Still, if it doesn’t get you this new fancy job, what does it give to you?

By contributing to different projects, you are getting more exposed to various approaches and technologies and start identifying bad practices more easily. You are connecting with other people, who are sharing your interests, and get a lot of feedback. You learn and notice that some fresh ideas come to your mind.

Another common reason to start contributing is improving something you use at your daily work, and then it directly benefits you or your customer. If at your company/client/hobby project you implement a solution that can be made generic, you can always start your own project, make your own library. It is even possible to get [paid][sponsors] for the open-source work. Some companies pay employees for that too, but this is the whole different topic. Still, most of the open-source work is voluntary.

After all, it is a great feeling of being proud of contributing to something you really like and making a positive impact. But keep in mind, on the regular basis the OSS contributions will only work for you if you’re enjoying it.

### Perfect project
Now, how do you find a suitable project? When I was asking myself this question for the first time, I just thought that I could browse in GitHub (or any alternative platform) any topic that was interesting for me. But, for example, if I searched for 2D game engines, it wasn’t really giving me the most suitable projects. I was into Java and most game engines were a completely different world, so I was feeling unconfident to submit anything there. The results were not suitable for my expertise. Even if you don’t mind fully switching your stack and trying the unknown, it might be a difficult start.

That led me to another approach: search for the projects that correspond to my expertise, say the Java projects. There are tons of Java projects, as well as any other languages and technologies. You can find basically anything, but if you don’t know what it does and what’s the mission of the project, you will never feel engaged enough to start. I found myself browsing around random projects having no idea what to do with them.

In my experience the best approach was to make a mental note every time I encountered something interesting in my daily work or while talking to my colleagues, attending conferences etc. At your project you most likely use some library or a framework, that makes your life easier. Maybe you need to solve a bug or add a feature there (if the library is inactive, forking is always an option). For example, when I was working on a Scala project, I had to do a lot of things with [Ammonite][ammonite], which was an interesting [project][ammonite-project] to take a look at.

It can be a library you’re not necessarily applying yet, maybe you just heard of it and thought that it might be handy, that’s already enough! Some libraries are getting popular and people are curious to use them, it might be a good choice too.

### Where to start?

Now, you have found something that is an interesting project for you. What do you implement exactly? What if you don’t have any ideas just yet? Take a look at the issues created for the project, there might be bugs as well as feature requests. Some projects use labels, so you can find a label like “help wanted”, “beginner friendly” or “good first issue”. There is a [resource][up-for-grabs] that helps finding those, but for me personally looking at the labels was sufficient.

If the project is open-source, it doesn’t mean that it’s open to contributions from everyone, but simply checking the `CONTRIBUTING.md` or similar (if exists) will most likely give an idea. Also, you will find the guidelines of how/what you can contribute there as well as the code and design conventions.

### Feedback time!

My biggest frustration after the first pull request was… the silence. Nobody even commented on it for a day, for two days and then for a month. I was checking every day and at some moment I thought that the project was not active anymore. So I checked when something was merged there last time, and it was several months earlier. It was sad to find a PR hanging there for several years with someone asking every once in a while: ‘it looks like a cool feature, why won’t we merge it?’.

I tried another project, and after two weeks of waiting for the feedback, I was feeling frustrated about the whole idea.

It made me search for really active projects. I was carefully inspecting the dates and frequency of pull requests getting merged and commented. The only problem was that on more active projects all issues were in progress. There was next to nothing to pick up (except documentation tickets, but who wants those). 😃

At some moment out of nowhere I started receiving comments and something even got merged. Even though I’ve already lost context of what I did there, it still felt cool to contribute and to participate in the project with other people who shared similar ideas with me.

### Communication matters

Yes, there is a suggestion that’d help avoid all the frustration. You can always directly contact the project owner and tell them you would like to get involved. Many active projects have Slack channels or Gitter chats, where you can ask questions or ask for help. Asking your questions on the issues, adding your comments and even adding your own feedback to the existing pull requests will likely trigger others to take a look around the project and be more active. Remember, that your input in any format (comments, questions, issues, cancelled or merged PRs) is a valid contribution.

Also, if you like contributing, you could also consider answering questions on [Stack Overflow][stack-overflow].

### Conclusion

OSS work is fun and also very educative, so it’s always good to try and see if you would like to do it regularly.

Imagine, how many tools that you use are built by enthusiastic engineers for free! This is how the open source works: we all use it, and it’s nice when we also contribute, so we help others too. Everyone wins from it. And if there is no perfect project yet, you can always start building something new and involving others in it of course!

In any case, it’s definitely worth trying. Good luck!

[xebia-blog]: https://xebia.com/blog/
[sponsors]: https://github.com/sponsors
[ammonite]: https://ammonite.io/
[ammonite-github]: https://github.com/com-lihaoyi/Ammonite
[up-for-grabs]: https://up-for-grabs.net/
[stack-overflow]: https://stackoverflow.com/