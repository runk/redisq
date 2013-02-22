var assert = require("assert"),
    Stats = require("../lib/stats");


describe("/lib/stats", function() {
    describe("#parseAndGroup", function() {
        var qrecords = [
            '[1360684264000,100,10,1,200,500,1000]',
            '[1360684264000,200,20,2,250,550,2000]',
            '[1360684265000,300,30,3,300,600,3000]',
            '[1360684265000,400,40,4,350,650,4000]',
            '[1360684265000,500,50,5,400,700,5000]',
            '[1360684267000,600,60,6,450,750,6000]',
            '[1360684367000,100,10,1,450,750,6001]'
        ];

        var good = {
            1360684320000: '[1360684320000,100,10,1,450,750,6001]',
            1360684260000: '[1360684260000,2100,210,21,1950,3750,21000]'
        };

        var qstats = new Stats("test"),
            res = qstats.parseAndGroup(qrecords, 60000);

        it("should melt rows and return only two", function() {
            assert.equal(Object.keys(good).length, Object.keys(good).length);
        });

        it("should return proper values", function() {
            for (var date in res)
                assert.equal(JSON.stringify(res[date]), good[date]);
        });
    });

    describe("#erase", function() {
        var s = new Stats('test');

        s.cnt.failed++;
        s.cnt.processed++;
        s.cnt.created++;
        s.cnt.timeStarted++;
        s.cnt.timeProcessed++;
        s.cnt.timeFinished++;

        it('should set all counters to 0', function() {
            s.erase();

            for (var cname in s.cnt)
                assert.equal(s.cnt[cname], 0);
        });
    });

    describe("#getGroupingValue", function() {
        var s = new Stats('test');

        it('should return minutes', function() {
            assert.equal(s.getGroupingValue(120), 60000);
        });

        it('should return hours', function() {
            assert.equal(s.getGroupingValue(1000), 3600000);
        });

        it('should return days', function() {
            assert.equal(s.getGroupingValue(9999), 3600000 * 24);
        });
    });

});