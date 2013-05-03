
redisq
=====

Fast message processing queue backed up by redis and nodejs.

## Installation

    npm install redisq


## Usage

Sample code that shows how to create a new task and push it to the queue.

    var redisq = require('redisq');
    redisq.options({ "redis": {
        "host": "example.com",
        "port": 6379
    }});

    var queue = redisq.queue('dummy');
    var task = { "foo": { "bar": true }, "data": [10, 20] };
    queue.push(task);

By default queue tries to establish a connection with redis server running on the localhost.
Otherwise you can change this behaviour by using `options` function.

    redisq.options({ "redis": {
        "host": "example.com",
        "port": 6379
    }});

To process your messages you have to create one or multiply clients that will
'listen' for new tasks and handle them in appropriate way.

    var redisq = require('redisq');
    redisq.options({ "redis": {
        "host": "example.com",
        "port": 6379
    }});

    var queue = redisq.queue('dummy'),
        concurrency = 16;

    queue.process(function(task, done) {
        console.log(task); // -> { "foo": { "bar": true }, "data": [10, 20] }
        done(null);
    }, concurrency);

Please note that you have to call `done` function and pass error as the first argument
(if there are any).

The second argument is optional data that will replace the current task (if it fails) with the new data. This can be used for keep track of the number of tries, or updating the data to be worked on based on certain fail conditions.

For example:

    var request = require("request");
    queue.process(function(task, done){
        request
            .get(task.url + "/api/data.json")
            .query({something: task.something})
            .end(function(err, res){
                if(err) {
                    //Retry the task with the same data
                    return done(err);
                }

                if(!res.results) {
                    //Update the task's url property to try a different version of the api
                    task.url = task.url + "/v2/";
                    return done(err, task);
                }

                //Otherwise everything is all good in the hood
                return done(null);
            });
    });

If task failed, it will be pushed back to the queue for another attempt.
Otherwise you can set a `retry` flag to false so failed tasks will be ignored.

    var queue = redisq.queue("myqueue");
    queue.retry = false;

## Frontend

Module has a useful frontend that you can use for monitoring of the queue status.
By default queue saves statistics to redis once a minute and stores it for 14 days.
To run it use the following code:

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

Frontend uses express framework and exposes `app` for customization, for example adding basic authentication:

    var
        frontend = require("./frontend"),
        express = require("express");

    frontend.app.use(express.basicAuth("user", "pass"));
    frontend.listen(3000);

Also you can setup your monitoring tools to check the queue health by using special `/status` uri:

    $ curl "http://localhost:3000/status"
    {
      "status": 200,
      "queued": 2651,
      "problems": {}
    }

This method returns `200` if everything is fine, otherwise status would be `500`. The check fetches
last 15 minutes of history and detects if your workers can't handle all tasks you create.




