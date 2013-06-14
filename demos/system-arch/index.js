var width = window.innerWidth,
    height = window.innerHeight;

var color = d3.scale.category20();

var force = d3.layout.force()
	.charge(-1000)
	.linkDistance(100)
	.size([width, height]);

var svg = d3.select('.diagram svg')
	.attr('width', width)
	.attr('height', height);

d3.xml('architecture.xml', function(err, xml) {
	xml = d3.select(xml);

	var nodes = xml.selectAll('node')[0].map(function(node) {
		return {
			id: node.attributes.id.value,
			class: node.attributes.class.value,
			text: node.textContent,
			x: Math.random() * 500,
			y: Math.random() * 500
		};
	});

	var links = xml.selectAll('link')[0].map(function(link) {
		var obj = {from: -1, to: -1};

		nodes.forEach(function(node) {
			if (node.id === link.attributes.from.value) obj.source = node;
			if (node.id === link.attributes.to.value) obj.target = node;
		});

		return obj;
	});

	force
		.nodes(nodes)
		.links(links)
		.start();

	var link = svg.selectAll('.link')
		.data(links)
		.enter().append('line')
			.attr('class', 'link');

	var node = svg.selectAll('.node')
		.data(nodes);

	var newNode = node.enter().append('g');
	newNode.append('circle').attr('r', 10);
	newNode.append('text').attr('y', 20);

	node
		.attr('class', function(d) { return 'node ' + d.class; })
		.call(force.drag)
		.select('text').text(function(d) { return d.text; });

	force.on('tick', function() {
		link
			.attr('x1', function(d) { return d.source.x; })
			.attr('y1', function(d) { return d.source.y; })
			.attr('x2', function(d) { return d.target.x; })
			.attr('y2', function(d) { return d.target.y; });

		node
			.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
	});
});