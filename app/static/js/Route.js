define(function () {
    // A DirectionsService, used to compute directions between points.
    var directionsService = new google.maps.DirectionsService();

    // A DistanceMatrixService, used to compute distances between a set of
    // points.
    var distanceMatrixService = new google.maps.DistanceMatrixService();

    var BICYCLING = google.maps.TravelMode.BICYCLING;
    var WALKING = google.maps.TravelMode.WALKING;

    /*  Icons representing each travel mode.
     *
     *  - Bicycling is represented as a man on a bicycle.
     *  - Walking is representing by the walk icon used on pedestrian crossing 
     *    signs.
     *
     * Both icons are blue and were taken from Google Maps.
     */ 
    var ICON_BY_TRAVEL_MODE = {
        BICYCLING: '/static/img/bicycle.png',
        WALKING: '/static/img/walk.png',
    }

    /* The color of the route.
     *
     * Note: We use orange to constant with blue travel mode icons.
     */
    var ROUTE_COLOR = 'ffaa00';
    var ROUTE_OPTIONS = {
        draggable: true,
        polylineOptions: {
            strokeColor: ROUTE_COLOR,
        },
        preserveViewport: true,
    };

    /*
     * Create a Route object.
     */
    var makeRoute = function(map, travelMode) {
        var directionsRenderer = new google.maps.DirectionsRenderer(ROUTE_OPTIONS);
        var route = new Route(travelMode, directionsRenderer);

        google.maps.event.addListener(directionsRenderer, 'directions_changed', function() {
            var leg = route.getLeg();
            if (map.getStartLocation().equals(leg.start_location)) {
                route.redraw();
            } else {
                route.broadcast('start_location_changed', {
                    start_location: leg.start_location,
                });
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
    var Route = function(travelMode, directionsRenderer) {
        var directionsRenderer = directionsRenderer;
        this.markers = [];
        var subscribers = [];
        this.travelMode = travelMode;

        this.subscribe = function(subscriber) {
            subscribers.push(subscriber);
        }

        this.broadcast = function(event_name, data) {
            _.each(subscribers, function(subscriber) {
                subscriber.notify(event_name, data);
            });
        }

        this.getMap = function() {
            return directionsRenderer.getMap();
        }

        this.setMap = function(gmap) {
            directionsRenderer.setMap(gmap);
        }

        this.getDirections = function() {
            return directionsRenderer.getDirections();
        }

        /*
         * Calculate a path to the closest parking spot.
         */
        this.calculateDirections = function(startLocation, parkingSpots, success) {
            getClosestSpot(startLocation, parkingSpots, travelMode, function(closestSpot) {
                var request = {
                    origin: startLocation,
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

    Route.prototype.getLeg = function() {
        var directions = this.getDirections();
        return directions.routes[0].legs[0];
    }

    /*
     * Erase markers from the path.
     */
    Route.prototype.erase = function() {
        _.each(this.markers, function(marker) {
            marker.setMap(null);
        });
        this.markers = [];
    }

    /*
     * Draw markers on the path.
     */
    Route.prototype.draw = function() {
        var that = this;
        var map = this.getMap();
        var leg = this.getLeg();
        _.each(leg.steps, function(step) {
            var marker = new google.maps.Marker({
                position: getMidpoint(step.start_location, step.end_location),
                icon: ICON_BY_TRAVEL_MODE[that.travelMode],
                zIndex: 1,
            });
            marker.setMap(map);
            that.markers.push(marker);
        });
    }

    Route.prototype.redraw = function() {
        this.erase();
        this.draw();
    }


    /*
     * Get the closest parking spot to `startLocation` by `travelMode`.
     */
    function getClosestSpot(startLocation, parkingSpots, travelMode, success) {
        var spotByLatLng = _.indexBy(parkingSpots, function(spot) {
            return spot.latLng;
        });
        var addresses = _.keys(spotByLatLng);
        getClosestLatLng(startLocation, addresses, travelMode, function(closestLatLng) {
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
     * durations, measured in seconds, starting from `startLocation`.
     *
     * Note: For maximum robustness, addresses should be as specific as possible,
     * otherwise they may be interpreted as being in unexpected parts of the world.
     */
    function getTimeAndDistanceByLatLng(startLocations, addresses, travelMode, success) {
        distanceMatrixService.getDistanceMatrix({
            origins: startLocations,
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
     * Calls `success` with the address closest to `startLocation` by trip duration using
     * `travelMode`.
     */
    function getClosestLatLng(startLocation, addresses, travelMode, success) {
        getTimeAndDistanceByLatLng([startLocation], addresses, travelMode, function(durationAndDistanceByLatLng) {
            var closestLatLng = _.min(addresses, function(address) {
                return durationAndDistanceByLatLng[address].duration;
            });
            success(closestLatLng);
        });
    }

    return {
        TRAVEL_MODES: [BICYCLING, WALKING],
        makeRoute: makeRoute,
    };
});
