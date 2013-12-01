
redisq [![Build Status](https://travis-ci.org/runk/redisq.png)](https://travis-ci.org/runk/redisq)
=====

Fast message processing queue backed up by redis and nodejs.

## Installation

    npm install redisq


## Usage

Sample code that shows how to create a new task and push it to the queue.

```javascript
var redisq = require('redisq');
redisq.options({redis: {
  host: 'example.com',
  port: 6379
}});

var queue = redisq.queue('dummy');
var task = {foo: {bar: true}, data: [10, 20]};
queue.push(task);
```

By default queue tries to establish a connection with redis server running on the localhost.
Otherwise you can change this behaviour by using `options` function. Alternatively you can
provide a ready-to-go *redis* client.

```javascript
redisq.options({redis: {
  host: 'example.com',
  port: 6379
}});

// or
var myClient = require('redis').createClient(6379, 'example.com');
redisq.options({redis: myClient});

```

To process your messages you have to create one or multiply clients that will
'listen' for new tasks and handle them in appropriate way.

```javascript
var redisq = require('redisq');
redisq.options({redis: {
  host: 'example.com',
  port: 6379
}});

var queue = redisq.queue('dummy'),
    concurrency = 16;

queue.process(function(task, cb) {
  console.log(task); // -> { "foo": { "bar": true }, "data": [10, 20] }
  cb(null);
}, concurrency);
```

Please note that you have to call `cb` function and pass error as the first argument
(if there are any).


### Changing tasks while processing

The second argument is optional data that will replace the current task (if it fails) with the new data. This can be used for keep track of the number of tries, or updating the data to be worked on based on certain fail conditions.

For example:

```javascript
var request = require("request");
queue.process(function(task, cb) {
  request(task.url + "/api/data.json", function(err, res, body) {
    // Retry the task with the same data
    if (err)
      return cb(err);

    if (res.statusCode !== 200) {
      // Update the task's url property to try a different version of the api
      task.url = task.url + "/v2/";
      return cb(err, task);
    }

    //Otherwise everything is all good in the hood
    return cb(null);
  });
});
```

If task failed, it will be pushed back to the queue for another attempt.
Otherwise you can set a `retry` flag to false so failed tasks will be ignored.

```javascript
var queue = redisq.queue("myqueue");
queue.retry = false;
```


### Pause / resume processing

Optionally, you can pause the queue in the event your downstream prerequisites have
failed. You can pause processing anytime by calling `queue.pause()`. Once the queue
is ready to proceed, call `queue.resume()`.

```javascript
var queue = redisq.queue('dummy');
queue.process(function(task, cb) {
  // check whether your system ready for new tasks
  if (isPauseRequired()) {
    // pause if not
    queue.pause()
    // resume to processing in 5 seconds
    setTimeout(function() { queue.resume() }, 5000);

    // task won't be lost if you return an error
    return cb(new Error('It is better to wait..'));
  }
  cb(null);
});
```

## Frontend

Module has a useful frontend that you can use for monitoring of the queue status.
By default queue saves statistics to redis once a minute and stores it for 14 days.
To run it use the following code:

```javascript
var frontend = require('redisq/frontend');
frontend.listen();
```

![frontend](http://i.steppic.com/6/b/9/5/6b95ef357cbd101529e48d011349e1c7/0.png)

In case if you want to customize host, port or provide a callback, you can pass additional arguments to the `listen` metod:

```javascript
var frontend = require('redisq/frontend'),
  options = {
    redis: {
      host: 'example.com',
      port: 6379
    }
  };

// frontend.listen(port, [hostname], [options], [callback])
frontend.listen(3000, 'localhost', options, function() {
    console.log("Redisq frontend running on port 3000");
});
```

Frontend uses express framework and exposes `app` for customization, for example adding basic authentication:

```javascript
var frontend = require("./frontend"),
  express = require("express");

frontend.app.use(express.basicAuth("user", "pass"));
frontend.listen(3000);
```

Also you can setup your monitoring tools to check the queue health by using special `/status` uri:

```shell
$ curl "http://localhost:3000/status"
{
  "status": 200,
  "queued": 2651,
  "problems": {}
}
```

This method returns `200` if everything is fine, otherwise status would be `500`. The check fetches
last 15 minutes of history and detects if your workers can't handle all tasks you create.
