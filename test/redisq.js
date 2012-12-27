
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
