// Set max width and height of map
const width = 975;
const height = 610;

// Draw the map
d3.json("states.json").then(function(us) {
    // Create svg container with scalable size
    const svg = d3.select("#us_map")
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
        .on("click", reset);

    const g = svg.append("g");

    // Create path generator 
    var path = d3.geoPath();

    // Draw the states
    // TODO: add button to go back to the main map
    const states = g.append("g")
        .attr("fill", "#444")
        .attr("cursor", "pointer")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .join("path")
        .on("click", clicked)
        .attr("d", path);

    // Name the state
    states.append("title")
        .text(d => d.properties.name);

    // Draw the state borders
    g.append("path")
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));

    // Function for when a given state is clicked
    function clicked(event, d) {
        const [[x0, y0], [x1, y1]] = path.bounds(d);
        event.stopPropagation();
        states.transition().style("fill", null);
        // TODO: change zoomed image / color
        d3.select(this).transition().style("fill", "red");
        svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
        d3.pointer(event, svg.node())
        );
    }

    // Zoom out to the full map
    function reset() {
        clearTimeout(null);
        states.transition().style("fill", null);
        svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
        );
    }

    // Set min and max scale for zooming into the map
    const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

    svg.call(zoom);

    // Function for zooming into the map
    function zoomed(event) {
    const {transform} = event;
    g.attr("transform", transform);
    g.attr("stroke-width", 1 / transform.k);
    }
});