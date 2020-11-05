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

    // Current state clicked
    var clickedState = null;

    // Functions for parsing Dates and date strings
    var parseTime = d3.timeParse("%Y");
    var formatTime = d3.timeFormat("%Y");

    // Get years from fire data
    var years = fires.map(function(d) {
        return { "year": parseTime(d.FIRE_YEAR) };
    });

    // Get range of years to be displayed
    var yearMin = parseInt(formatTime(d3.min(years, d => d.year)));
    var yearMax = parseInt(formatTime(d3.max(years, d => d.year)));
    var dataYears = d3.range(0, yearMax - yearMin + 1).map(function(d) {
        return yearMin + d;
    });

    // Create year slider
    var yearSelected = yearMax;                     // current year selected; initially max year
    var sliderYear = d3.sliderBottom()
        .min(dataYears[0])                          // max and min ticks
        .max(dataYears[dataYears.length - 1])
        .step(1)                                    // tick step
        .width(900)                                 // width of slider
        .ticks(dataYears.length)                    // number of ticks
        .tickFormat(d3.format('.0f'))               // format for year
        .tickValues(dataYears)                      // tick values
        .default(dataYears[dataYears.length - 1]);  // value slider set to initially (max year)

    // TODO: arrange map and slider on page
    // Add slider to html
    var yearSlider = d3.select("#slider")
        .append("svg")
        .attr("width", 1000)
        .attr("height", 100)
        .append("g")
        .attr("transform", 'translate(30,30)');

    yearSlider.call(sliderYear);

    // Get fire sizes from fire data
    var sizes = fires.map(function(d) {
        return { "size": parseFloat(d.FIRE_SIZE) };
    });

    // Create fire marker size scale based on fire size
    var size = d3.scaleSqrt()
        .domain(d3.extent(sizes, d => d.size))
        // TODO: adjust range
        .range([1, 8]);

    // Draw the map
    d3.json("us.json").then(function(us) {

        // Create svg container with scalable size
        var svg = d3.select("#us_map")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .on("click", reset);

        // Create g element where states will be appended
        const g = svg.append("g");

        // TODO: recolor the states based on num fires per yearSelected on slider
        // TODO: (?) may be easiest to make new dataset with STATE,YEAR,TOTAL_FIRES
        // Create the states
        const states = g.selectAll("path")
            .data(us.features)
            .enter()
            .append("path")
            .attr("fill", "#444")
            .attr("cursor", "pointer")
            .attr("stroke", "white")                                // states' borders
            .on("click", clicked)                                   // zoom and display fires on click
            .attr("d", path)                                        // draw state
            .attr("id", d => d.properties.name.replace(" ", "_"));  // assign state name as path id

        // Name the state
        // Displays text for default browser tooltip
        // TODO: add tooltip and/or mouseover hover for states like with fire markers
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
            .style("opacity", 0)            // make translucent initially on full screen view
            .on("click", reset);            // reset to full screen on click
        backButton.append("rect")
            .attr("fill", "white")
            .attr("stroke", "#444")         // border color
            .attr("stroke-width", 1)        // border width
            .attr("x", width - 122)
            .attr("y", 10)
            .attr("width", 112)
            .attr("height", 25)
            .attr("rx", 15)                 // rounded corners
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
            // Set current state clicked
            clickedState = this.id;

            // Get state bounds
            const [[x0, y0], [x1, y1]] = path.bounds(d);
            event.stopPropagation();
            // Set color of all states not clicked on
            states.transition().style("fill", null);

            // TODO: choose color for current state clicked (clickedState)
            // Change color of state clicked on
            d3.select(this).transition().style("fill", "red");

            // Zoom into map
            var scaleFactor = Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height));
            svg.transition().duration(1100).call(
            zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(scaleFactor)
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
            d3.pointer(event, svg.node())
            );

            // Draw circles for clickedState and selectedYear
            drawCircles();

            // Add button to go back to the whole map view
            // TODO: refine transition
            backButton.transition()
                .duration(500)
                .style("opacity", .85);
        }

        // Zoom out to the full map
        function reset() {
            clearTimeout(null);
            // Reset state colors
            states.transition().style("fill", null);

            // Zoom out
            svg.transition().duration(1100).call(
            zoom.transform,
            d3.zoomIdentity,
            d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
            );

            // Remove the circles from the state
            // TODO: refine transition
            g.selectAll("circle")
                .transition()
                .duration(1000)
                .attr('opacity', 0)     // fade
                .attr('r', 0)           // shrink
                .remove();

            // Removes the button
            // TODO: refine transition
            backButton.transition()
                .duration(500)
                .style("opacity", 0);
        }

        // Draw fire markers based on current state and year selected
        function drawCircles() {
            const circles = g.selectAll("circle")
                // Filter data to include only current year and state
                .data(fires.filter(d => (d.STATE.replace(" ", "_") === clickedState)
                        && (d.FIRE_YEAR === yearSelected.toString())), d => d.FIRE_NAME)
                .join(
                        // add new circles
                    enter => enter
                        .append("circle")
                        .sort((a, b) => b.FIRE_SIZE - a.FIRE_SIZE)
                        .attr("cx", function(d) {
                            return projection([d.LONGITUDE, d.LATITUDE])[0];
                        })
                        .attr("cy", function(d) { return projection([d.LONGITUDE, d.LATITUDE])[1]; })
                        // TODO: change circle color
                        .attr("fill", "blue")
                        // initially small and translucent before transition
                        .attr("r", 0)
                        .style("opacity", 0),
                    update => update,
                    exit => exit
                        // TODO: refine transition
                        // transition exiting circles to shrink and fade before removal
                        .transition()
                        .duration(1000)
                        .attr('opacity', 0)
                        .attr('r', 0)
                        .remove()
                )

            // Add title to the circles
            // Default browswer tooltip
            circles
                .append("title")
                .text(d => d.FIRE_NAME);

            // Add transition to the circles (fade in and grow)
            // TODO: refine transition
            circles
                .transition()
                .duration(1000)
                .attr("r", d => size(d.FIRE_SIZE))
                .style("opacity", 0.6);

            // TODO: add tooltip to circles
            // TODO: change color/style for circle outline
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

        }

        // Add on change function to year slider
        // Update current year selected and redraw circles
        sliderYear.on('onchange', val => {
            yearSelected = val;
            drawCircles();
        });
    });
});