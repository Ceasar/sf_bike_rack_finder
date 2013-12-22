require(["Map", "Route"], function(Map, Route) {

    /*
     * Either get the user's location via geolocation, or load a location if in
     * demo mode.
     */
    var getStartLocation = function(success) {
        var data = $('#json').text();
        if (data) {
            var json = JSON.parse(data);
            var geocoder = new google.maps.Geocoder();
            console.log(json);
            geocoder.geocode({'address': json.address}, function(results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        var startLocation = results[0].geometry.location;
                        console.log(startLocation);
                        success(startLocation);
                    }
            })

        } else {
            navigator.geolocation.getCurrentPosition(function(position) {
                var startLocation = new google.maps.LatLng(
                    position.coords.latitude,
                    position.coords.longitude
                );
                success(startLocation);
            });
        }
    }


    /*
     * Show directions to the closest bike parking spots from `startLocation`
     * for a variety of travel modes.
     */
    var main = function() {
        var map = Map.makeMap();
        _.each(Route.TRAVEL_MODES, function (travelMode) {
            map.addRoute(Route.makeRoute(map, travelMode));
        });
        getStartLocation(function(startLocation) {
            map.setCenter(startLocation);
            map.setStartLocation(startLocation);
        });
    }

    main();
});
