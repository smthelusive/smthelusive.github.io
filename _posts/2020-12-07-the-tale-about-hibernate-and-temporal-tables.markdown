---
layout: post
title:  "The tale about Hibernate and temporal tables"
date:   2020-12-07 12:00:00 +0200
categories: hibernate java temporal mssql
image: temporal_thumbnail.png
excerpt: "Earlier this year, I was involved in solving an issue on a project that was using Hibernate + Envers and Microsoft SQL Server as the database. The choice of database was mainly driven by a project requirement to have history..."
---
<em>This article was first published at [Lunatech blog][lunatech-blog]</em>

#### Foreword
Earlier this year, I was involved in solving an issue on a project that was using [Hibernate][hibernate] + [Envers][envers] and Microsoft SQL Server as the database. The choice of database was mainly driven by a project requirement to have history data which is provided by temporal tables. In the Java code that is used to query the database, there is an entity class for historical data named `VersionedRecord`, which is a `@MappedSuperclass`, and a couple of entities are extending it.

Much to our surprise, when we fetched data, something unexpected happened: Hibernate returned the correct number of records, but it repeated the data for the first row, effectively ignoring the rest of the result set! Some investigation showed that this is caused by Hibernate’s first-level caching, and we had to look for some trick to overcome this without changing the `VersionedRecord` entity class. The main goal was to make a change as painless as possible and avoid changes in the entity class: creating an extra entity class just for this purpose seemed like an overkill.

In the remainder of this article, I will explain what happened on a clean and simple example that was used to experiment, and also share a trick that we used to solve the problem. Hopefully this will be useful for someone else.

#### The experiment
To make the experiment clean, I used only Hibernate with nothing on top of it. First of all, I created a table with history table like this:

{% highlight sql %}
CREATE TABLE Department
(
DeptID INT NOT NULL PRIMARY KEY CLUSTERED
, DeptName VARCHAR(50) NOT NULL
, SysStartTime DATETIME2 GENERATED ALWAYS AS ROW START NOT NULL
, SysEndTime DATETIME2 GENERATED ALWAYS AS ROW END NOT NULL
, PERIOD FOR SYSTEM_TIME (SysStartTime, SysEndTime)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.DepartmentHistory));
{% endhighlight %}

This example comes from the [official documentation][official-documentation] about temporal tables.

With the table definition in place, I added some records to it:

{% highlight sql %}
insert into department (deptid, deptname) values (1, 'test1');
insert into department (deptid, deptname) values (2, 'test2');
{% endhighlight %}

And update some records so history table will also get filled:

{% highlight sql %}
update department set deptname = 'updated' where deptid = 1;
update department set deptname = 'updated_again' where deptid = 1;
update department set deptname = 'updated2' where deptid = 2;
{% endhighlight %}

if we query the history table:

{% highlight sql %}
select * from departmenthistory;
{% endhighlight %}

we will see information like this:

![DB result](/assets/images/hibernate/db_result_1.png)

The department with `DeptId = 1` was updated twice, so both old values are here and department with `DeptId = 2` was updated once, so one old value of this record is also in the history table now.

And if we want to query all history records for department with `DeptId = 1` we will do this:

{% highlight sql %}
select * from departmenthistory where deptid = 1;
{% endhighlight %}

And will get this result:

![DB result](/assets/images/hibernate/db_result_2.png)

So, that works as advertised! Now let’s use Hibernate with just a small piece of code to run a native query:

{% highlight java %}
Query q = entityManager.createNativeQuery("select DeptId, DeptName 
from DepartmentHistory where DeptId = 1");
{% endhighlight %}

The result is the following (which completely makes sense):

{% highlight xml %}
1 test1
1 updated
{% endhighlight %}

Now we can create an Entity to easily operate with the data:

{% highlight java %}
@javax.persistence.Entity
@Table(name = "DepartmentHistory")
public class DepartmentHistory {

    @Id
    @Column(name = "DeptId")
    private int DeptId;

    @Column(name="DeptName")
    private String DeptName;

// other fields and getters and setters…

}
{% endhighlight xml %}

...and map our result properly to our entity:

{% highlight java %}
Query q = entityManager
.createNativeQuery("select * from DepartmentHistory where DeptId = 1",
DepartmentHistory.class);
{% endhighlight %}

We expect to get the same result, but this is what we get instead:

{% highlight xml %}
1 test1
1 test1
{% endhighlight %}

So we get two rows, but they contain the **<em>same</em>** values. If there were more rows, they would all return the same data. This happens because of hibernate’s first-level caching. Because all rows have the same ID, when we execute this query, Hibernate caches the result on the first row and reuses it for the rest of the rows.

First level caching can not be turned off, there is no "nice and easy" way to solve this issue and have Hibernate properly working with temporal tables.

Although...

**...here is how we can trick Hibernate:**

{% highlight java %}
Query q = entityManager.createNativeQuery("SELECT ROW_NUMBER() 
OVER (ORDER BY deptid ASC) AS DeptId, * from DepartmentHistory where DeptId = 1",
DepartmentHistory.class);
{% endhighlight %}

We provide Hibernate with another (fake) DeptId, which is in fact the row count. This value will be different for each row and hibernate won’t be reusing the result that it cached for the first row. Instead it will fetch every row. It is important to let the “fake” DeptId go first, so the real DeptId will be ignored during conversion of result to our entity. So, when we run it like that, the result is:

{% highlight xml %}
1 test1
2 updated
{% endhighlight %}

If we run this query without hibernate, this is what we will see:

![DB result](/assets/images/hibernate/db_result_3.png)

There is a duplicate column for DeptId, and only the first one is used by Hibernate.

#### Conclusion
Of course, the result is not as clean as we would like: we still have fake IDs instead of the original ones, but this is how you can trick Hibernate without changing your domain. This solution makes sense only if we don’t care about the original ID (in our example we filter by original ID so we already know it anyway). If we select everything from the history table without filtering by ID, the result will be a mess:

{% highlight xml %}
1 test1
2 updated
3 test2
{% endhighlight %}

There is no other easy 'trick' to get around this without changing your domain. But if you do the latter for this specific case, it may be a problem for normal queries, just keep that in mind.

Entity class for history table can be really painful. Because IDs are not unique, you can’t even use:

{% highlight java %}
entityManager.find(...)
{% endhighlight %}

In order to make a clean solution you will need to think about the way to generate unique IDs on the Java side. One more thing to keep in mind is that row ID is not a reliable identifier, so it’s not recommended to use it for your unique ID.

<em>thanks Willem-Jan Glerum for introducing me to this interesting behaviour</em>

[lunatech-blog]: https://blog.lunatech.com/
[hibernate]: https://hibernate.org/
[envers]: https://hibernate.org/orm/envers
[official-documentation]: https://docs.microsoft.com/en-us/sql/relational-databases/tables/creating-a-system-versioned-temporal-table?view=sql-server-ver15
