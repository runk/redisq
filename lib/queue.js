var redis = require('redis'),
	Task = require('./task');

var Queue = (function(name, opts) {
	var self = this;

	var _counters = {
		pushed: 0,
		errors: 0,
		finished: 0
	};

	opts = opts || {};
	opts.redis = opts.redis || { "port": 6379, "host": "localhost", "options": null };

	var _client = redis.createClient(opts.redis.port, opts.redis.host, opts.redis.options);
	_client.on('connect', function() {
		_debug('connected to redis');
	});

	var _debugMode = false;

	this.name 			= name;
	this.worker 		= null;
	this.workersActive 	= 0;
	this.concurrency 	= 1;

	this.push = function(task, fn) {

		if (!task)
			throw new Error("task argument should be provided");

		if (typeof fn != "function")
			throw new Error("Callback function should be passed as second argument");

		var task = new Task(task);
		_counters.pushed++;
		_client.rpush(self.name, task.stringify(), function(err, res) {
			if (err) throw new Error(err);
			if (fn)  fn(null, true);
		});
	};

	this.len = function(fn) {

		if (typeof fn != "function")
			throw new Error("Callback function should be passed");

		_client.llen(self.name, function(err, length) {
			if (err) throw new Error(err);
			if (fn)  fn(null, length);
		});
	};

	this.purge = function(fn) {
		_client.del(self.name, function(err, res) {
			if (err) throw new Error(err);
			if (fn)  fn(null, true);
		});
	};

	this.process = function(worker, concurrency) {

		if (typeof worker != "function")
			throw new Error("worker function should be passed as an argument");

		if (typeof concurrency != "undefined") {
			if (typeof concurrency == "number")
				self.concurrency = concurrency;
			else
				throw new Error("concurrency argument should be integer");
		}

		self.worker = worker;
		while (self.workersActive < self.concurrency)
			_spawn();
	};

	function _spawn() {
		_client.lpop(self.name, function(err, tdata) {
			if (err) throw new Error(err);

			if (tdata) {
				var task = Task.parse(tdata);

 				/*
				stats
				time: started - create
				time: finished - created
				time: finished - started
				*/

				self.worker(task.getData(), function(err, res) {

					// var timeTaken = new Date().getTime() - task.getCreatedAt();
					// console.log(timeTaken);

					// on error: push task back to the queue?
					if (err) _counters.errors++;
					else     _counters.finished++;
					self.workersActive--;
					process.nextTick(_spawn);
				});
			} else {
				setTimeout(_spawn, 250);
				self.workersActive--;
			}
		});
		self.workersActive++;
	};

	function _debug() {
		if (_debugMode)
			console.log.apply(console, arguments);
	}
});

module.exports = Queue;


