---
layout: post
title:  "When Hibernate caching can go wrong"
date:   2020-03-23 12:00:00 +0200
categories: hibernate java caching
image: caching_thumbnail.png
excerpt: "It all started from us trying to setup Hibernate ehcache in our big project with a lot of entities to improve the performance. Eventually that took a lot of time because we ran into a bunch of issues..."
---
<em>This article was first published at [Lunatech blog][lunatech-blog]</em>

### Why is this topic worth discussion
It all started from us trying to setup Hibernate ehcache in our big project with a lot of entities to improve the performance. Eventually that took a lot of time because we ran into a bunch of issues and to solve some of them we had to do a bit of refactoring, and for others we spent a lot of time setting it up properly. Yes, you will find many things in documentation, but it’s not always on the surface and not always seen immediately.

### For whom it may be interesting
Developers trying to set up Hibernate caching in their app who are curious about possible pitfalls or who are already having issues, and wondering why isn’t it performing as expected will find this article helpful. Actually I wish it was written for me before I started setting it up :)

### Experimental setup
To demonstrate certain things I’ve created a simple Java project where I am using:
- Hibernate version: 5.4.11.Final
- Ehcache version: 3.8.1
- PostgreSQL version: 10 

My data structure is also simple:

![Data structure](/assets/images/hibernate/hibernate-data-structure.png)

In my application I have configured two caches. One is for entity caching: `cachedEntities`, and a query cache: `queryCache`. Of course, I’ve activated both caches in my `persistence.xml`:
{% highlight xml %}
<property name="hibernate.cache.use_second_level_cache" value="true"/>
<property name="hibernate.cache.use_query_cache" value="true"/>
{% endhighlight %}
and enabled hibernate query logging to see what exactly is happening.
In the Java code I’ve annotated all three entities with
{% highlight java %}
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE, region = "cachedEntities")
{% endhighlight %}
Following the data structure, Employee has a `@ManyToOne` reference to Department. Department has a `@ManyToOne` reference to Company. Department has `@OneToMany` employees. Company has `@OneToMany` departments.
We will play a bit with this configuration in the process.

## Catch #1
### Eagerly fetching collections? Brrr
That may sound like a good idea in the beginning: fetch some collections eagerly so in the beginning your application will for sure spend a lot of time fetching it all but then it will be faster in runtime because the data is already there…​ But. Eager fetch type is generally considered a bad practice. It may result in many uncontrolled queries being issued to the database.

But as we are discussing the caching topic here, let’s see how fetch type is related to caching. Actually, combining an eager fetch type of collections and caching is absolutely useless. Let’s look at our example. Let’s say all entities are now cacheable. We will be experimenting with Company entity, which has the set of departments in it:
{% highlight java %}
@OneToMany(fetch = FetchType.LAZY, mappedBy = "company")
private Set<Department> departments = new HashSet<>(0);
{% endhighlight %}

