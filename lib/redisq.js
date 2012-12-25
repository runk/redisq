
var _queues = {},
	Queue = require(__dirname + '/queue');

module.exports.queue = function(name, opts) {
	if (!this.hasQueue(name)) {
		_queues[name] = new Queue(name, opts);
	}
	return _queues[name];
};

module.exports.getQueues = function() {
	return _queues;
};

module.exports.hasQueue = function(name) {
	return name in _queues;
};
