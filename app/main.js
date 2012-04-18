require([
  "TM",

  // Libs
  "jquery",
  "use!backbone",

  // Modules
  "modules/example"
],

function(TM, $, Backbone, Example) {

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    routes: {
      "": "index",
      ":hash": "index"
    },

    index : function(hash) {
       // Define the columns in the underlying dataset
      TM.columns = [
        { name: "Description", type: "string" },
        { name: "Supplier", type: "string" },
        { name: "URL", type: "string" },
        { name: "Entity", type: "string" },
        { name: "Expense Type", type: "string" },
        { name: "Transaction Number", type: "string" },
        { name: "Amount", type: "number", 

          // Define a helper for pre-processing numeric values - 
          // ensures empty cells are set to 0 and the rest are 
          // stripped of commas and turned to floats
          before: function(v) {
            return (_.isUndefined(v) || _.isNull(v)) ? 
              0 : 
              parseFloat(v.replace(/\,/g, '')); 
            }  
        },
        
        { name: "Expense Area", type: "string" },
        { name: "Date", type: "time", format: "DD/MM/YYYY" },
        { name: "Departmental Family", type: "string" }
      ];

      // Define the underlying dataset for this interactive, a CSV file containing 
      // every item of Cabinet Office spending above £25k during the 2010/2011 period.
      // (source = )
      TM.data = new Miso.Dataset({
        url: "data/cabinet_office_spend_data.csv",
        delimiter: ",",
        columns: columns
      });

      TM.data.fetch({
        
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
      })
    }
  });

  // Shorthand the application namespace
  var app = TM.app;

  // Treat the jQuery ready function as the entry point to the application.
  // Inside this function, kick-off all initialization, everything up to this
  // point should be definitions.
  $(function() {
    // Define your master router on the application namespace and trigger all
    // navigation from this instance.
    app.router = new Router();

    // Trigger the initial route and enable HTML5 History API support
    Backbone.history.start({ pushState: true });
  });

  // All navigation that is relative should be passed through the navigate
  // method, to be processed by the router.  If the link has a data-bypass
  // attribute, bypass the delegation completely.
  $(document).on("click", "a:not([data-bypass])", function(evt) {
    // Get the anchor href and protcol
    var href = $(this).attr("href");
    var protocol = this.protocol + "//";

    // Ensure the protocol is not part of URL, meaning its relative.
    if (href && href.slice(0, protocol.length) !== protocol &&
        href.indexOf("javascript:") !== 0) {
      // Stop the default event to ensure the link will not cause a page
      // refresh.
      evt.preventDefault();

      // `Backbone.history.navigate` is sufficient for all Routers and will
      // trigger the correct events.  The Router's internal `navigate` method
      // calls this anyways.
      Backbone.history.navigate(href, true);
    }
  });

});
