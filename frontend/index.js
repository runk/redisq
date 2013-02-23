
var cp = require('child_process');

module.exports.listen = function(port, host, opts) {
    cp.fork(__dirname + '/cluster', [
        JSON.stringify({
            port: port,
            host: host,
            opts: opts
        })
    ]);
};