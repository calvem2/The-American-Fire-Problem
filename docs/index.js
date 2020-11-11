// Set max width and height of map
const width = 975;
const height = 610;

// Create the projection
var projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale(1250);

// Create path generator for map
var path = d3.geoPath().projection(projection);

// Load the fire data
d3.csv("over0.5AcreWithIDs(2).csv").then(function(fires) {
    // Remove the loading circle when the dataset loads
    d3.select("#circleLoader")
        .remove();

    // Map title
    d3.select(".chart-title")
        .text("Area Burned by Wildfires (acres per 10,000 Acres) <-- move units to legend");

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
    var tooltipDisplay = true                       // whether or not to display state tooltips. Disabled once state clicked
    var sliderYear = d3.sliderBottom()
        .min(dataYears[0])                          // max and min ticks
        .max(dataYears[dataYears.length - 1])
        .step(1)                                    // tick step
        .width(900)                                 // width of slider
        .ticks(dataYears.length)                    // number of ticks
        .tickFormat(d3.format('.0f'))               // format for year
        .tickValues(dataYears)                      // tick values
        .default(dataYears[0])
        d3.select("#slider").style("fill", "#BB86FC");  // value slider set to initially (max year)

    // TODO: arrange map and slider on page
    // Add slider to html
    var yearSlider = d3.select("#slider")
        .append("svg")
        /*
        .attr("width", 1000)
        .attr("height", 100)
        */
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + width + " " + 100)
        .append("g")
        .attr("transform", 'translate(30,30)');

    yearSlider.call(sliderYear);

    // Load the fire count data for each state
    d3.csv("firesPerAcre(2).csv").then(function(fireCounts) {
        // TODO: add necessary chart details (titles, subtitles, labels, axis titles)
        // Draw line chart

        // Set dimensions/margins
        var margin = {top: 100, right: 30, bottom: 40, left: 60},
            chartWidth = width - margin.left - margin.right,
            chartHeight = height - margin.top - margin.bottom;

        // Append svg for chart
        var svg = d3.select("#line-chart")
            .append("svg")
            /*
            .attr("width", chartWidth + margin.left + margin.right)
            .attr("height", chartHeight + margin.top + margin.bottom)
            */
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + width + " " + height)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Graph title
        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", -50)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "white")
            .text(clickedState);

        // Create x axis scale
        var x = d3.scaleTime()
            .domain([parseTime(yearMin.toString()), parseTime(yearMax.toString())])
            .range([0, chartWidth]);

        // Append axes
        svg.append("g")
            .attr("transform", "translate(0," + chartHeight + ")")
            .call(d3.axisBottom(x));

        var yAxis = svg.append("g");

        // Axes titles
        svg.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", chartWidth - 440)    // moves the text left and right from the x-axis
            .attr("y", chartHeight + 40)    // moves the text up and down from the x-axis
            .style("fill", "white")
            .text("Year");

        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("y", -60)     // moves the text left and right from the y-axis
            .attr("x", -200)    // moves the text up and down from the y-axis
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .style("fill", "white")
            .text("Number of Wildfires");


        // Append line and marks containers
        var line = svg.append("path");
        var markGroup = svg.append("g");

        // Function to filter data based on state and group by year
        // Returns map of years to number of fires
        function filterData(state) {
            // Get data
            var data = fireCounts;

            // Filter to selected state
            if (state !== null) {
                data = data.filter(function (d) {
                    return d.STATE.replace(" ", "_") === state;
                })
            }

            // Group by year
            return d3.rollup(data, g => d3.sum(g, d => d.FIRE_COUNT), d => d.FIRE_YEAR);
        }

        // Function for drawing line with marks on chart based on state selected
        function drawLine() {
            // Filter based on state selected
            var data = filterData(clickedState);

            // Create y axis scale based on domain of data for selected state (if any)
            var y = d3.scaleLinear()
                .domain([0, d3.max(data.values())])
                .range([chartHeight, 0]);

            // Add y axis
            yAxis.transition()
                .duration(800)
                .call(d3.axisLeft(y));

            // Add line
            line
                .datum(data)
                .transition()
                .duration(800)
                .ease(d3.easeQuadOut)
                .attr("fill", "none")
                .attr("stroke", "#D60620")
                .attr("stroke-width", 2)
                .attr("d", d3.line()
                    .x(function(d) { return x(parseTime(d[0])); })
                    .y(function(d) { return y(d[1]); })
                )
            // TODO: highlight mark corresponding to selected year
            // Add marks for each year
            var marks = markGroup.selectAll("circle")
                .data(data, d => d[0])  // match on year
                .join(
                    enter => enter
                        .append("circle")
                        .attr("cx", function(d) { return x(parseTime(d[0])); } )
                        .attr("cy", function(d) { return y(d[1]); } )
                        .attr("r", 5)
                        .attr("fill", "#D60620"),
                    update => update
                    ,
                    exit => exit.remove()
                );
            marks.append('title').text(function(d) { return "Time: " + parseTime(d[0]) + '\n' + "Wildfires: " + d[1];});
            marks
              .on('mouseover', function() {
                // The 'this' variable refers to the underlying SVG element.
                // We can select it directly, then use D3 attribute setters.
                // (Note that 'this' is set when using "function() {}" definitions,
                //  but *not* when using arrow function "() => {}" definitions.)
                d3.select(this).attr('stroke', 'white').attr('stroke-width', 2);
              })
              .on('mouseout', function() {
                // Setting the stroke color to null removes it entirely.
                d3.select(this).attr('stroke', null);
              });
            // TODO: refine transition for marks
            // Add transition for marks when switching between states
            marks.transition()
                .duration(800)
                .ease(d3.easeQuadOut)
                .attr("cx", function(d) { return x(parseTime(d[0])); } )
                .attr("cy", function(d) { return y(d[1]); } )
                .attr("r", 5);
        }

        drawLine();
        // Get fire sizes from fire data
        var sizes = fires.map(function(d) {
            return { "size": parseFloat(d.FIRE_SIZE) };
        });

        // Create fire marker size scale based on fire size
        var size = d3.scaleSqrt()
            .domain(d3.extent(sizes, d => d.size))
            .range([1, 16]);
        // Draw the map
        d3.json("us.json").then(function(us) {

            // Create svg container
            var svg = d3.select("#leftbox")
                .append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", "0 0 " + width + " " + height)
                .on("click", reset);

            // Create g element where states and fire circles will be appended
            const g = svg.append("g");

            // TODO: make these colors different
            // Scale to sort the data value into color buckets for each state
            // to the left = lighter color; to the right = darker color
            // yellow -> orange colors -> red
            var stateColor = d3.scaleQuantize()
            .range(["#fed976", "#feb24c","#fd8d3c","#fc4e2a","#e31a1c", "#bd0026", "#800026", "#67000d"]);

            // Add the legend
            

            // Updates the state color
            function updateJSONFireSize() {
                // Filter the firecount csv based on the selected year
                var filteredCSV = fireCounts.filter(d => (d.FIRE_YEAR === yearSelected.toString()));

                // Filter the min and max data for the given year
                stateColor.domain([
                    d3.min(fireCounts,
                        function(d) { return d.NUM_BURNED_ACRES_PER_10K_ACRE; }),
                    d3.max(fireCounts,
                        function(d) { return d.NUM_BURNED_ACRES_PER_10K_ACRE; })
                ]);

                // Merge the data in the fireCounts csv with the json
                for (var i = 0; i < us.features.length; i++) {
                    // Get state name
                    var jsonStateName = us.features[i].properties.name;
                    // Find state in the csvFile with the selectedYear
                    for (var j = 0; j < filteredCSV.length; j++) {
                        var csvStateName = filteredCSV[j].STATE;
                        // If the state names match
                        if (jsonStateName === csvStateName) {
                            // Current fire count for the given state                          
                            var currFireCount = filteredCSV[j].NUM_BURNED_ACRES_PER_10K_ACRE;
                            // Update the json file
                            us.features[i].properties.value = parseFloat(currFireCount);
                            break;
                        }
                    }
                }
            }

            // Create the states
            const states = g.selectAll("path")
                .data(us.features)
                .enter()
                .append("path")
                .style("fill", function(d) {
                    // Update the state colors
                    updateJSONFireSize();
                    var value = d.properties.value;
                    // Grey out undefined values
                    if (value) {
                        return stateColor(value);
                    } else {
                        return "#ccc";
                    }
                })
                .attr("cursor", "pointer")
                .attr("stroke", "white")   
                .attr("stroke-width", 1.5)                             // states' borders
                .on("click", clicked)                                   // zoom and display fires on click
                .attr("d", path)                                        // draw state
                .attr("id", d => d.properties.name.replace(" ", "_"));  // assign state name as path id

            // Name the state
            // Displays text for default browser tooltip
            // TODO: Replace to match Andy's tooltip
            if (tooltipDisplay){
                states.append("title")
                .text(d => d.properties.name +'\n'+ d.properties.value + " acres burned per 10k acres");
            }

            // TODO: this tooltip display does not work...replace to match Andy's
            states
                .on('mouseover', function() {
                    if (tooltipDisplay){
                        d3.select(this).attr('title', null)
                    }})
                .on('mouseout', function() {

                    d3.select(this).attr('title', null);
                });

            // Recolor the states
            function updateStateColors() {
                states.transition().duration(800)
                    .style("fill", function(d) {
                        // Update the state colors
                        // Grey out undefined values
                        updateJSONFireSize();
                        var value = d.properties.value;
                        if (value) {
                            return stateColor(value);
                        } else {
                            return "#ccc";
                        }
                    });
                states.select("title").text(d => d.properties.name +'\n'+ d.properties.value + " Acres Burned per 10,000");
            }

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
                tooltipDisplay = false;

                // Get state bounds
                const [[x0, y0], [x1, y1]] = path.bounds(d);
                event.stopPropagation();

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
                drawFires();

                // Draw line and marks
                drawLine();

                // Add button to go back to the whole map view
                // TODO: refine transition
                backButton.transition()
                    .duration(500)
                    .style("opacity", .85);
            }

            // Zoom out to the full map
            function reset() {
                tooltipDisplay = true
                clearTimeout(null);

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

                // Reset state selected
                clickedState = null;

                // Draw line
                drawLine();
            }

            // Draw fire markers based on current state and year selected
            function drawFires() {
                const circles = g.selectAll("circle")
                // Filter data to include only current year and state
                // TODO: use id column for key
                    .data(fires.filter(d => (d.STATE.replace(" ", "_") === clickedState)
                        && (d.FIRE_YEAR === yearSelected.toString())), d => [d.FIRE_ID])
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
                            .attr("fill", "4C4645")
                            // initially small and translucent before transition
                            .attr("r", 0)
                            .attr("opacity", 0)
                            .on("click", function(event) { event.stopPropagation(); }),
                        update => update,
                        exit => exit
                        // transition exiting circles to shrink and fade before removal
                            .transition()
                            .duration(800)
                            .attr('opacity', 0)
                            .attr('r', 0)
                            .remove()
                    );

                // Add title to the circles
                // Default browser tooltip
                // TODO: replace tooltip to match Andy's + use fires per 10k acres
                circles
                    .append("title")
                    .text(d => d.FIRE_NAME + '\n' + d.FIRE_SIZE + " Acres Burned");

                    // TODO: change color/style for circle outline
                    // Outline the circle on mouse hover
                circles
                    .on('mouseover', function() {
                      d3.select(this)
                        .attr('stroke', 'white')
                        .attr('stroke-width', 1)
                        .attr('stroke-opacity', 1);
                    })
                    .on('mouseout', function() {
                      d3.select(this).attr('stroke', null);
                    })
                // Add transition to the circles (fade in and grow)
                circles
                    .transition()
                    .duration(1000)
                    .attr("r", d => size(d.FIRE_SIZE))
                    .style("opacity", 0.4);

                // TODO: add tooltip to circles to match Andy's
                // TODO: change color/style for circle outline
                // Outline the circle on mouse hover
                circles
                    .on('mouseover', function() {
                        d3.select(this)
                            .attr('stroke', 'white')
                            .attr('stroke-width', .5)
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
                updateStateColors(yearSelected);
                d3.select("#slider").style("fill", "#BB86FC")
                drawFires();
            });
        });
    });
});
