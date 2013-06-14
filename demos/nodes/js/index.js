(function() {
	// Constants
	var c = {
		plane: 'control_ips',
		message_type: 'total_c',
		duration: 604800,
		link: {
			stroke: [0.5, 8],
			opacity: [0.5, 0.9],
			strength: [0.1, 1],
			distance: [30, 10],
			threshold: 0
		},
		node: {
			sgsn_charge: [-10, -400],
			ggsn_charge: -500,
			sgsn_radius: [4, 10],
			ggsn_radius: 12,
			threshold: 0
		}
	};

	var scale = {
		link: {
			stroke: d3.scale.linear().range(c.link.stroke),
			opacity: d3.scale.linear().range(c.link.opacity),
			strength: d3.scale.linear().range(c.link.strength),
			distance: d3.scale.linear().range(c.link.distance)
		},
		node: {
			sgsn_radius: d3.scale.linear().range(c.node.sgsn_radius),
			sgsn_charge: d3.scale.linear().range(c.node.sgsn_charge)
		}
	};

	var message_types = {
		'create_req': 'Create Request',
		'create_resp': 'Create Response',
		'update_req': 'Update Request',
		'update_resp': 'Update Response',
		'delete_req': 'Delete Request',
		'delete_resp': 'Delete Response',
		'echo_req': 'Echo Request',
		'echo_resp': 'Echo Response',
		'total_c': 'All Messages'
	};

	var layout = d3.layout.force();

	var svg = d3.select('.graph').append('svg');

	svg.append('g').attr('class', 'links');
	svg.append('g').attr('class', 'nodes');

	var data = [];

	function resize() {
		var width = $(window).innerWidth(),
		    height = $(window).innerHeight();

		layout.size([width, height]);

		svg
			.attr('width', width)
			.attr('height', height);
	}

	function _render() {
		var width = window.innerWidth, height = window.innerHeight;

		var nodes = _(data.nodes)
			.map(function(node) {
				node.x = node.x || ((Math.random() * 0.2) + 0.4) * width;
				node.y = node.y || ((Math.random() * 0.2) + 0.4) * height;
				return node;
			})
			.filter(function(node) {
				return node.data[c.message_type] > c.node.threshold;
			})
			.sort(function(node) {
				return node.data[c.message_type];
			})
			.value();

		var links = _(data.links)
			.map(function(link) {
				return {
					src_sn_addr: link.src_sn_addr,
					dst_sn_addr: link.dst_sn_addr,
					source: _.findIndex(nodes, function(node) {
						return _.contains(node[c.plane], link.src_sn_addr);
					}),
					target: _.findIndex(nodes, function(node) {
						return _.contains(node[c.plane], link.dst_sn_addr);
					}),
					data: link.data
				};
			})
			.filter(function(link) {
				return (
					link.data[c.message_type] > c.link.threshold &&
					link.source > -1 &&
					link.target > -1
				);
			})
			.sort(function(link) {
				return link.data[c.message_type];
			})
			.value();

		var linkValueExtent = d3.extent(links, function(link) {
			return link.data[c.message_type];
		});
		var sgsns = _.filter(nodes, function(node) {
			return node.type === 'SGSN';
		});
		var nodeValueExtent = d3.extent(sgsns, function(sgsn) {
			return sgsn.data[c.message_type];
		});

		scale.link.stroke.domain(linkValueExtent);
		scale.link.opacity.domain(linkValueExtent);
		scale.link.strength.domain(linkValueExtent);
		scale.link.distance.domain(linkValueExtent);
		scale.node.sgsn_radius.domain(nodeValueExtent);
		scale.node.sgsn_charge.domain(nodeValueExtent);

		layout
			.nodes(nodes)
			.links(links)
			.linkStrength(function(link) {
				return scale.link.strength(link.data[c.message_type]);
			})
			.linkDistance(function(link) {
				return scale.link.distance(link.data[c.message_type]);
			})
			.charge(function(node) {
				if (node.type === 'GGSN') {
					return c.node.ggsn_charge;
				} else {
					return scale.node.sgsn_charge(node.data[c.message_type]);
				}
			})
			.start();

		var link = svg.select('g.links').selectAll('.link').data(links);

		link.enter().append('line')
			.attr('class', 'link')
			.on('click', function(link) {
				d3.selectAll('.link, .node').classed('active', false);
				d3.select(this).classed('active', true);

				var f = d3.format('3.3s');

				var status = d3.select('.status').html('');

				status.append('div').attr('class', 'src').text(link.src_sn_addr);
				status.append('div').attr('class', 'dst').text(link.dst_sn_addr);
				status.append('div').attr('class', 'messages').text(f(link.data[c.message_type] / c.duration));
			});

		link.transition().style('stroke-width', function(link) {
				return scale.link.stroke(link.data[c.message_type]);
			})
			.style('stroke-opacity', function(link) {
				return scale.link.opacity(link.data[c.message_type]);
			});

		link.exit().remove();

		var node = svg.select('.nodes').selectAll('.node').data(nodes);

		node.enter().append('circle')
			.on('click', function(node) {
				var f = d3.format('3.3s'),
				    status = d3.select('.status').html('');

				d3.selectAll('.link, .node').classed('active', false);
				d3.select(this).classed('active', true);

				status.append('div').attr('class', 'node').text(node.type);
				status.append('div').attr('class', 'ip').text(node[c.plane].join(', '));
				status.append('div').attr('class', 'messages').text(f(node.data[c.message_type] / c.duration));
			})
			.call(layout.drag);

		node
			.attr('class', function(node) {
				return 'node ' + node.type.toLowerCase();
			})
			.attr('r', function(node) {
				if (node.type === 'GGSN') {
					return c.node.ggsn_radius;
				} else {
					return scale.node.sgsn_radius(node.data[c.message_type]);
				}
			});

		node.exit().remove();

		layout.on('tick', function() {
			link
				.attr('x1', function(d) { return d.source.x; })
				.attr('y1', function(d) { return d.source.y; })
				.attr('x2', function(d) { return d.target.x; })
				.attr('y2', function(d) { return d.target.y; });

			node
				.attr('cx', function(d) { return d.x; })
				.attr('cy', function(d) { return d.y; });
		});

		if (nodes.length === 0) {
			d3.select('.status').text('No nodes!');
		} else {
			d3.select('.status').text(null);
		}
	}

	var render = _.debounce(_render, 50, {leading: true, trailing: true});

	function process(nodes, links) {
		data = {
			nodes: _.map(nodes, function(node) {
				var matchedLinks = _.filter(links, function(link) {
					return _.contains(node[c.plane], link.src_sn_addr) ||
					       _.contains(node[c.plane], link.dst_sn_addr);
				});

				// Avoid confusion
				node.type = node.node;
				delete node.node;

				node.data = {};
				_.each(message_types, function(label, message_type) {
					node.data[message_type] = _.reduce(matchedLinks, function(sum, link) {
						return sum + +link[message_type];
					}, 0);
				});

				return node;
			}),
			links: _.map(links, function(link) {
				link.data = {};
				_.each(message_types, function(label, message_type) {
					link.data[message_type] = +link[message_type];
				});

				return link;
			})
		};
	}

	function fetchJSON(url) {
		var fetching = new $.Deferred();
		d3.json(url, function(json) {
			fetching.resolve(json);
		});
		return fetching;
	}

	function fetchCSV(url) {
		var fetching = new $.Deferred();
		d3.csv(url, function(csv) {
			fetching.resolve(csv);
		});
		return fetching;
	}

	$(function() {
		// Keep the svg in sync with the viewport
		$(window).on('resize', resize).trigger('resize');

		// Initialize select2 widgets
		$('select').select2();

		// Initialize tooltips
		$('[data-toggle=tooltip]').tooltip();

		// When the link message_type is changed, rerender.
		$('#message_type').on('change', function() {
			c.message_type = $(this).val();
			render();
		});

		$('#link_threshold').slider({
			range: 'max',
			value: 10,
			min: 0,
			max: 100,
			slide: updateThreshold('link'),
			change: updateThreshold('link')
		});

		$('#node_threshold').slider({
			range: 'max',
			value: 70,
			min: 0,
			max: 250,
			slide: updateThreshold('node'),
			change: updateThreshold('node')
		});

		$('#link_stroke').slider({
			range: true,
			min: 0.1,
			max: 10,
			step: 0.1,
			values: [0.5, 8],
			slide: updateRange('link', 'stroke'),
			change: updateRange('link', 'stroke')
		});

		$('#link_opacity').slider({
			range: true,
			min: 0,
			max: 1,
			step: 0.01,
			values: [0.5, 0.9],
			slide: updateRange('link', 'opacity'),
			change: updateRange('link', 'opacity')
		});

		$('#link_strength').slider({
			range: true,
			min: 0,
			max: 1,
			step: 0.01,
			values: [0.1, 1],
			slide: updateRange('link', 'strength'),
			change: updateRange('link', 'strength')
		});

		$('#link_distance').slider({
			range: true,
			min: 5,
			max: 100,
			values: [10, 30],
			slide: updateInverseRange('link', 'distance'),
			change: updateInverseRange('link', 'distance')
		});

		$('#node_sgsn_charge').slider({
			range: true,
			min: 0,
			max: 1000,
			values: [10, 400],
			slide: updateNegativeRange('node', 'sgsn_charge'),
			change: updateNegativeRange('node', 'sgsn_charge')
		});

		$('#node_sgsn_radius').slider({
			range: true,
			min: 0,
			max: 20,
			values: [4, 10],
			slide: updateRange('node', 'sgsn_radius'),
			change: updateRange('node', 'sgsn_radius')
		});

		c.link.threshold = $('#link_threshold').slider('value') * c.duration;
		c.node.threshold = $('#node_threshold').slider('value') * c.duration;

		function updateThreshold(name) {
			return function(e, ui) {
				c[name].threshold = ui.value * c.duration;
				$(this).closest('.control-group').find('output').val(ui.value);
				render();
			};
		}

		function updateRange(element, metric) {
			return function(e, ui) {
				var group = $(this).closest('.control-group');
				c[element][metric] = ui.values;
				scale[element][metric].range(c[element][metric]);
				group.find('.lower').val(ui.values[0]);
				group.find('.upper').val(ui.values[1]);
				render();
			};
		}

		function updateNegativeRange(element, metric) {
			return function(e, ui) {
				var group = $(this).closest('.control-group');
				c[element][metric] = [-ui.values[0], -ui.values[1]];
				scale[element][metric].range(c[element][metric]);
				group.find('.lower').val(ui.values[0]);
				group.find('.upper').val(ui.values[1]);
				render();
			};
		}

		function updateInverseRange(element, metric) {
			return function(e, ui) {
				var group = $(this).closest('.control-group');
				c[element][metric] = [ui.values[1], ui.values[0]];
				scale[element][metric].range(c[element][metric]);
				group.find('.lower').val(ui.values[0]);
				group.find('.upper').val(ui.values[1]);
				render();
			};
		}

		// Fetch data, process it and then render.
		$.when(fetchJSON('data/nodes.json'), fetchCSV('data/links.csv'))
			.then(process, function() {
				console.log('unable to load data');
			})
			.then(render);
	});
}());