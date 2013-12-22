require(["Origin", "Map", "Route"], function(Origin, Map, Route) {

    /*
     * Draw the map around `center`.
     */
    var draw = function(center) {
        var mapOptions = {
            zoom: 16,
            center: center,
        };
        var gmap = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        var origin = new Origin.Origin(center);
        var map = new Map.Map(gmap);
        _.each(Route.TRAVEL_MODES, function (travelMode) {
            var route = Route.makeRoute(origin, travelMode);
            map.addRoute(route);
        });
        origin.subscribe(map);
        origin.setCenter(center);
    }

    /*
     * Either get the user's location via geolocation, or load a location if in
     * demo mode.
     */
    var getCenter = function(success) {
        var data = $('#json').text();
        if (data) {
            var json = JSON.parse(data);
            var center = new google.maps.LatLng(json['latitude'],
                                                json['longitude']);
            success(center);
        } else {
            navigator.geolocation.getCurrentPosition(function(position) {
                var center = new google.maps.LatLng(position.coords.latitude,
                                                    position.coords.longitude);
                success(center);
            })
        }
    }


    /*
     * Show directions to the closest bike parking spots from `center` for a
     * variety of travel modes.
     */
    var main = function() {
        getCenter(function(center) {
            draw(center);
        });
    }

    main();
});
