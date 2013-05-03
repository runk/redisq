

var assert = require("assert"),
    Queue  = require("../lib/queue"),
    redisq = require("../lib/redisq");

var qname = "test",
    qtask = JSON.stringify({ "one": 1, "two": 2, "three": 3 });

describe("/lib/queue", function() {

    describe("#constructor", function() {
        it("should create new instance of the Queue", function() {
            var q = new Queue(qname);
            assert.equal(typeof q, "object");
            assert.equal(q.name, qname);
            assert.equal(q.worker, null);
            assert.equal(q.workersActive, 0);
            assert.equal(q.concurrency, 1);
            assert.equal(typeof q.stats, "function");
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

        it("should raise an exception for empty task", function() {
            assert.throws(function() {
                q.push();
            }, Error);
        });

        it("should not raise an exception for a call without fn arg", function() {
            q.push(qtask);
        });

        it("should raise an exception for a non-function second arg", function() {
            assert.throws(function() {
                q.push('a', 'b');
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

    describe("#unregister", function() {
        it("should unregister the queue", function(done) {
            var q = new Queue(qname);
            q.unregister(function() {
                redisq.getQueues(function(err, queues) {
                    assert.ok(!(qname in queues));
                    done();
                });
            })
        });
    });

    describe("#register", function() {
        it("should register the queue", function(done) {
            var q = new Queue(qname);
            q.register(function() {
                redisq.getQueues(function(err, queues) {
                    assert.ok(qname in queues);
                    done();
                });
            })
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

        it("should not lose a task if it failed the first time", function(done) {
            var first = true;
            var processed = 0;
            var worker = function(task, cb) {
                if (first) {
                    first = false;
                    cb(true, null);
                } else {
                    cb(null, true);
                    setTimeout(checks, 10);
                }
                processed++;
            };

            var checks = function() {
                assert.equal(processed, 2);
                q.len(function(err, len) {
                    assert.equal(len, 0);
                    done();
                });
            };

            q.purge(function(err, res) {
                q.len(function(err, len) {

                    assert.equal(len, 0);

                    q.push('dummy', function(err, res) {
                        assert.ok(res);
                        q.process(worker, 4);
                    });
                });
            });
        });

        it("should process all failed tasks", function(done) {
            var tasks = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0, i: 0, j: 0 };
            var processed = 0;

            var worker = function(task, cb) {
                var err = Math.random() < 0.5;
                tasks[task] = err ? 0 : 1;
                cb(err ? err : null, err ? null : true);

                processed++;

                var total = 0;
                for (var t in tasks)
                    total += tasks[t];

                // ckeck whether all tasks were processed or not
                if (total == Object.keys(tasks).length) {
                    q.len(function(err, len) {
                        assert.equal(len, 0);
                        assert.ok(processed > Object.keys(tasks).length);
                        done();
                    });
                }
            };

            for (var t in tasks)
                q.push(t, function() {});

            q.process(worker, 4);
        });

        it("should update a task on failure", function(done){
            
            var work = 0;
            var worker = function(task, cb) {
                if(work > 0) {
                    assert.equal(task.err, false);
                    assert.equal(task.yay, 1);
                    return done();
                } else {
                    work++;
                    assert.equal(task.err, true);
                    assert.equal(task.yay, 0);
                }
               
                if(task.err) {
                    task.err = false;
                    task.yay = 1;
                    cb(true, task);
                } else {
                    cb(null);
                }
            };

            q.push({ err: true, yay: 0 }, function(err,res){
                q.process(worker, 1);    
            });
            
        });

    });

});
