var hexVals = ["#CF3D1E","#F15623","#F68B1F","#FFC60B","#DFCE21",
				"#BCD631","#95C93D","#48B85C","#00833D","#00B48D",
				"#60C4B1","#27C4F4","#478DCB","#3E67B1","#4251A3",
				"#59449B","#6A246D","#6E3F7C","#8A4873","#C05A89",
				"#EF58A0","#EB0080"];

var colors = _.map(hexVals, function(val){ return chroma.hex(val); });
var sorted = _.sortBy(colors, function(color){ return color.hsl()[0]; });
var output = _.map(sorted, function(color){ return color.hex() });

$(document).ready(function(){
	function build(width, height, element, data) {
		console.log("data", data);
		
		var formatChart = function(){
			this.attr("class", "chart")
	    		.style("position", "relative")
			    .style("width", width + "px")
				.style("height", height + "px");
	    }
		
		var chart = d3.select(element).append("div").call(formatChart);
		
		chart.selectAll("div").data(data)
		     .enter()
			 .append("div")
			 .attr("class", "row")
			 .style("background-color", function(d){ console.log(d); return d; })
			 .style("width", "300px")
			 .text(function(d){ console.log(d); return d; });
			 
		 $(element).show();
	}
	
	build(960, 600, "#barchart", output);
});

