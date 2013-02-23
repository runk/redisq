
var _opts = { "port": 6379, "host": "localhost", "options": null },
	_client = null;

function _createClient() {
    _client = require('redis').createClient(_opts.port, _opts.host, _opts.options);

    if (_opts.password)
        _client.auth(_opts.password, function(err) {
            if (err) {
                console.log('Redis error', err);
                throw new Error(err);
            }
        });

    _client.on('error', function (err) {
        console.log('Redis error', err);
        throw new Error(err);
    });
};

module.exports.client = function() {
    if (_client === null)
        _createClient();

    return _client;
};

module.exports.options = function(opts) {
    if (typeof opts == 'undefined')
        return _opts;

    _opts = opts;

    if (_client === null)
        _createClient();
};
