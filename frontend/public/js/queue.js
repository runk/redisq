$(document).ready(function() {

  var _last       = '',
    _chart        = null,
    _extremes     = { min: 0, max: 0 },
    _lastExtremes = { min: 0, max: 0 },
    _dragging     = Date.now(),
    _draggingTimer = null;

  var SERIES_PROCESSED = 0,
      SERIES_FAILED    = 1,
      SERIES_BACKLOG   = 2;

  function _createChart(stats) {
    var ndata = stats.history.processed.concat([[ new Date().getTime(), null ]]);

    Highcharts.setOptions({
      global: {
        useUTC: false
      }
    });

    _chart = new Highcharts.StockChart({
      rangeSelector: {
        inputEnabled: false,
        buttons: [
            { type: 'hour', count: 1, text: '1h' },
            { type: 'hour', count: 6, text: '6h' },
            { type: 'hour', count: 12, text: '12h' },
            { type: 'day', count: 1, text: '1d' },
            { type: 'all', text: 'all' }
        ],
        selected: 2
      },
      chart: {
        renderTo: 'chartbox',
        events: {
          redraw: function() {
            _extremes.min = parseInt(this.xAxis[0].min);
            _extremes.max = parseInt(this.xAxis[0].max);
            _afterSetExtremes();
          }
        }
      },
      title: { text: null },
      plotOptions: {
        spline: {
          marker : { enabled : true, radius : 3 },
          shadow : true
        }
      },
      series: [{
          name: 'Processed',
          data: stats.history.processed,
          type: 'spline',
          color: '#393',
          dataGrouping: { enabled: false }
      }, {
          name: 'Failed',
          data: stats.history.failed,
          type: 'spline',
          color: '#903',
          dataGrouping: { enabled: false }
      }, {
          name: 'Backlog',
          data: stats.history.backlog,
          type: 'spline',
          color: '#f66',
          dataGrouping: { enabled: false }
      }],
      xAxis : {
        // events : { afterSetExtremes: _afterSetExtremes },
        minRange: 2 * 3600 * 1000
      },
      navigator : {
        adaptToUpdatedData: false,
        series: { data: ndata }
      }
    });
  }

  function _afterSetExtremes(e) {

    _dragging = Date.now();

    if (_draggingTimer)
      return;

    _draggingTimer = setInterval(function() {
      if (Date.now() - _dragging < 1000)
        return;

      clearInterval(_draggingTimer);
      _draggingTimer = null;

      if (_extremes.min == _lastExtremes.min && _extremes.max == _lastExtremes.max)
        return;

      _chart.showLoading('Loading data from server...');

      _lastExtremes.min = _extremes.min;
      _lastExtremes.max = _extremes.max;

      $.getJSON("/queues/" + qname + "/history", { last: _last, min: _extremes.min, max: _extremes.max }, function(stats) {
        if (stats.history) {
          _chart.series[SERIES_PROCESSED].setData(stats.history.processed);
          _chart.series[SERIES_FAILED].setData(stats.history.failed);
          _chart.series[SERIES_BACKLOG].setData(stats.history.backlog);
        }

        _chart.hideLoading();
        _last = stats.sig;
      });
    }, 500);

  };

  function _getCounters() {
    $.getJSON("/queues/" + qname + "/counters", function(stats) {
      $("ul.thumbnails.queue-counters h3.queued").html(addCommas(stats.counters.queued));
      $("ul.thumbnails.queue-counters h3.processed").html(addCommas(stats.counters.processed));
      $("ul.thumbnails.queue-counters h3.failed span").html(addCommas(stats.counters.failed));
      $("ul.thumbnails.queue-counters h3.failed small").html(
        (stats.counters.failed*100/(stats.counters.processed + stats.counters.failed) || 0).toFixed(2) + '%'
      );
    });
  }
  setInterval(_getCounters, 10000);

  $.getJSON("/queues/" + qname + "/history", { last: _last }, function(stats) {
    _createChart(stats);
    _last = stats.sig;
  });

  $('#btnResetCounters').click(function() {
    $.post("/queues/" + qname + "/counters-reset", function() {
      $('ul.thumbnails.queue-counters h3').html('0');
    });
  });

  $('#btnResetHistory').click(function() {
    $.post("/queues/" + qname + "/history-reset", function() {
      return true;
    });
  });

});

function addCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};