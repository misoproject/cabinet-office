Miso.types.number.coerce = function(v) { if (_.isNull(v)) { return null }; return _.isNaN(v) ? null : parseFloat((""+v).replace(/,/,'') ); }

$(document).ready(function(){
	
	var data = new Miso.Dataset({
        url: "data/cabinet_office_spend_data.csv",
        delimiter: ",",
        columns: [
			{ name: "Description", type: "string" },
			{ name: "Supplier", type: "string" },
			{ name: "URL", type: "string" },
			{ name: "Entity", type: "string" },
			{ name: "Expense Type", type: "string" },
			{ name: "Transaction Number", type: "string" },
			{ name: "Amount", type: "number" },
			{ name: "Expense Area", type: "string" },
			{ name: "Date", type: "time", format: "DD/MM/YYYY" },
			{ name: "Departmental Family", type: "string" }
        ]
    });

    data.fetch({
        success: function(){
			showGroupings(["Expense Type","Expense Area","Supplier"]);
			showExpenses("Expense Type", 20);
		},
		error: function(){
            setTitle("Failed to load data from " + data.url);
		}
    });
	
	function showGroupings(columns) {
		var options = "";

		for(var i = 0; i < columns.length; i++){
			options += '<option value="' + columns[i] + '">' + columns[i] + '</option>';
		}
		
		$("#groupby").html(options).change(function(){ showExpenses($(this).val(), 20); });
		$("#grouping").fadeIn();
	}
	
	function showExpenses(grouping, maxGroups){

		var categoryKey = ["#CF3D1E", "#F15623", "#F68B1F", "#FFC60B", "#DFCE21", "#BCD631", 
                           "#95C93D", "#48B85C", "#00833D", "#00B48D", "#60C4B1", "#27C4F4",
						   "#478DCB", "#3E67B1", "#4251A3", "#59449B", "#6E3F7C", "#6A246D",
						   "#8A4873", "#EB0080", "#EF58A0", "#C05A89"];
		
		var expenseData = { name: grouping, elements: [] };
		var groupedData = data.groupBy(grouping, ["Amount"]);
		
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
		
		var onCellSelect = function(item, cell){
			showItemsInGroup(grouping, item, cell);
		}
		
		$("#treemap").empty();
		
		drawTreemap(960, 600, "#treemap", [expenseData], calcCellLabel, calcCellSize, onCellSelect);

		hideGroup("#treemap .cell");	
		setTitle("Principle areas of Cabinet Office spending 2010/2011");
		showGroup("#treemap .cell", 300, 10);
    }
	
	function setTitle(text){
		$("#legend").text(text);
	}
	
	function selectExpenseType(grouping, item, cell){ 
			
		var chartData = [];
		var expenseType = item.name.toLowerCase();
		var expenseRows = data.rows( function(r){ return r["Expense Type"].toLowerCase() === expenseType; });

		var labelColor = $(cell).css("background-color");
		
		expenseRows.comparator = function(a,b){ return b["Amount"] - a["Amount"] };				
		expenseRows.sort();
		
		expenseRows.each(function(row, index){
			if (index > 20) return;
			chartData.push({ index: index, date: row["Date"].format("DD MMM YY"), supplier: row["Supplier"], desc: row["Description"], value: row["Amount"] });
		}); 
		
		buildExpenseTable(960, 600, "#barchart", chartData, labelColor);
		
		hideGroup("#barchart .row");
		createModalPanel("#barchart");
		showGroup("#barchart .row", 300, 75);
	}
    
	function drawTreemap(width, height, element, data, calcCellLabel, calcCellSize, onCellSelect){

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
		
	    chart.data(data).selectAll("div")
			.data(function(d){return layout.nodes(d);})
			.enter()
			.append("div")
			.call(formatCell)
			.on("click", handleSelection)
			.on("mouseover",function(d){ $(".cell").stop().fadeTo(300, 0.2); $(this).stop().fadeTo(0, 1.0); })
			.on("mouseout",function(d){ $(".cell").stop().fadeTo("fast", 1.0); })
			.append("p")
			.call(formatLabel)
			.html(calcCellLabel);
	}
	
	function buildExpenseTable(width, height, element, data, labelColor, calcNameLabel, calcValueLabel) {
	    
		var formatChart = function(){
			this.attr("class", "chart")
	    		.style("position", "relative")
			    .style("width", width + "px")
				.style("height", height + "px");
	    }
		
		var chart = d3.select(element).append("div").call(formatChart);
		var scale = d3.scale.linear()
		              .domain([0, data[0].value])
					  .range(["0px", "300px"]);
		
		var createDateCell = function(){
			this.append("div")
			    .attr("class", "row-cell")
				.style("width", "74px")
				.html(function(d) { return d.date; });
		};
		
		var createDescriptionCell = function(){
			this.append("div")
			    .attr("class", "row-cell")
				.text(function(d) { return d.desc + " (" + d.date + ")"; });
		};
		
		var createValueCell = function(){
			this.append("div")
			    .attr("class", "row-cell")
				.style("width", "68px")
				.style("text-align", "right")
				.html(function(d) { return formatMoney("&pound;",d.value.toFixed(0),3,","); });
		};
		
		var createSupplierCell = function(){
			this.append("div")
			 .attr("class", "bar")
			 .style("background-color", labelColor)
			 .call(createBarBackground)
			 .call(createBarLabel)
		};
		
		var createBarBackground = function(){
			this.append("div")
				.attr("class", "bar-background")
				.style("width", function(d) { return scale(d.value); });
		};
		
		var createBarLabel = function(){
			this.append("div")
			    .attr("class", "bar-label")
				.text(function(d) { return d.supplier; });
		};
		
		chart.selectAll("div").data(data)
		     .enter()
			 .append("div")
			 .attr("class", "row")
			 .style("background-color", function(d) { return (d.index % 2) ? "#fff" : "#ececec"; })
			 .call(createValueCell)
			 .call(createSupplierCell)
			 .call(createDescriptionCell);
	}

	function createModalPanel(element){
		$(element).fadeIn().click(function() {
			$(this).fadeOut().empty().unbind('click');
		});		
	}
	
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
	
	function toTitleCase(str) {
		return str.charAt(0).toUpperCase() + str.substr(1);
	}
	
	function formatMoney(currency, amount, segLength, separator) {
		var money = amount.toString();
		
		money = (money.length > segLength) ? segment(money, segLength, separator) : money;
				
		return currency + money;			
	}
		
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