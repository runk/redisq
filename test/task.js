var assert = require('assert'),
    Task  = require('../lib/task');

var qtask = {one: 1, two: 2, three: 3};

describe('/lib/task', function() {

    describe('#constructor', function() {
        it('should create new instance of the Task', function() {
            var t = new Task(qtask);
            assert.equal(typeof t, 'object');
        });

        it('should have required methods', function() {
            // static
            assert.equal(typeof Task.parse, 'function');

            var t = new Task(qtask);
            assert.equal(typeof t.stringify, 'function');
            assert.equal(typeof t.normalize, 'function');
            assert.equal(typeof t.getData, 'function');
        });
    });

    describe('#normalize', function() {
        it('should return normalized task object', function() {
            var now = new Date().getTime();

            var t = new Task(qtask);
            var i = t.normalize();

            assert.equal(i.version, 0);
            assert.equal(Math.round(i.created_at/1000), Math.round(now/1000));
            assert.equal(i.attempts, 0);
            assert.equal(i.data, qtask);
        });
    });

    describe('#stringify', function() {
        it('should return raw json object', function() {
            var t = new Task(qtask);
            var raw = JSON.parse(t.stringify());
            assert.equal(typeof raw, 'object');
            assert.equal(Object.keys(raw).length, 4);
        });
    });

    describe('#parse', function() {
        var tdata = '[0,1356374139227,{"one":1,"two":2},0]';
        it('should return new task with defined params', function() {
            var t = Task.parse(tdata);
            assert.equal(t.stringify(), tdata);

            var i = t.normalize();

            assert.equal(i.version, 0);
            assert.equal(i.created_at, 1356374139227);
            assert.equal(i.attempts, 0);
            assert.equal(JSON.stringify(i.data), '{"one":1,"two":2}');
        });
    });
});
