
var _opts = { "port": 6379, "host": "localhost", "options": null },
	_client = null;

module.exports = (function() {
	if (_client == null) {
		_client = require('redis').createClient(_opts.port, _opts.host, _opts.options);
		_client.on('connect', function() {
			// _debug('connected to redis');
		});
	}
	return _client;
})();

module.exports.configure = function(opts) {
	_opts = opts;
};