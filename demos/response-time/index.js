var buckets = {
	bucket1: [0, 100],
	bucket2: [100, 300],
	bucket3: [300, 500],
	bucket4: [500, 1000],
	bucket5: [1000, 3000],
	bucket6: [3000, 6000]
};

function contextGraph() {
	var margin = {top: 10, right: 10, bottom: 20, left: 40},
	    width = 600, height = 100;

	var scale = {
		x: d3.time.scale().range([0, width]),
		y: d3.scale.linear().range([height, 0])
	};

	var axis = {
		x: d3.svg.axis().scale(scale.x).orient('bottom'),
		y: d3.svg.axis().scale(scale.y).orient('left')
			.tickFormat(d3.format('3s'))
			.ticks(5)
	};

	var line = d3.svg.line()
		.x(function(d) { return scale.x(new Date((+d.end + +d.start) / 2)); })
		.y(function(d) { return scale.y(d.average); });

	var brush = d3.svg.brush()
		.x(scale.x)
		.on('brush', brushed);

	var context = d3.select('#context').append('svg')
		.attr('width', width + margin.left + margin.right)
		.attr('height', height + margin.top + margin.bottom);

	context.append('defs')
		.append('clipPath')
			.attr('id', 'context-clip')
			.append('rect')
				.attr('width', width)
				.attr('height', height);

	var plot = context.append('g')
		.attr('class', 'plot')
		.attr('width', width)
		.attr('height', height)
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	plot.append('text')
		.attr('class', 'label')
		.attr('x', width)
		.attr('y', height - 10)
		.attr('text-anchor', 'end')
		.text('time');

	plot.append('text')
		.attr('class', 'label')
		.attr('x', 0)
		.attr('y', 0)
		.attr('dy', 12)
		.attr('transform', 'rotate(-90)')
		.attr('text-anchor', 'end')
		.text('resp. time (s)');

	plot.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0,' + height + ')');

	plot.append('g')
		.attr('class', 'y axis');

	var data = plot.append('g')
		.attr('class', 'data')
		.attr('clip-path', '#context-clip')
			.append('path');

	plot.append('g')
		.attr('class', 'x brush')
		.call(brush)
		.selectAll('rect')
			.attr('height', height);

	function domain(_) {
		if (!_) return scale.x.domain();
		scale.x.domain(_);
		return this;
	}

	function range(_) {
		if (!_) return scale.y.domain();
		scale.y.domain(_);
		return this;
	}

	function datum(_) {
		if (!_) return data.datum();
		data.datum(_);
		return this;
	}

	function draw() {
		plot.select('.x.axis').call(axis.x);
		plot.select('.y.axis').call(axis.y);
		data.attr('d', line);
	}

	return {
		brush: brush,
		domain: domain,
		range: range,
		datum: datum,
		draw: draw
	};
}


function focusGraph() {
	var margin = {top: 10, right: 10, bottom: 20, left: 40},
	    width = 300, height = 200;

	var scale = {
		x: d3.scale.linear().range([0, width]).domain([
			buckets.bucket1[0], buckets.bucket6[1]
		]),
		y: d3.scale.linear().range([height, 0])
	};

	var axis = {
		x: d3.svg.axis()
			.scale(scale.x)
			.orient('bottom')
			.tickFormat(d3.format('3s'))
			.tickValues([0, 500, 1000, 3000, 6000])
	};

	var focus = d3.select('#focus').append('svg')
		.attr('width', width + margin.left + margin.right)
		.attr('height', height + margin.top + margin.bottom);

	var plot = focus.append('g')
		.attr('class', 'plot')
		.attr('width', width)
		.attr('height', height)
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

	plot.append('text')
		.attr('class', 'label')
		.attr('x', width)
		.attr('y', height - 10)
		.attr('text-anchor', 'end')
		.text('resp. time (ms)');

	plot.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0,' + height + ')')
		.call(axis.x);

	plot.append('g')
		.attr('class', 'y axis');

	var data = plot.append('g')
		.attr('class', 'data');

	function datum(_) {
		if (!_) return data.selectAll('rect').data();
		data.selectAll('rect').data(_)
			.enter().append('rect');
		return this;
	}

	function range(_) {
		if (!_) return scale.y.domain();
		scale.y.domain(_);
		return this;
	}

	function draw() {
		data.selectAll('rect')
			.attr('x', function(d) { return scale.x(d.start); })
			.attr('width', function(d) { return scale.x(d.end) - scale.x(d.start) - 1; })
			.attr('y', function(d) { return scale.y(d.value); })
			.attr('height', function(d) { return scale.y(0) - scale.y(d.value); });
	}

	return {
		datum: datum,
		range: range,
		draw: draw
	};
}

var context = contextGraph(),
    focus = focusGraph(),
    timeseries = [];

function render(res) {
	timeseries = res.times.map(function(t, i) {
		var start = new Date(t[0] * 1000),
		    end = new Date(t[1] * 1000);

		var sum = 0;

		var histogram = Object.keys(buckets).map(function(bkt) {
			var value = res.legend.reduce(function(sum, row) {
				return sum + res.data[row.index][bkt][i];
			}, 0);

			sum += value * (buckets[bkt][1] - buckets[bkt][0]);

			return {
				key: bkt,
				start: buckets[bkt][0],
				end: buckets[bkt][1],
				value: value
			};
		});

		return {
			start: start,
			end: end,
			histogram: histogram,
			average: sum / (buckets.bucket6[1] - buckets.bucket1[0])
		};
	});

	context
		.domain([timeseries[0].start, timeseries[timeseries.length - 1].end])
		.range([0, d3.max(timeseries, function(d) { return d.average; })])
		.datum(timeseries)
		.draw();

	focus
		.range([0, d3.max(timeseries[150].histogram, function(d) { return d.value; })])
		.datum(timeseries[150].histogram)
		.draw();
}

function brushed() {
	var extent = context.brush.extent();

	var filtered = context.datum()
		.filter(function(d) {
			return (d.start >= extent[0] && d.start <= extent[1]) ||
			       (d.end >= extent[0] && d.end <= extent[1]);
		});

	if (!filtered.length) return;

	var initial = {
		histogram: Object.keys(buckets).map(function(bkt) {
			return {
				key: bkt,
				start: buckets[bkt][0],
				end: buckets[bkt][1],
				value: 0
			};
		})
	};

	var reduced = (filtered.length === 1) ? filtered[0] : filtered
		.reduce(function(sum, d) {
			d.histogram.forEach(function(range, i) {
				sum.histogram[i].value += range.value
			})
			return sum;
		}, initial);

	focus
		.range([0, d3.max(reduced.histogram, function(d) { return d.value; })])
		.datum(reduced.histogram)
		.draw();
}

d3.json('response_times.json', render);