Now let’s run the query which has query caching properly set up:
{% highlight java %}
entityManager.createQuery("select company from Company company 
where company.id < 100")
.setHint(QueryHints.HINT_CACHEABLE, "true")
.setHint(QueryHints.HINT_CACHE_REGION, "queryCache")
.getResultList();
{% endhighlight %}

That way no weird queries will be issued to the database when the caching properly works. But be careful: once you make a `FetchType.EAGER` it will change the game.
First run:
{% highlight sql %}
Hibernate:
select company0_.id as id1_0_, company0_.address as address2_0_, 
company0_.description as descript3_0_, company0_.name as name4_0_
from company company0_
where company0_.id<100

Hibernate:
select department0_.company as company4_1_0_, department0_.id as id1_1_0_, 
department0_.id as id1_1_1_, department0_.company as company4_1_1_, 
department0_.name as name2_1_1_, department0_.occupation as occupati3_1_1_
from department department0_
where department0_.company=?

Hibernate:
select department0_.company as company4_1_0_, department0_.id as id1_1_0_, 
department0_.id as id1_1_1_, department0_.company as company4_1_1_, 
department0_.name as name2_1_1_, department0_.occupation as occupati3_1_1_
from department department0_
where department0_.company=?
...
{% endhighlight %}

So, first we get all company data and then use company ids to query all departments belonging to every company. Why is this happening? Our query didn’t contain anything related to departments, but they are queried because of the `EAGER` fetch type. It will do this **EVERY** time you issue your query for getting only companies, even after the query result is cached.

Second run:
{% highlight sql %}
Hibernate:
select department0_.company as company4_1_0_, department0_.id as id1_1_0_, 
department0_.id as id1_1_1_, department0_.company as company4_1_1_, 
department0_.name as name2_1_1_, department0_.occupation as occupati3_1_1_
from department department0_
where department0_.company=?

Hibernate:
select department0_.company as company4_1_0_, department0_.id as id1_1_0_, 
department0_.id as id1_1_1_, department0_.company as company4_1_1_, 
department0_.name as name2_1_1_, department0_.occupation as occupati3_1_1_
from department department0_
where department0_.company=?
...
{% endhighlight %}

The same as before, but the first query doesn’t run again because its result was cached. The queries we see now are running because of the eager fetch type. If Department had the set of employees with `FetchType.EAGER` as well, then following the chain of eager fetches, employees would be queried too.

You may wonder why our properly set up entity cache doesn’t help? Because we see in the log the queries which get departments by company ids. Entity cache won’t be helpful here, it would be helpful for querying departments by department ids.

So if you have `FetchType.EAGER` for collections, (you must have a strong reason for that which is unlikely) don’t expect caching to be much help.

### Takeaway:
Avoid using the `EAGER` fetch type for collections. Prefer making queries instead, carefully adjusting them to your purpose, and caching query results in the right way (the wrong ways are explained in Catch #3 and Catch #4).

## Catch #2
### What about single-valued associations?
With the `EAGER` fetch type every time you are fetching your entity, all the associated entities will be fetched too. Single-valued associations are easier to control so `@ManyToOne` and `@OneToOne` are `EAGER` by default. But you should still be careful otherwise caching won’t save you from repetitive queries to the database.

Let’s try to get an Employee by id:

{% highlight java %}
entityManager.find(Employee.class, id);
{% endhighlight %}

First time it logs this query to DB:

{% highlight sql %}
Hibernate:
select employee0_.id as id1_2_0_, employee0_.department as departme4_2_0_, 
employee0_.email as email2_2_0_, employee0_.name as name3_2_0_, 
department1_.id as id1_1_1_, department1_.company as company4_1_1_, 
department1_.name as name2_1_1_, department1_.occupation as occupati3_1_1_, 
company2_.id as id1_0_2_, company2_.address as address2_0_2_, 
company2_.description as descript3_0_2_, company2_.name as name4_0_2_
from employee employee0_
left outer join department department1_ on employee0_.department=department1_.id
left outer join company company2_ on department1_.company=company2_.id 
where employee0_.id=?
{% endhighlight %}

We can see it actually queries employee, department, and company tables because Employee has association to Department and Department - to Company which are by default eagerly fetched.

Second time it takes all values from the cache so it logs no queries to the DB which is exactly what we expect because we’ve marked them all as cacheable.

Now let’s remove the `@Cache` annotation from Department. It means that this entity won’t be cached in the entity cache. And we try to find Employee by id again.

First run:

{% highlight sql %}
Hibernate:
select employee0_.id as id1_2_0_, employee0_.department as departme4_2_0_, 
employee0_.email as email2_2_0_, employee0_.name as name3_2_0_, 
department1_.id as id1_1_1_, department1_.company as company4_1_1_, 
department1_.name as name2_1_1_, department1_.occupation as occupati3_1_1_, 
company2_.id as id1_0_2_, company2_.address as address2_0_2_, 
company2_.description as descript3_0_2_, company2_.name as name4_0_2_
from employee employee0_
left outer join department department1_ on employee0_.department=department1_.id
left outer join company company2_ on department1_.company=company2_.id 
where employee0_.id=?
{% endhighlight %}

Second run:

{% highlight sql %}
Hibernate:
select department0_.id as id1_1_0_, department0_.company as company4_1_0_, 
department0_.name as name2_1_0_, department0_.occupation as occupati3_1_0_, 
company1_.id as id1_0_1_, company1_.address as address2_0_1_, 
company1_.description as descript3_0_1_, company1_.name as name4_0_1_
from department department0_
left outer join company company1_ on department0_.company=company1_.id 
where department0_.id=?
{% endhighlight %}

First time it queries employee, department, and company as normal.

The second time it queries the department and company tables.

So yes, we cached Employee properly but we had cached only an id of the department which an employee belongs to. Having this id, our application can either get an entity by id from an entity cache or it will go to the database again to gather missing data. Our department wasn’t ever put to the entity cache so our app went to the DB.

### Takeaway:
When you want to cache an entity, check all ...ToOne relations which are eagerly fetched by default. You either want to make them fetched lazily or you can also cache its relation entities. Otherwise the queries to the DB will be made to fetch missing data. Whatever works better for your project and data.

## Catch #3 (my favourite)
### Query caching is killing the application performance
Let’s change the setup for our entities, so they are not stored in the entity cache. Now we are going to use the query cache. To set up query caching you need to explicitly add hints for each query: one to enable query caching and another optional one to specify the region where it’s cached. Let’s say we have a simple query that queries the companies:

{% highlight java %}
entityManager.createQuery("select company from Company company 
where company.id < 100")
.setHint(QueryHints.HINT_CACHEABLE, "true")
.setHint(QueryHints.HINT_CACHE_REGION, "queryCache")
.getResultList();
{% endhighlight %}

Let’s run this.

First run:

{% highlight sql %}
Hibernate:
select company0_.id as id1_0_, company0_.address as address2_0_, 
company0_.description as descript3_0_, company0_.name as name4_0_ 
from company company0_ where company0_.id<100
{% endhighlight %}

Looks like a nice cute little query, right? Let’s run it again.

Second run:

{% highlight sql %}
Hibernate:
select company0_.id as id1_0_0_, company0_.address as address2_0_0_, 
company0_.description as descript3_0_0_, company0_.name as name4_0_0_ 
from company company0_ where company0_.id=?

Hibernate:
select company0_.id as id1_0_0_, company0_.address as address2_0_0_, 
company0_.description as descript3_0_0_, company0_.name as name4_0_0_ 
from company company0_ where company0_.id=?

Hibernate:
select company0_.id as id1_0_0_, company0_.address as address2_0_0_, 
company0_.description as descript3_0_0_, company0_.name as name4_0_0_ 
from company company0_ where company0_.id=?

Hibernate:
select company0_.id as id1_0_0_, company0_.address as address2_0_0_, 
company0_.description as descript3_0_0_, company0_.name as name4_0_0_ 
from company company0_ where company0_.id=?
...
{% endhighlight %}

What? Now we have lots of queries instead of just one! So our query caching actually worsens our performance. Query caching caches only ids which are then used to get the rest of entity data, either from entity cache or from the database. To use query cache we MUST use an entity cache too. Now let’s annotate Company with `@Cache` and try again. First run looks exactly the same, the second time there were no queries issued to the DB. Perfect!

### Takeaway:
Use entity cache if you’re using query cache otherwise query caching will be a very doubtful performance improvement.

## Catch #4
### Queries with parameters: overcache
It may be too obvious now that queries with parameters are not really compatible with query caching unless you often run them with the same values in your application. That can be when you filter by some small set of values.

Example: you have only 3 Companies and query all departments with company id as parameter - it’s probably ok. However, if you have 100000 Companies and any of them can end up as parameter - it’s not a good idea. Your application will be busy caching every query as a different one and this will worsen your performance.

Sometimes it’s all about deciding what would perform better, for instance, if we fetch all Departments and have a cacheable query for that and then filter result further in the application…​ or we don’t have query caching for this query at all but do a proper filtering in a query itself. All in all, it really depends on your data and the amount of it.

### Takeaway:
Be careful using query cache and queries with parameters.

## Catch #5
### Cache settings: expire and overfill
For each cache you can separately configure these values in an ehcache.xml file:

{% highlight xml %}
timeToIdleSeconds="300"
timeToLiveSeconds="600"
{% endhighlight %}

It can also be set up via Java code. Whatever works better for you. In this example those values mean that cached values will live at maximum of 600 seconds after creation and they will only live 300 seconds if not accessed. By default these values are equal to 0 which is infinity.

I made some tests to demonstrate the behaviour with different expiration settings for our caches. When we run the query:

{% highlight java %}
entityManager.createQuery("SELECT company from Company company 
where company.id < 100")
.setHint(QueryHints.HINT_CACHEABLE, "true")
.setHint(QueryHints.HINT_CACHE_REGION, "queryCache")
.getResultList();
{% endhighlight %}

First run result:

{% highlight sql %}
Hibernate:
select company0_.id as id1_0_, company0_.address as address2_0_, 
company0_.description as descript3_0_, company0_.name as name4_0_ 
from company company0_ where company0_.id<100
{% endhighlight %}

Then we run it again and if in the meantime neither Entity cache nor Query cache expires, it looks good: no queries issued to the database.

When Entity cache expires before query cache (the most dangerous situation which brings us back to the Catch #3):

{% highlight sql %}
Hibernate:
select company0_.id as id1_0_0_, company0_.address as address2_0_0_, 
company0_.description as descript3_0_0_, company0_.name as name4_0_0_ 
from company company0_ where company0_.id=?

Hibernate:
select company0_.id as id1_0_0_, company0_.address as address2_0_0_, 
company0_.description as descript3_0_0_, company0_.name as name4_0_0_ 
from company company0_ where company0_.id=?

Hibernate:
select company0_.id as id1_0_0_, company0_.address as address2_0_0_, 
company0_.description as descript3_0_0_, company0_.name as name4_0_0_ 
from company company0_ where company0_.id=?

Hibernate:
select company0_.id as id1_0_0_, company0_.address as address2_0_0_, 
company0_.description as descript3_0_0_, company0_.name as name4_0_0_ 
from company company0_ where company0_.id=?

Hibernate:
select company0_.id as id1_0_0_, company0_.address as address2_0_0_, 
company0_.description as descript3_0_0_, company0_.name as name4_0_0_ 
from company company0_ where company0_.id=?

Hibernate:
select company0_.id as id1_0_0_, company0_.address as address2_0_0_, 
company0_.description as descript3_0_0_, company0_.name as name4_0_0_ 
from company company0_ where company0_.id=?
...
{% endhighlight %}

Both expire at the same time (not more dangerous than just not having caching set up at all):

{% highlight sql %}
Hibernate:
select company0_.id as id1_0_, company0_.address as address2_0_, 
company0_.description as descript3_0_, company0_.name as name4_0_ 
from company company0_ where company0_.id<100
{% endhighlight %}

And just for fun, query cache expires before the entity cache (the logged query looks as expected):

{% highlight sql %}
Hibernate:
select company0_.id as id1_0_, company0_.address as address2_0_, 
company0_.description as descript3_0_, company0_.name as name4_0_ 
from company company0_ where company0_.id<100
{% endhighlight %}

Same for the following settings:

{% highlight xml %}
maxEntriesLocalHeap="10000"
maxEntriesLocalDisk="1000"
{% endhighlight %}

They specify the cache size or how many records it can keep. Make sure this size is properly configured, otherwise you are risking having the same problems as discussed above.

If your cache is full, some entities/queries won’t stay cached when new ones are added while you expect them to be present in your cache. That leads to queries being issued to your DB.

If you want to have better control on how many records for each query you want to keep or how long you want to keep them, you will need to set up more caches with desired values.

### Takeaway:
Remember, to use query caching properly, we have to use entity caching too. Make sure that your cached values in the entity cache don’t expire before your cached query and also that they fit in there if you need them cached. Otherwise, you end up worsening your performance (see Catch #3).
Carefully configure your caches to not bump into unexpected issues.

## Conclusion
Of course there are many more things to look into when something goes wrong. For instance, there are also different `CacheConcurrencyStrategies`. The goal of this topic isn’t to cover everything, but to show some real examples how the wrong configuration can worsen the performance of your application. General suggestion: if your application behaves funny, try to log the queries that are issued to the database or cache hit/miss. That may give you an idea of what is set up wrong.

Often the problem can sit in lack of understanding how ehcache really works or in lack of attention to specific settings. All the pitfalls discussed above may seem to be funny mistakes, but it’s surprising how often we make them in real projects. Hope this helps any of you to save some time on setting it up :)

Good luck!

[lunatech-blog]: https://blog.lunatech.com/
