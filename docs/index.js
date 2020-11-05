// Set max width and height of map
const width = 975;
const height = 610;

// Create the projection
var projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale(1250);

// Create path generator
var path = d3.geoPath().projection(projection);

// TODO: Load the actual dataset
// Load the fire data
d3.csv("fireTest.csv").then(function(fires) {
    // TODO: figure out how to fix the range
    // Circle size scale
    var size = d3.scaleSqrt()
        .domain(d3.extent(fires, d => d.FIRE_SIZE))
        .range([1, 1.5]);

    // Draw the map
    d3.json("us.json").then(function(us) {
        // Create svg container with scalable size
        var svg = d3.select("#us_map")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .on("click", reset);

        // Draw states
        const g = svg.append("g");

        // TODO: recolor the states
        // Create the states
        const states = g.selectAll("path")
            .data(us.features)
            .enter()
            .append("path")
            .attr("fill", "#444")
            .attr("cursor", "pointer")
            .attr("stroke", "white")
            .on("click", clicked)
            .attr("d", path)
            .attr("id", d => d.properties.name.replace(" ", "_"));

        // Name the state
        states.append("title")
            .text(d => d.properties.name);

        // Set min and max scale for zooming into the map
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", zoomed);

        // Function for zooming into the map
        function zoomed(event) {
            const {transform} = event;
            g.attr("transform", transform);
            g.attr("stroke-width", 1 / transform.k);
        }
        
        // Add button to zoom out
        const backButton = svg.append("g")
            .attr("cursor", "pointer")
            .style("opacity", 0)
            .on("click", reset);
        backButton.append("rect")
            .attr("fill", "white")
            .attr("stroke", "#444")
            .attr("stroke-width", 1)
            .attr("x", width - 122)
            .attr("y", 10)
            .attr("width", 112)
            .attr("height", 25)
            .attr("rx", 15)
            .on("click", reset);
        backButton.append("text")
            .attr("fill", "#444")
            .attr("x", width - 112)
            .attr("y", 27)
            .attr("font-size", 14)
            .attr("color", "#444")
            .text("Show all states")
            .on("click", reset);

        // Function for when a given state is clicked
        function clicked(event, d) {
            var stateName = this.id;
            const [[x0, y0], [x1, y1]] = path.bounds(d);
            event.stopPropagation();
            states.transition().style("fill", null);
            // TODO: change zoomed image / color
            d3.select(this).transition().style("fill", "red");
            var scaleFactor = Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height));
            svg.transition().duration(1100).call(
            zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(scaleFactor)
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
            d3.pointer(event, svg.node())
            );

            // TODO: fix circle scales
            // TODO: change circle color
            // Filter the circles based on the state shown
            const circles = g.selectAll("circle")
                .data(fires.filter(d => d.STATE.replace(" ", "_") === stateName))
                .join("circle")
                .sort((a, b) => b.FIRE_SIZE - a.FIRE_SIZE)
                .attr("cx", function(d) {
                    console.log("long/lat: " + projection([d.LONGITUDE, d.LATITUDE]) + " name " + d.FIRE_NAME); 
                    return projection([d.LONGITUDE, d.LATITUDE])[0]; 
                })
                .attr("cy", function(d) { return projection([d.LONGITUDE, d.LATITUDE])[1]; })
                .attr("r", d => size(d.FIRE_SIZE))
                .attr("fill", "blue")
                .style("opacity", 0);

            // Add title to the circles
            circles
                .append("title")
                .text(d => d.FIRE_NAME);

            // Add transition to the circles
            circles
                .transition()
                .duration(600)
                .style("opacity", 0.6);

            // TODO: add tooltip to circles
            // Outline the circle on mouse hover
            circles
                .on('mouseover', function() {
                    d3.select(this)
                        .attr('stroke', '#000')
                        .attr('stroke-width', 2)
                        .attr('stroke-opacity', 1);
                })
                .on('mouseout', function() {
                    d3.select(this).attr('stroke', null);
                })

            // Add button to go back to the whole map view
            backButton.transition()
                .duration(500)
                .style("opacity", .85);
        }

        // Zoom out to the full map
        function reset() {
            clearTimeout(null);
            states.transition().style("fill", null);
            svg.transition().duration(1100).call(
            zoom.transform,
            d3.zoomIdentity,
            d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
            );
            // Remove the circles from the state
            g.selectAll("circle")
                .remove();
            // Removes the button
            backButton.transition()
                .duration(500)
                .style("opacity", 0);
        }
    });
});