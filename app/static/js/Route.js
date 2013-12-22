define(function () {
    var directionsService = new google.maps.DirectionsService();
    var distanceMatrixService = new google.maps.DistanceMatrixService();

    var BICYCLING = google.maps.TravelMode.BICYCLING;
    var WALKING = google.maps.TravelMode.WALKING;
    var travelModes = [BICYCLING, WALKING];

    // Use orange to constant with blue travel mode icons
    var ROUTE_COLOR = 'ffaa00';
    var ROUTE_OPTIONS = {
        draggable: true,
        polylineOptions: {
            strokeColor: ROUTE_COLOR,
        },
        preserveViewport: true,
    };
    // Icons are taken from Google Maps
    var iconByTravelMode = {
        BICYCLING: '/static/img/bicycle.png',
        WALKING: '/static/img/walk.png',
    }

    var makeRoute = function(origin, travelMode, gmap) {
        var directionsRenderer = new google.maps.DirectionsRenderer(ROUTE_OPTIONS);
        directionsRenderer.setMap(gmap);
        var route = new Route(travelMode, directionsRenderer);

        google.maps.event.addListener(directionsRenderer, 'directions_changed', function() {
            var directions = directionsRenderer.getDirections();
            var leg = directions.routes[0].legs[0];
            if (origin.getCenter().equals(leg.start_location)) {
                route.draw(gmap);
            } else {
                origin.setCenter(leg.start_location);
            }
        });
        return route;
    }

    /*
     * A Route object, representing directions from two points via `travelMode`.
     *
     * Note: Since it is expected that several routes will be shown at once, icons
     * indicating the mode of travel are shown along with the route.
     */
    Route = function(travelMode, directionsRenderer) {
        var directionsRenderer = directionsRenderer;
        var markers = [];

        this.draw = function(map) {
            var directions = directionsRenderer.getDirections();
            _.each(markers, function(marker) {
                marker.setMap(null);
            });
            markers = [];
            var leg = directions.routes[0].legs[0];
            _.each(leg.steps, function(step) {
                var marker = new google.maps.Marker({
                    position: getMidpoint(step.start_location, step.end_location),
                    icon: iconByTravelMode[travelMode],
                    zIndex: 1,
                });
                marker.setMap(map);
                markers.push(marker);
            });
        }

        /*
         * Calculate a path to the closest parking spot.
         */
        this.calculateDirections = function(origin, parkingSpots, success) {
            getClosestSpot(origin, parkingSpots, travelMode, function(closestSpot) {
                var request = {
                    origin: origin,
                    destination: closestSpot.latLng,
                    travelMode: travelMode,
                };
                directionsService.route(request, function(result, status) {
                    if (status == google.maps.DirectionsStatus.OK) {
                        directionsRenderer.setDirections(result);
                        success(result);
                    }
                });
            });
        }
    }


    /*
     * Get the closest parking spot to `origin` by `travelMode`.
     */
    function getClosestSpot(origin, parkingSpots, travelMode, success) {
        var spotByLatLng = _.indexBy(parkingSpots, function(spot) {
            return spot.latLng;
        });
        var addresses = _.keys(spotByLatLng);
        getClosestLatLng(origin, addresses, travelMode, function(closestLatLng) {
            success(spotByLatLng[closestLatLng]);
        });
    }

    /*
     * Get the midpoint between two latLngs.
     */
    function getMidpoint(latLng1, latLng2) {
        return new google.maps.LatLng(
            (latLng1.lat() + latLng2.lat()) / 2,
            (latLng1.lng() + latLng2.lng()) / 2
        );
    }


    /*
     * Calls `success` with a map from `addresses` to their corresponding trip
     * durations, measured in seconds, starting from `origin`.
     *
     * Note: For maximum robustness, addresses should be as specific as possible,
     * otherwise they may be interpreted as being in unexpected parts of the world.
     */
    function getTimeAndDistanceByLatLng(origins, addresses, travelMode, success) {
        distanceMatrixService.getDistanceMatrix({
            origins: origins,
            destinations: addresses,
            travelMode: travelMode,
        }, function(response, status) {
            if (status == google.maps.DistanceMatrixStatus.OK) {
                var durations = _.pluck(
                    _.pluck(response.rows[0].elements, 'duration'),
                    'value'
                );
                var distances = _.pluck(
                    _.pluck(response.rows[0].elements, 'distance'),
                    'value'
                );
                var durationAndDistanceByLatLng = _.object(addresses, 
                    _.map(_.zip(durations, distances), function(t) {
                        return {
                            duration: t[0],
                            distance: t[1],
                        }
                    })
                );
                success(durationAndDistanceByLatLng);
            }
        });
    }


    /*
     * Calls `success` with the address closest to `origin` by trip duration using
     * `travelMode`.
     */
    function getClosestLatLng(origin, addresses, travelMode, success) {
        getTimeAndDistanceByLatLng([origin], addresses, travelMode, function(durationAndDistanceByLatLng) {
            var closestLatLng = _.min(addresses, function(address) {
                return durationAndDistanceByLatLng[address].duration;
            });
            success(closestLatLng);
        });
    }

    return {
        travelModes: travelModes,
        makeRoute: makeRoute,
    };
});
