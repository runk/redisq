

var assert = require("assert"),
    Queue  = require("../lib/queue");

var qname = "test",
    qtask = JSON.stringify({ "one": 1, "two": 2, "three": 3 });

describe("/queue", function() {

    describe("#constructor", function() {
        it("should create new instance of the Queue", function() {
            var q = new Queue(qname);
            assert.equal(typeof q, "object");
            assert.equal(q.name, qname);
            assert.equal(q.worker, null);
            assert.equal(q.workersActive, 0);
            assert.equal(q.concurrency, 1);
        });
    });

    describe("#len", function() {
        it("should return a number", function(done) {
            var q = new Queue(qname);
            q.len(function(err, len) {
                assert.ok(isFinite(len));
                assert.ok(len > -1);
                done();
            });
        })
    });

    describe("#push", function() {
        var q = new Queue(qname);

        it("should create a new task", function(done) {
            q.push(qtask, function(err, res) {
                assert.equal(err, null);
                assert.equal(res, true);
                done();
            });
        });

        it("should raise and exception for empty task", function() {
            assert.throws(function() {
                q.push();
            }, Error);
        });

        it("should raise and exception for empty callback fn", function() {
            assert.throws(function() {
                q.push(qtask);
            }, Error);
        });
    });

    describe("#purge", function() {
        var q = new Queue(qname);

        it("should empty the queue", function(done) {
            q.purge(function(err, res) {
                assert.equal(err, null);
                assert.equal(res, true);
                done();
            });
        });

        it("should return len 0 for the queue", function(done) {
            q.len(function(err, res) {
                assert.equal(res, 0);
                done();
            });
        });

        it("should return len 1 after first push to the queue", function(done) {
            q.push(qtask, function(err, res) {
                assert.ok(res);
                q.len(function(err, res) {
                    assert.equal(res, 1);
                    done();
                });
            });
        });
    });

    describe("#process", function() {
        var q = new Queue(qname);
        var tasksn = 25;

        it("should create a bunch of tasks", function(done) {

            var tasksPushed = 0;
            var tasks = [];
            for (var i = 0; i < tasksn; i++)
                q.push('dummy', function(err, res) {
                    assert.equal(err, null);
                    assert.equal(res, true);
                    tasksPushed++;
                });

            setTimeout(function() {
                assert.equal(tasksn, tasksPushed);
                done();
            }, 10);
        });

        it("should start processing and maintain counters correct", function(done) {
            var finished = 0;
            function worker(task, cb) {

                assert.equal(q.workersActive <= 4, true);
                assert.equal(q.concurrency, 4);
                finished++;

                cb();

                if (finished == tasksn) {
                    setTimeout(function() {
                        assert.equal(q.workersActive, 0);
                        assert.equal(q.concurrency, 4);
                        done();
                    }, 10);
                }
            }

            q.process(worker, 4);
        });

        it("should return len 0 after full processing", function(done) {
            q.len(function(err, len) {
                assert.equal(len, 0);
                done();
            })
        });

    });

});
