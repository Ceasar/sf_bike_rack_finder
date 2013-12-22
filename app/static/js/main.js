require(["Origin", "Map", "Route"], function(Origin, Map, Route) {

    var draw = function(center) {
        var mapOptions = {
            zoom: 16,
            center: center,
        };
        var gmap = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        var origin = new Origin.Origin(center);
        var routes = _.map(Route.travelModes, function (travelMode) {
            return Route.makeRoute(origin, travelMode, gmap);
        });
        var map = new Map.Map(gmap, routes);
        origin.subscribe(map);
        origin.setCenter(center);
    }


    /*
     * Show directions to the closest bike parking spots from `origin` for a variety
     * of travel modes.
     */
    var main = function() {
        var data = $('#json').text();
        if (data) {
            var json = JSON.parse(data);
            var center = new google.maps.LatLng(json['latitude'],
                                                json['longitude']);
            draw(center);
        } else {
            navigator.geolocation.getCurrentPosition(function(position) {
                var center = new google.maps.LatLng(position.coords.latitude,
                                                    position.coords.longitude);
                draw(center);
            })
        }
    };

    main();
});
