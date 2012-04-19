// namespace
var COS = { 
  columns : [
    { 
      name: "Description", 
      type: "string" 
    },
    { 
      name: "Supplier", 
      type: "string" 
    },
    { 
      name: "URL", 
      type: "string" 
    },
    { 
      name: "Entity", 
      type: "string" 
    },
    { 
      name: "Expense Type", 
      type: "string" 
    },
    { 
      name: "Transaction Number", 
      type: "string" 
    },
    { 
      name: "Amount", 
      type: "number", 
      // Define a helper for pre-processing numeric values - 
      // ensures empty cells are set to 0 and the rest are 
      // stripped of commas and turned to floats
      before: function(v){
        return (_.isUndefined(v) || _.isNull(v)) ? 
          0 : 
          parseFloat(v.replace(/\,/g, '')); 
      } 
    },
    { 
      name: "Expense Area", 
      type: "string" 
    },
    { 
      name: "Date", 
      type: "time", 
      format: "DD MMM YYYY" 
    },
    { 
      name: "Departmental Family", 
      type: "string" 
    }
  ],
  
  // container for our application views
  Views : {},

  // application router
  Router : Backbone.Router.extend({

    routes : {
      "" : "index"
    },

    index : function() {
      
      // configuration parameters that are used throughout the application:
      COS.config = {
        // Define the start of the period we're interested in - 01 April 2010
        startDate : moment("01-04-2010", "DD-MM-YYYY"),

        // Define the end of the period we're interested in - 31 March 2011
        finalDate : moment("31-03-2011", "DD-MM-YYYY"),

        // Define a way to refer to all records within range
        wholeRange : "2010 / 2011",

        // default dates, all.
        dateRanges : ["2010 / 2011"],

        // Define which columns the data can be grouped by:
        // "Expense Type","Expense Area","Supplier"
        groupings : [COS.columns[4], COS.columns[7], COS.columns[1]],

        // Define the maximum number of groups to be included in the chart at any time
        maxGroups : 20,

        categoryColors : [
          "#CF3D1E", "#F15623", "#F68B1F", "#FFC60B", "#DFCE21",
          "#BCD631", "#95C93D", "#48B85C", "#00833D", "#00B48D", 
          "#60C4B1", "#27C4F4", "#478DCB", "#3E67B1", "#4251A3", "#59449B", 
          "#6E3F7C", "#6A246D", "#8A4873", "#EB0080", "#EF58A0", "#C05A89"
         ]

      };

      // state management 
      COS.state = {
        // Store the name of the currently selected month range
        currentRange : COS.config.wholeRange,

        // Store the name of the column by which the data is currently grouped:
        // n.b. this is initially set as "Expense Type"
        currentGrouping : COS.columns[4].name
      };

      // Define the underlying dataset for this interactive, a CSV file containing 
      // every item of Cabinet Office spending above �25k during the 2010/2011 period.
      // (source = )
      COS.data = new Miso.Dataset({
        
        url: "data/cabinet_office_spend_data.csv",
        delimiter: ",",
        columns: COS.columns,
        
        ready : function() {

          // === add a range column to the data ====
          var monthRangeValues = [],
              month = moment(COS.config.startDate);

          // iterate over each row and save the month and year
          this.each(function(row){
            monthRangeValues.push(row["Date"]);
          });

          monthRangeValues.sort(function(a,b) {
            return a.valueOf() - b.valueOf();
          });

          monthRangeValues = _.map(monthRangeValues, function(row) {
            return row.format("MMM YYYY")
          });

          console.log(monthRangeValues);
          
          // add a period column to the data.
          this.addColumn({ 
            name: "Period", 
            type: "String", 
            data: monthRangeValues 
          });

          // Calculate all possible month ranges in the required period, add an extra column
          // to the data containing appropriate grouping values
          COS.config.dateRanges = _.union(
            COS.config.dateRanges, 
            _.unique(this.column("Period").data)
          );
        }
      });

      
      COS.data.fetch({
        success : function() {
          COS.app = new COS.Views.Main();
          COS.app.render();
        },

        error: function(){
          COS.app.views.title.update("Failed to load data from " + data.url);
        }
      });

    }
  })
};

