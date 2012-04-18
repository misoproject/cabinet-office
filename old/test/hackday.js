$(document).ready(function(){
	var TARGET_COLOURS = {"facebook": "#3B5998", "twitter": "#4099FF", "other": "#4A7801" };
	var wordcloud = new metaaps.nebulos(document.getElementById('word-cloud'));
	var piedish = document.getElementById('pie-dish'); 
	var raphael = Raphael(piedish, 300, 300);
	var pie = {};
	
    function getSegmentsFrom(totals, count){
	    var segments = [];
	    
	    for (var target in totals) {
	        var total = totals[target];
	        
	        if (total > 0) {
	            segments.push({
	                value: total / count,
	                fill: TARGET_COLOURS[target] || "#000",
	                stroke: "none"
	            });
	        }
	    }
	    
	    return segments;
    }
	
	function makepie(totals){
        var diameter = 280;
        var radius = diameter / 2;
        var center = { x:150, y:280 };
        var segments = getSegmentsFrom(totals, 100);
		var offset = 0;
        
        pie.radius = radius;
        
        if (pie.ingredients) {
            pie.ingredients.remove();
            pie.ingredients = null;
        }
		
		if (pie.chart) {
			pie.chart.remove();
		}
        
        pie.ingredients = raphael.set();
        
        pie.spot = raphael.circle(center.x, center.y, 3).attr({
            stroke: 'none',
            fill: '#444',
            opacity: 1.0
        });
        
        pie.ingredients.push(pie.spot);

        pie.chart = drawPieChart({
            radius: radius,
            segments: segments,
            resolution: 0.1
        }, raphael);
        
        pie.chart.translate(center.x, center.y - radius - offset);
        
        pie.circle = raphael.circle(center.x, center.y - radius - offset, radius / 2).attr({
            stroke: 'none',
            fill: '#fff',
            opacity: 1.0
        });
        
        pie.count = raphael.text(center.x, center.y - radius - offset, "%").attr({
            "font-family": "Arial",
            "font-size": 48
        });
                
        pie.ingredients.push(pie.circle, pie.count);
    }
	
	function drawPieChart(p, r){
        var TWO_PI = Math.PI * 2;
        var pie = r.set();
        var leng = p.segments.length;
        var offsetAngle = 0;
        
        for (var i = 0; i < leng; i++) {
            var segData = p.segments[i];
            var angle = TWO_PI * segData.value; // angle is percent of TWO_PI
            var seg = drawSegment(p.radius, angle, offsetAngle, p.resolution || 0.1, r);
            
            seg.attr({
                stroke: segData.stroke,
                fill: segData.fill
            });
            
            pie.push(seg);
            offsetAngle += angle;
        }
        
        return pie;
    }
    
    function polarPath(radius, theta, rotation){
        var x, y;
        x = radius * Math.cos(theta + rotation);
        y = radius * Math.sin(theta + rotation);
        return "L " + x + " " + y + " ";
    }
    
    function drawSegment(radius, value, rotation, resolution, r){
        var path = "M 0 0 ";
        
        for (var i = 0; i < value; i += resolution) {
            path += polarPath(radius, i, rotation);
        }
        path += polarPath(radius, value, rotation);
        
        path += "L 0 0";
        
        return r.path(path);
    }
	
	makepie({ "facebook": 30, "twitter":40, "other": 30 });
	
	$('#test-form').submit(function() {
		wordcloud.setFontFamily("Arial");
        wordcloud.draw($('#test-text').val());
  		return false;
	});
});
