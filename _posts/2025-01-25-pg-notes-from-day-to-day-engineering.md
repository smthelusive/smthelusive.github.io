---
layout: post
title:  "Postgres: notes from day-to-day engineering"
date:   2025-01-25 00:00:00 +0200
image: /assets/images/thumbnails/pg_elephant.png
excerpt: "As a software engineer, I learn something new every day simply by doing my job. This post contains three small tips
that I thought were worth noting down and might be useful for someone, or even for my future self..."
---

As a software engineer, I learn something new every day simply by doing my job. This post contains three small tips
that I thought were worth noting down and might be useful for someone, or even for my future self.

In this post, I talk about Postgres, but I guess these tips would apply similarly to other relational databases.
Beware: there might be traces of AWS here and there :)

### Transaction locks
Say we have a table, and we've created a unique constraint for the combination of two columns.
Now, let's imagine we have a query that is trying to insert 10k rows into this table. So far, so good.\
We even specify the conflict resolution policy for this insert: `ON CONFLICT ... DO NOTHING`, so if a conflicting record exists,
we're still proceeding without an issue. It's worth mentioning, though, that if a single query tries to insert the same
conflicting record twice, that will result in an error.

Now, let's imagine that this insert query runs in multiple concurrent transactions. If, by any chance, there’s a significant
overlap between the rows they are trying to insert... well, the transactions will spend quite some time waiting for each other.

What is going on? The transaction inserts values into two columns, and the combination of these values must be unique.
Before the transaction can `DO NOTHING` in case of conflict, it must lock the index to check whether the constraint is
violated in the first place. The other transaction tries to insert the same data, so it wants to lock the same index entry.
It waits until the first transaction releases the lock, so it can lock it afterward and perform the check.

It's not a big deal if it happens rarely, but it becomes a problem if the potential overlap between the rows inserted by
different transactions is significant.

In my case, I needed to upsert the records (insert if they don't conflict with existing ones, update otherwise).
To deal with this problem, I simply made sure that multiple transactions were not trying
to insert the same data, the challenge being that I couldn't control this from the point where I received the data.
So, an additional step was necessary: I added an intermediate table without a unique constraint and inserted everything there.
Since I'm in the AWS ecosystem, and the parallel transactions run in the form of concurrent Lambda instances triggered by SQS
messages, I leveraged message groups to ensure that specific data is processed by a single instance at a time.
The transactions were selecting and locking specific sets of data, aggregating them into the target table,
and cleaning them up - all in one go.

### Deadlocks
Deadlocks occur when your concurrent transactions block each other in a way that they can't proceed.
Why does this ever happen?
There are many possible scenarios. In our previous example, it could have happened because the transactions are locking
index entries for the unique constraint in the opposite order, causing them to block each other.

But let's take a look at a different example, where we have the tables `rovers` and `locations`.
The `rovers` table has column `location` with a foreign key constraint to the `id` column in `locations`.

The `locations` table contains the following data:

|id | name    |
|---|---------|
|1  | Mercury |
|2  | Venus   |
|3  | Earth   |
|4  | Moon    |
|5  | Mars    |

One transaction is trying to insert two records into `rovers`:
```
INSERT INTO rovers (id, name, location) VALUES
(1, 'LRV', 4),
(2, 'Curiosity', 5);
```

Another transaction is trying to insert two records at the same time:
```
INSERT INTO rovers (id, name, location) VALUES
(1, 'Opportunity', 5),
(2, 'LRV', 4);
```

Each row that we insert triggers a foreign key validation, so it has to lock the referenced rows in the `locations` table.
First transaction will validate the location ids: `4`, and then `5`. The other transaction wants to lock the ids in the
opposite order: `5`, and then `4`.
When the first transaction locks the `locations` table's row with id `4`, the second transaction locks id `5`.
The first transaction wants to proceed with `5`, but can't, because it's already locked by the second transaction.
The second transaction wants to proceed with `4`, but also can't, because it's locked by the first transaction.

There are many deadlock scenarios, but usually, they involve mutually attempting to lock resources already locked by other
transactions: rows, indexes... It can involve more than two transactions. Postgres is smart enough to detect when this
happens and roll back a transaction. But that's not always what we want.

The deadlock problem can also occur because of inefficient locking, for example, when the whole table is locked rather than
just the specific rows that are needed. This can be solved by adding some indexes, which reduces the probability of a deadlock,
but does not fully eliminate it.

Probably anyone who has ever dealt with database deadlocks knows one of the most basic cures: **sorting**.
The problem in our example can be solved by ensuring that all transactions obtain locks in the same order:
before inserting into `rovers`, we can order the records by the `location` value.

Sometimes, it's not that simple. What if the table has two columns with foreign keys referencing the same column?
Deadlocks are sometimes unavoidable with certain constraint choices - something worth considering while designing the
database structure...

### Composite indexes and variance
This is a small one, and it has to do with multi-column indexes.

For example, we have a `mission_log` table with the columns: `spacecraft`, `astronaut`, `operation`, and `log` (good examples are hard).
There's a single spacecraft assigned to a mission, and there are multiple astronauts on a spacecraft, each astronaut
can have multiple tasks or operations on a mission that nobody else will have.

Let's say we've created a composite primary key on the columns `(spacecraft, astronaut, operation)`.
However, there's a greater variance of operations than there's of astronauts, and a greater variance of astronauts
than of spacecrafts.

To look up a specific `log`, it's more efficient to start filtering by the column that
has the greatest variance. This way, we narrow down the lookup a lot faster by filtering by `operation` first,
rather than by `spacecraft`. The most efficient way to order the columns in this primary key would be:
`(operation, astronaut, spacecraft)`.

### Conclusion
There is no such thing as a universal solution to a problem. There are too many shapes and flavors of them, even in the
category of locks alone. These are some very specific use cases that I personally encountered, and yours can differ so significantly that my tips won't help. However, it's good to know about these potential problems before they
happen and have some idea of which direction to look in.

Not all problems are even worth solving.\
And often, too often, it comes down to thinking about your real use cases at the moment of designing the system.

See you in the next one 😎.