/**
* Main application view
*/
COS.Views.Main = Backbone.View.extend({

  initialize : function() {
    this.views = {};
  },

  render : function() {
    this.views.title = new COS.Views.Title();
    this.views.grouping = new COS.Views.Grouping();
    this.views.dateranges = new COS.Views.DateRanges();

    this.views.treemap = new COS.Views.Treemap();

    this.views.title.render();
    this.views.grouping.render();
    this.views.dateranges.render();
    this.views.treemap.render();
  } 
});

COS.Views.Title = Backbone.View.extend({

  el : "#legend",
  initialize : function(options) {
    options = options || {};
    this.defaultMessage = "Principle areas of Cabinet Office spending";
    this.message = options.message || this.defaultMessage;
    this.setElement($(this.el));
  },
  render : function() {
    this.$el.html(this.message);
  },
  update : function(message) {
    if (typeof message !== "undefined") {
      this.message = message;
    } else {
      this.message = this.defaultMessage;
    }
    this.render();
  }

});

/**
* Represents a dropdown box with a list of grouping options.
*/
COS.Views.Grouping = Backbone.View.extend({

  el       : "#groupby",
  template : 'script#grouping',
  events   : {
    "change" : "onChange"
  },

  initialize : function(options) {
    options        = options || {};
    this.groupings = options.groupings || COS.config.groupings;
    this.template  = _.template($(this.template).html());

    this.setElement($(this.el));
  },

  render : function () {
    this.$el.parent().show();
    this.$el.html(this.template({ columns : this.groupings }));
    return this;
  },

  // Whenever the dropdown option changes, re-render
  // the chart.
  onChange : function(e) {
    
    COS.state.currentGrouping = $("option:selected", e.target).val();
    COS.app.views.treemap.render();
  }

});

/**
* Date range dropdown containing all possiblev values.
*/
COS.Views.DateRanges = Backbone.View.extend({
  
  el : '#range', 
  template : 'script#dateRanges',

  events : {
    "change" : "onChange"
  },

  initialize : function(options) {
    options       = options || {};
    this.ranges   = options.ranges || COS.config.dateRanges;
    this.template = _.template($(this.template).html());
    this.setElement($(this.el));  
  },

  render : function() {
    this.$el.parent().show();
    this.$el.html(this.template({ dateRanges : this.ranges }));
    return this;
  },

  onChange : function(e) {
    COS.state.currentRange = $("option:selected", e.target).val();
    COS.app.views.treemap.render();
  }

});

