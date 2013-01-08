
redisq
=====

Fast message processing queue backed up by redis and nodejs.

## Installation

    npm install redisq


## Usage

Sample code that shows how to create a new task and push it to the queue.

    var redisq = require('redisq');
    var queue = redisq.queue('dummy');
    var task = { "foo": { "bar": true }, "data": [10, 20] };
    queue.push(task);

To process your messages you have to create one or multiply clients that will
'listen' for new tasks and handle them in appropriate way.

    var redisq = require('redisq'),
        queue = redisq.queue('dummy'),
        concurrency = 16;

    queue.process(function(task, done) {
        console.log(task); // -> { "foo": { "bar": true }, "data": [10, 20] }
        done(null, true);
    }, concurrency);

Please note that you have to call `done` function and pass error as the first argument
(if there are any) and result as a second argument.

If you task was failed, the queue code pushes it back to the queue for another attempt.


## Frontend

Module has a useful frontend that you can use for monitoring of the queue status. To run
it use the following code:

    var frontend = require('redisq/frontend');
    frontend.listen();

![frontend](http://i.steppic.com/6/b/9/5/6b95ef357cbd101529e48d011349e1c7/0.png)

In case if you want to customize host, port etc, you can pass additional arguments to the `listen` metod:

    var frontend = require('redisq/frontend');
    frontend.listen(3000, "localhost", {
        "redis": {
            "host": "example.com",
            "port": 6379
        }
    });

By default queue saves statistics to redis once a minute and stores it for 1 day (24 hrs).