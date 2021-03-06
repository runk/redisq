var assert = require('assert'),
  Queue  = require('../lib/queue'),
  redisq = require('../lib/redisq');

var qname = 'test',
  qtask = JSON.stringify({one: 1, two: 2, three: 3});

describe('/lib/queue', function() {

  var q;
  var tasksn = 25;

  beforeEach(function(done) {
    q = new Queue(qname);
    q.spawnTimeout = 25;
    q.purge(done);
  });

  beforeEach(function(done) {
    var pushed = 0;
    for (var i = 0; i < tasksn; i++)
      q.push('dummy' + i, function(err, res) {
        assert.equal(err, null);
        assert.equal(res, true);
        if (++pushed == tasksn) done();
      });
  });

  afterEach(function(done) {
    q.purge(function(err) {
      q.destroy();
      delete(d);
      done(err);
    });
  });


  describe('constructor()', function() {
    it('should create new instance of the Queue', function() {
      assert.equal(typeof q, 'object');
      assert.equal(q.name, qname);
      assert.equal(q.worker, null);
      assert.equal(q.workersActive, 0);
      assert.equal(q.concurrency, 1);
      assert.equal(typeof q.stats, 'function');
    });
  });


  describe('len()', function() {
    it('should return a number', function(done) {
      q.len(function(err, len) {
        assert.ok(isFinite(len));
        assert.ok(len > -1);
        done();
      });
    })
  });


  describe('push()', function() {

    it('should create a new task', function(done) {
      q.push(qtask, function(err, res) {
        assert.equal(err, null);
        assert.equal(res, true);
        done();
      });
    });

    it('should raise an exception for empty task', function() {
      assert.throws(function() {
        q.push();
      }, Error);
    });

    it('should not raise an exception for a call without fn arg', function() {
      q.push(qtask);
    });

    it('should raise an exception for a non-function second arg', function() {
      assert.throws(function() {
        q.push('a', 'b');
      }, Error);
    });
  });


  describe('purge()', function() {
    it('should empty the queue', function(done) {
      q.purge(function(err, res) {
        assert.equal(err, null);
        assert.equal(res, true);
        q.len(function(err, res) {
          assert.equal(err, null);
          assert.equal(res, 0);
          done();
        });
      });
    });

    it('should return len 1 after first push to the queue', function(done) {
      q.push(qtask, function(err, res) {
        assert.ok(res);
        q.len(function(err, res) {
          assert.equal(res, 26);
          done();
        });
      });
    });
  });


  describe('unregister()', function() {
    it('should unregister the queue', function(done) {
      q.unregister(function() {
        redisq.getQueues(function(err, queues) {
          assert.ok(!(qname in queues));
          done();
        });
      })
    });
  });


  describe('register()', function() {
    it('should register the queue', function(done) {
      q.register(function() {
        redisq.getQueues(function(err, queues) {
          assert.ok(qname in queues);
          done();
        });
      })
    });
  });


  describe('process()', function() {

    it('should start processing and maintain counters correct', function(done) {
      var finished = 0;
      var worker = function(task, cb) {
        assert.equal(q.workersActive <= 4, true);
        assert.equal(q.concurrency, 4);
        finished++;

        if (finished == tasksn)
          setTimeout(checkLen, 25);

        cb();
      }

      var checkLen = function() {
        assert.equal(q.workersActive, 0);
        assert.equal(q.concurrency, 4);
        q.len(function(err, len) {
          assert.equal(err, null);
          assert.equal(len, 0);
          done()
        });
      }

      q.process(worker, 4);
    });

    it('should not lose a task if it failed the first time', function(done) {
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
          assert.equal(err, null);
          assert.equal(len, 0);
          done();
        });
      };

      // leave 1 task only
      q.purge(function(err, res) {
        q.len(function(err, len) {
          assert.equal(err, null);
          assert.equal(len, 0);

          q.push('dummy', function(err, res) {
            assert.ok(res);
            q.process(worker, 4);
          });
        });
      });
    });

    it('should process all failed tasks', function(done) {
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

      q.process(worker, 10);
    });

    it('should update a task on failure', function(done){
      var work = 0;
      var worker = function(task, cb) {
        if (work > 0) {
          assert.equal(task.err, false);
          assert.equal(task.value, 'new value');
          cb(null);
          return done();
        } else {
          work++;
          assert.equal(task.err, true);
          assert.equal(task.value, 'old value');
        }

        if (task.err) {
          cb(true, {err: false, value: 'new value'});
        } else {
          cb(null);
        }
      };

      // empty the queue and add some stuff
      q.purge(function(err, res) {
        if (err) return done(err);
        q.push({err: true, value: 'old value'}, function(err, res) {
          if (err) return done(err);
          q.process(worker, 1);
        });
      });
    });
  });


  describe('pause()', function() {
    it('should process 10 items and stop', function(done) {
      var finished = 0,
        paused = false;

      var worker = function(task, cb) {
        if (paused)
          throw new Error('Should not reach here');

        if (++finished === 10) {
          paused = true;
          q.pause();
          setTimeout(checkLen, 50);
        }

        return cb(null);
      }

      function checkLen() {
        q.len(function(err, len) {
          assert.equal(err, null);
          assert.equal(len, 15);
          done();
        });
      }

      q.process(worker, 1);
    });
  });


  describe('resume()', function() {

    it('should set active prop to true', function() {
      assert.equal(q.active, true);
      q.pause();
      assert.equal(q.active, false);
      q.resume();
      assert.equal(q.active, true);
    });

    it('should process 10 items, stop and then resume', function(done) {
      var finished = 0,
        active = false,
        lock = null;

      function resumeProcessing() {
        assert.equal(active, false)
        q.resume();
        active = true;
        lock = null;
      };

      var workerPauseRes = function(task, cb) {
        if (!active && lock)
          throw new Error('Should not reach here');

        if (++finished === 10) {
          active = false;
          q.pause();

          // simulate some delay in processing
          lock = setTimeout(resumeProcessing, 50);
        }

        if (finished === tasksn)
          checkLen();

        return cb(null);
      }

      var checkLen = function() {
        q.len(function(err, len) {
          assert.equal(err, null);
          assert.equal(len, 0);
          done();
        });
      }

      q.process(workerPauseRes, 1);
    });

  });

});
