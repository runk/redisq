
var assert = require("assert"),
    redisq  = require("../index");

describe("/index", function() {

    describe("#options", function() {
        it("should save settings passed to the func", function() {
            redisq.options({
                "redis": { "host": "127.0.0.1", "port": 6380 }
            });
            assert.equal(redisq.options().redis.host, "127.0.0.1");
            assert.equal(redisq.options().redis.port, 6380);
        });
        it("should update options once client is confugured", function() {
            redisq.options({
                "redis": { "host": "localhost", "port": 6379 }
            });

            assert.equal(redisq.options().redis.host, "localhost");
            assert.equal(redisq.options().redis.port, 6379);
        });
        it("should return options if no arguments were passed", function() {
            var opts = redisq.options();
            assert.equal(typeof opts, "object");
            assert.equal(typeof opts.redis, "object");
        });
    });

    describe("#queue", function() {
        it("new queue should be created", function() {
            var q = redisq.queue("test");
            assert.equal(typeof q, "object");
        });
    });

    describe("#hasQueue", function() {
        it("should return true for existed queue", function(done) {
            redisq.hasQueue("test", function(err, status) {
                assert.equal(err, null);
                assert.equal(status, true);
                done();
            });
        });
        it("should return false for non-existed queue", function(done) {
            redisq.hasQueue("test" + Math.random(), function(err, status) {
                assert.equal(err, null);
                assert.equal(status, false);
                done();
            });
        });
    });

    describe("#getQueues", function() {
        it("should return a key -> value hash", function(done) {
            redisq.getQueues(function(err, queues) {
                assert.equal(typeof queues, "object");
                assert.ok(Object.keys(queues).length > 0);
                assert.ok(queues.hasOwnProperty("test"));
                done();
            });
        });
    });
});
