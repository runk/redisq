var assert = require('assert'),
  redis = require('../lib/redis');


describe('/lib/redis', function() {

  describe('options()', function() {
    it('should return default options', function() {
      var opts = redis.options();
      assert.equal(opts.port, 6379);
      assert.equal(opts.host, 'localhost');
      assert.equal(opts.options, null);
    });

    it('should set new options', function() {
      redis.options({host: 'example.com', port: 1234});
      var opts = redis.options();
      assert.equal(opts.port, 1234);
      assert.equal(opts.host, 'example.com');
    });

    it('should override options', function() {
      redis.options({host: 'example2.com', port: 12345});
      var opts = redis.options();
      assert.equal(opts.port, 12345);
      assert.equal(opts.host, 'example2.com');
    });
  });


  describe('client()', function() {

    it('should assign given redis client', function() {
      function RedisClient() {}
      RedisClient.prototype.foo = 'bar';

      redis.client(new RedisClient);
      assert.equal(redis.client().foo, 'bar');
      redis.client(null);
    });

    it('should return redis client', function() {
      redis.options({
        host: 'localhost',
        port: 6379
      });
      var cli = redis.client();
      assert.equal(typeof cli, 'object');
    });
  });

});
