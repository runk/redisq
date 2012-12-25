
var assert = require("assert"),
    redisq  = require("../index");

describe("/index", function() {

    describe("#queue", function() {
        it("new queue should be created", function() {
            var q = redisq.queue("test");
            assert.equal(typeof q, "object");
        });
    });

    describe("#hasQueue", function() {
        it("should return a true for existed queue", function() {
            assert.ok(redisq.hasQueue("test"));
        });
    });

    describe("#getQueues", function() {
        it("should return a key -> value hash", function() {
            var queues = redisq.getQueues();
            assert.equal(typeof queues, "object");
            assert.equal(Object.keys(queues).length, 1);
            assert.ok(queues.hasOwnProperty("test"));
        });
    });
});
