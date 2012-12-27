
var Task = (function(task) {

	var FIELD_VERSION    = 0,
		FIELD_CREATED_AT = 1,
		FIELD_DATA       = 2,
		FIELD_ATTEMPTS   = 3;

	var _normalizeMap = {
		"version":    FIELD_VERSION,
		"created_at": FIELD_CREATED_AT,
		"data": 	  FIELD_DATA,
		"attempts":   FIELD_ATTEMPTS
	};

	var _task = [];
	_task[FIELD_VERSION]    = 0;
	_task[FIELD_CREATED_AT] = new Date().getTime();
	_task[FIELD_DATA]       = task || null;
	_task[FIELD_ATTEMPTS]   = 0;

	this.parse = function(tdata) {
		if (typeof tdata != "string")
			throw new Error("Invalid task data");

		try {
			_task = JSON.parse(tdata);
		} catch (e) {
			throw new Error("Task.parse: couldn't parse JSON task data");
		}

		return this;
	}

	this.stringify = function() {
		return JSON.stringify(_task);
	};

	this.normalize = function() {
		var info = {};
		for (var key in _normalizeMap) {
			info[key] = _task[_normalizeMap[key]];
		}
		return info;
	};

	this.getData = function() {
		return _task[FIELD_DATA];
	};

	this.getCreatedAt = function() {
		return _task[FIELD_CREATED_AT];
	};

});

Task.parse = function(tdata) {
	return new Task().parse(tdata);
};

module.exports = Task;