/**
* A tree map, uses d3.
*/
COS.Views.Treemap = Backbone.View.extend({

  el : "#chart", 

  initialize : function(options) {
    options = options || {};
    this.width = options.width || 970;
    this.height = options.height || 600;
    this.setElement($(this.el));
  },

  _hideGroup : function(elType, fadeTime, offset) {
    if (fadeTime) {
      offset = offset || 0;
      $(elType).each(function(index){
        $(this).delay(offset*index).fadeOut(fadeTime);
      });
    } else {
      $(elType).hide();
    }
  },

  _showGroup : function(elType, fadeTime, offset) {
    if (fadeTime) {
      offset = offset || 0;
      $(elType).each(function(index){
        $(this).delay(offset*index).fadeIn(fadeTime);
      });
    } else {
      $(elType).show();
    }
  },

  render : function() {

    // load state
    var range   = COS.state.currentRange,
      grouping  = COS.state.currentGrouping,
      maxGroups = COS.config.maxGroups;

    // Create a data subset that we are rendering
    var groupedData = COS.Utils.computeGroupedData();

    // === build data for d3
    var expenseData = { 
      name: grouping, 
      elements: [] 
    };

    groupedData.each(function(row, index){
      if (index >= maxGroups) {
        return;
      }
      expenseData.elements.push({ 
        name:  row[grouping], 
        total: row["Amount"], 
        color: COS.config.categoryColors[index % COS.config.categoryColors.length] 
      });
    });

    // === build d3 chart
    // Build a treemap chart with the supplied data (using D3 to create, size, color and layout a series of DOM elements).
    // Add labels to each cell, applying dynamic styling choices according to the space available.
    // Bind custom handlers to cell highlighting and selection events.    
    this.$el.empty();
    var selected = null;

    var layout = d3.layout.treemap()
      .sort(function(a,b){ 
          return a.value - b.value; 
        })
      .children(function(d){ 
        return d.elements; 
      })
      .size([this.width, this.height])
      .value(function(d){ 
        return d.total; 
      });

    var chart = d3.select("#chart")
      .append("div")

      // set default styles for chart
      .call(function(){
        this.attr("class", "chart")
          .style("position", "relative")
          .style("width", this.width + "px")
          .style("height", this.height + "px");
        }
      );

    // set up data for the chart
    chart.data([expenseData])
      .selectAll("div")
      .data(function(d){
        return layout.nodes(d);
      })
      .enter()
        .append("div")

        // append a div for every piece of the treemap
        .call(function(){
          this.attr("class", "cell")
            .style("left",       function(d){ return d.x + "px"; })
            .style("top",        function(d){ return d.y + "px"; })
            .style("width",      function(d){ return d.dx - 1 + "px"; })
            .style("height",     function(d){ return d.dy - 1 + "px"; })
          .style("background", function(d){ return d.color || "#F7F7F7"; });
        })

        // on click just output some logging
        .on("click", function(d){
          if (selected) { 
            selected.toggleClass("selection") 
          }; 
          selected = $(this);
          selected.toggleClass("selection"); 
          console.log(d, selected);
        })
        
        // on mouseover, fade all cells except the one being
        // selected.
        .on("mouseover", function(d){
          
          // update Title.
          COS.app.views.title.update(
            COS.Utils.toTitleCase(d.name) + " - " + 
            COS.Utils.toMoney(d.value.toFixed(0))
          );

          $(".cell").stop().fadeTo(300, 0.2); 
          $(this).stop().fadeTo(0, 1.0);
        })

        // on mouse out, unfade all cells.
        .on("mouseout", function(d) {
          $(".cell").stop().fadeTo("fast", 1.0);
          COS.app.views.title.update();
        })
        .append("p")
        // set the size for the labels for the dollar amount.
        // vary size based on size.
        .call(function(){
          this.attr("class", "label")
              .style("font-size", function(d) {
                return d.area > 55000 ? 
                  "14px" : 
                  d.area > 20000 ? 
                    "12px" : 
                    d.area > 13000 ? 
                      "10px" : 
                      "0px"; 
              })
              .style("text-transform", function(d) { 
                return d.area > 20000 ? 
                  "none" : 
                  "uppercase"; 
              });
          })

          // append dollar amounts
          .html(function(d){
            return "<span class='cost'>" + 
                COS.Utils.toMoney(d.value.toFixed(0)) + 
              "</span>" + 
              COS.Utils.toTitleCase(d.name); 
          });

    // some graceful animation
    this._hideGroup("#chart .cell");  
    this._showGroup("#chart .cell", 300, 10);
  }
});

// Random Utility functions
COS.Utils = {
  // Return the string supplied with its first character converted to upper case
  toTitleCase : function(str) {
    return str.charAt(0).toUpperCase() + str.substr(1);
  },

  // Format currency values for display using the required prefix and separator 
  toMoney : function(amount) {
    options = {
      symbol : "&pound;",
      decimal : ".",
      thousand: ",",
      precision : 0
    };
    // we are using the accounting library
    return accounting.formatMoney(amount, options);
  },

  // Compute grouped data for a specific range, by the grouping.
  computeGroupedData : function() {
    // load state
    var range   = COS.state.currentRange,
      grouping  = COS.state.currentGrouping,
      maxGroups = COS.config.maxGroups,
      
      // How are we selecting rows from the
      rangeSelector = (range == COS.config.wholeRange) ? 

        // Define a function for selecting all rows in the range between startDate and finalDate
        function(row){ 
          return (row["Date"].valueOf() >= COS.config.startDate.valueOf()) 
              && (row["Date"].valueOf() <= COS.config.finalDate.valueOf()); 
        } : 
        // select the period from a specific row
        function(row){ 
          return (row["Period"] === range) 
        };

    var groupedData = COS.data.rows(rangeSelector).groupBy(grouping, ["Amount"]);
    
    groupedData.sort({
      comparator : function(a ,b){ 
        if (b["Amount"] > a["Amount"]) { return  1; }
        if (b["Amount"] < a["Amount"]) { return -1; }
        if (b["Amount"] === a["Amount"]) { return 0; }
      }      
    });

    return groupedData;
  }
};

// Kick off application.
var mainRoute = new COS.Router();
Backbone.history.start();
