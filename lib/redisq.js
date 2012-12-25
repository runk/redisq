
var self = this,
	_queues = {},
	Queue = require(__dirname + '/queue');

module.exports.queue = function(name) {
	if (!self.hasQueue(name)) {
		_queues[name] = new Queue(name);
	}
	return _queues[name];
};

module.exports.getQueues = function() {
	return _queues;
};

module.exports.hasQueue = function(name) {
	return name in _queues;
}
