
redisq
=====

Fast message processing queue backed up by redis and nodejs.

## Installation

    npm install redisq


## Usage

Sample code that shows how to create a new task and push it to the queue.

    var redisq = require('redisq');
    var queue = redisq.queue('dummy');
    queue.push({ "custom": "task data", "foo": { "bar": true }, "data": [10, 20] });

To process your messages you have to create one or multiply clients that will
'listen' for new tasks and handle them in appropriate way.

    var redisq = require('redisq'),
        queue = redisq.queue('dummy'),
        concurrency = 16;

    queue.process(function(task, done) {
        console.log(task);
        done(null, true);
    }, concurrency);

Please note that you have to call `done` function and pass error as the first argument
(if there are any) and result as a second argument.


## Frontend

Module has a useful frontend that you can use for monitoring of the queue status. To run
it use the following code:

    var frontend = require('redisq/frontend');
    frontend.listen(3000, "localhost", {
        "redis": {
            "host": "example.com",
            "port": 6379
        }
    });
