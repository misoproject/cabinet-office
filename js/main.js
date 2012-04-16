$(document).ready(function(){
	
	// Define a helper for pre-processing numeric values - 
	// ensures empty cells are set to 0 and the rest are stripped of commas and turned to floats
	var processNumericValues = function(v){
		return (_.isUndefined(v) || _.isNull(v)) ? 0 : parseFloat(v.replace(/\,/g, '')); 
	} 
	
	// Define the columns in the underlying dataset
	var columns = [
		{ name: "Description", type: "string" },
		{ name: "Supplier", type: "string" },
		{ name: "URL", type: "string" },
		{ name: "Entity", type: "string" },
		{ name: "Expense Type", type: "string" },
		{ name: "Transaction Number", type: "string" },
		{ name: "Amount", type: "number", before: processNumericValues },
		{ name: "Expense Area", type: "string" },
		{ name: "Date", type: "time", format: "DD/MM/YYYY" },
		{ name: "Departmental Family", type: "string" }];
	
	// Define the underlying dataset for this interactive, a CSV file containing 
	// every item of Cabinet Office spending above £25k during the 2010/2011 period.
	// (source = )
	var data = new Miso.Dataset({
        url: "data/cabinet_office_spend_data.csv",
        delimiter: ",",
        columns: columns
    });
	
	// Define the start of the period we're interested in - 01 April 2010
	var startDate = moment("01-04-2010", "DD-MM-YYYY"); 

	// Define the end of the period we're interested in - 31 March 2011
	var finalDate = moment("31-03-2011", "DD-MM-YYYY"); 

	// Define a way to refer to all records within range
	var wholeRange = "2010 / 2011";
	
	// Define a function for selecting all rows in the range between startDate and finalDate
	var selectWholeRange = function(row){ 
		return (row["Date"].valueOf() >= startDate.valueOf()) 
		    && (row["Date"].valueOf() <= finalDate.valueOf()); 
	};
	
	// Define an array in which to store all possible date ranges
	var dateRanges = [wholeRange];
	
	// Store the name of the currently selected month range
	var currentRange = wholeRange;

	// Define which columns the data can be grouped by:
	// "Expense Type","Expense Area","Supplier"
	var groupings = [columns[4], columns[7], columns[1]];

	// Store the name of the column by which the data is currently grouped:
	// n.b. this is initially set as "Expense Type"
	var currentGrouping = columns[4].name;

	// Define the maximum number of groups to be included in the chart at any time
	var maxGroups = 20;

	// Fetch the data, showing the initial version of the chart on success,
	// or an error message if this process failed
    data.fetch({
        success: function(){
			setupGrouping(groupings);
			setupDateRanges(data);
			
			showFilters();
			showExpenses(wholeRange, currentGrouping, maxGroups);
		},
		error: function(){
            setTitle("Failed to load data from " + data.url);
		}
    });
	
	// Populate a dropdown box with a list of grouping options,
	// then set up an event handler to update the chart whenever this changes value
	function setupGrouping(columns) {
		var options = "";

		for(var i = 0; i < columns.length; i++){
			options += '<option value="' + columns[i].name + '">' + columns[i].name + '</option>';
		}
		
		$("#groupby").html(options).change(function(){
			currentGrouping = $(this).val();
			showExpenses(currentRange, currentGrouping, maxGroups); 
		});
	}
	
	// Calculate all possible month ranges in the required period, add an extra column
	// to the data containing appropriate grouping values and then populate the date
	// range dropdown with all of the possible values 
	function setupDateRanges(data){
		var month = moment(startDate);
		
		while(month.valueOf() < finalDate.valueOf()){
			dateRanges.push(month.format("MMM YYYY"));
			month.add("months", 1);
		}

		var monthRangeValues = [];
		
		data.each(function(row){
			monthRangeValues.push(row["Date"].format("MMM YYYY"));
		});
		
		data.addColumn({ name: "Period", type: "String", data: monthRangeValues });

		var options = "";

		for(var i = 0; i < dateRanges.length; i++){
			options += '<option value="' + dateRanges[i] + '">' + dateRanges[i] + '</option>';
		}
		
		$("#range").html(options).change(function(){
			currentRange = $(this).val();
			showExpenses(currentRange, currentGrouping, maxGroups); 
		});
	}
	
	// Reveal two dropdown boxes that can be used to filter the data being charted
	function showFilters(){
		$("#grouping").show();
		$("#daterange").show();
	}
	
	// Select the appropriate range of rows for the date filter, group them
	// according to the field specified and then chart the results using the
	// treemap builder routine below
	function showExpenses(range, grouping, maxGroups){

		var chartTitle = "Principle areas of Cabinet Office spending";
		
		var categoryKey = ["#CF3D1E", "#F15623", "#F68B1F", "#FFC60B", "#DFCE21", "#BCD631", 
                           "#95C93D", "#48B85C", "#00833D", "#00B48D", "#60C4B1", "#27C4F4",
						   "#478DCB", "#3E67B1", "#4251A3", "#59449B", "#6E3F7C", "#6A246D",
						   "#8A4873", "#EB0080", "#EF58A0", "#C05A89"];
		
		var rangeSelector = (range == wholeRange) ? selectWholeRange : function(row){ return (row["Period"] === range) };
		
		var dataInRange = data.rows(rangeSelector);
		
		var expenseData = { name: grouping, elements: [] };
		var groupedData = dataInRange.groupBy(grouping, ["Amount"]);
		
		groupedData.comparator = function(a,b){ return b["Amount"] - a["Amount"] };				
		groupedData.sort();
		
		groupedData.each(function(row, index){
			if (index >= maxGroups) return;
			expenseData.elements.push({ name: row[grouping], total: row["Amount"], color: categoryKey[index%categoryKey.length]	});
		});

		var calcCellSize = function(d){ return d.total; };
		var calcCellLabel = function(d){
			return "<span class='cost'>" + formatMoney("&pound;",d.value.toFixed(0),3,",") + "</span>" + toTitleCase(d.name); 
		};
		
		var onHighlightCell = function(item){
			setTitle(toTitleCase(item.name) + " - " + formatMoney("&pound;", item.value.toFixed(0), 3, ","));
		};
		
		var onRemoveHighlight = function(){
			setTitle(chartTitle);
		};
		
		var onCellSelect = function(item, cell){
			showTopItemsInGroup(grouping, item.name, 20);
		};
		
		$("#chart").empty();
		
		buildTreemap(970, 600, "#chart", [expenseData], calcCellLabel, calcCellSize, onHighlightCell, onRemoveHighlight, onCellSelect);

		hideGroup("#chart .cell");	
		setTitle(chartTitle);
		showGroup("#chart .cell", 300, 10);
    }
	
	// Update the chart legend as required
	function setTitle(text){
		$("#legend").html(text);
	}
	
	// Build a treemap chart with the supplied data (using D3 to create, size, color and layout a series of DOM elements).
	// Add labels to each cell, applying dynamic styling choices according to the space available.
	// Bind custom handlers to cell highlighting and selection events.    
	function buildTreemap(width, height, element, data, calcCellLabel, calcCellSize, onHighlightCell, onRemoveHighlight, onCellSelect){

		var layout = d3.layout.treemap()
							   .sort(function(a,b){ return a.value - b.value; })
		                       .children(function(d){ return d.elements; })
							   .size([width, height])
							   .value(calcCellSize);
	    
	    var formatChart = function(){
			this.attr("class", "chart")
	    		.style("position",   "relative")
			    .style("width",      width + "px")
				.style("height",     height + "px");
	    }
		
	    var formatCell = function(){
	    	this.attr("class", "cell")
			    .style("left",       function(d){ return d.x + "px"; })
	    		.style("top",        function(d){ return d.y + "px"; })
	    		.style("width",      function(d){ return d.dx - 1 + "px"; })
	    		.style("height",     function(d){ return d.dy - 1 + "px"; })
				.style("background", function(d){ return d.color || "#FFF"; });
	    }
	    
	    var formatLabel = function(){
			this.attr("class", "label")
	    		.style("font-size", function(d){ return d.area > 55000 ? "14px" : d.area > 20000 ? "12px" : d.area > 13000 ? "10px" : "0px"; })
			    .style("text-transform", function(d){ return d.area > 20000 ? "none" : "uppercase"; });
	    }
		
	    var chart = d3.select(element).append("div").call(formatChart);
		
		var selected = null;
		var handleSelection = function(d){
			if (selected) { selected.toggleClass("selection") }; 
			selected = $(this);
			selected.toggleClass("selection"); 
			onCellSelect(d, selected);
		}		
		
		var handleMouseover = function(d){
			onHighlightCell(d);
			$(".cell").stop().fadeTo(300, 0.2); 
			$(this).stop().fadeTo(0, 1.0);
		};
		
		var handleMouseout = function(d){
			$(".cell").stop().fadeTo("fast", 1.0);
			onRemoveHighlight();
		}
		
	    chart.data(data).selectAll("div")
			.data(function(d){return layout.nodes(d);})
			.enter()
			.append("div")
			.call(formatCell)
			.on("click", handleSelection)
			.on("mouseover", handleMouseover)
			.on("mouseout", handleMouseout)
			.append("p")
			.call(formatLabel)
			.html(calcCellLabel);
	}
	
	// Reveal a group of elements over the required number of milliseconds,
	// staggering the fade of each one according to the required offset
	function showGroup(elType, fadeTime, offset){
		if (fadeTime) {
			offset = offset || 0;
			$(elType).each(function(index){
				$(this).delay(offset*index).fadeIn(fadeTime);
			});
		} else {
			$(elType).show();
		}
	}
	
	// Hide a group of elements over the required number of milliseconds,
	// staggering the fade of each one according to the required offset
	function hideGroup(elType, fadeTime, offset){
		if (fadeTime) {
			offset = offset || 0;
			$(elType).each(function(index){
				$(this).delay(offset*index).fadeOut(fadeTime);
			});
		} else {
			$(elType).hide();
		}
	}
	
	// Return the string supplied with its first character converted to upper case
	function toTitleCase(str) {
		return str.charAt(0).toUpperCase() + str.substr(1);
	}
	
	// Format currency values for display using the required prefix and separator 
	function formatMoney(prefix, amount, segLength, separator) {
		var money = amount.toString();
		
		money = (money.length > segLength) ? segment(money, segLength, separator) : money;
				
		return prefix + money;			
	}
		
	// Segment a numeric value into chunks of the required length and 
	// return a string joining them together with the required separator
	function segment(value, segLength, separator) {
		var segments = [];
		var segCount = Math.ceil(value.length / segLength);
		
		for(var i = -segLength; segments.length < segCount-1; i -= segLength){
			segments.unshift(value.substr(i,segLength));				
		}
		
		segments.unshift(value.substr(0, value.length%segLength || segLength));
		
		return segments.join(separator);
	}	
});