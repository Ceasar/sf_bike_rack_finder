var directionsService = new google.maps.DirectionsService();
var distanceMatrixService = new google.maps.DistanceMatrixService();
var Marker = google.maps.Marker;
var BICYCLING = google.maps.TravelMode.BICYCLING;
var WALKING = google.maps.TravelMode.WALKING;

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


/*
 * Show directions to the closest bike parking spots from `origin` for a variety
 * of travel modes.
 */
var main = function() {
    var travelModes = [BICYCLING, WALKING];
    function draw(center) {
        var mapOptions = {
            zoom: 20,
            center: center,
        };
        var gmap = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

        var origin = new Origin(center);

        getNearbyParkingSpots(center, function(parkingSpots) {
            var map;
            var routes = _.map(travelModes, function (travelMode) {
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

                origin.subscribe(route);
                return route;
            });
            map = new Map(gmap, parkingSpots, routes);
            origin.subscribe(map);
            origin.setCenter(center);
        });
    }
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

Origin = function(center) {
    var center = center;
    var subscribers = [];

    this.subscribe = function(subscriber) {
        subscribers.push(subscriber);
    }

    this.getCenter = function() {
        return center;
    }

    this.setCenter = function(val) {
        center = val;
        _.each(subscribers, function(subscriber) {
            subscriber.notify(val);
        })
    }
}

Map = function(map, parkingSpots, routes) {
    var parkingSpots = parkingSpots; 
    var routes = routes;

    /*
     * Resize the bounds of `map` to include each of `targets`.
     */
    var resizeBounds = function(targets) {
        var bounds = _.foldl(targets, function(bounds, spot) {
            return bounds.extend(spot.latLng);
        }, map.getBounds());
        map.fitBounds(bounds);
    }

    this.draw = function() {
        var origin = map.getCenter();
        _.each(parkingSpots, function(spot) {
            spot.draw(map);
        });
        google.maps.event.addListener(map, 'tilesloaded', _.once(function() {
            resizeBounds(parkingSpots);
        }));
    }

    this.notify = function(center) {
        this.draw();
        _.each(routes, function(route) {
            route.calculateDirections(center, parkingSpots, function() {});
        });
    }
}

ParkingSpot = function(spot) {
    this.latLng = new google.maps.LatLng(
        spot.latitude,
        spot.longitude
    );
    var marker;

    this.draw = function(map) {
        if (typeof marker === "undefined") {
            marker = new Marker({
                map: map,
                // todo: this is redundant
                position: new google.maps.LatLng(
                    spot.latitude,
                    spot.longitude
                ),
                title: spot['location'],
            });
        }
        return marker;
    }
}

/*
 * Display directions from `start` to `end` using `travelMode`.
 *
 * Note: Since it is expected that several routes will be shown at once, icons
 * indicating the mode of travel are shown along with the route.
 */
function Route(travelMode, directionsRenderer) {
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
            var marker = new Marker({
                position: getMidpoint(step.start_location, step.end_location),
                icon: iconByTravelMode[travelMode],
                zIndex: 1,
            });
            marker.setMap(map);
            markers.push(marker);
        });
    }

    this.notify = function(origin) {
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
 * For each travel mode, get the closest spot to `origin`.
 */
function getClosestSpotByMode(origin, parkingSpots, travelModes, success) {
    var closestSpotByMode = {};
    var finish = _.after(travelModes.length, function() {
        success(closestSpotByMode);
    });
    _.each(travelModes, function(travelMode) {
        getClosestSpot(origin, parkingSpots, travelMode, function(closestSpot) {
            closestSpotByMode[travelMode] = closestSpot;
            finish();
        });
    });
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

/*
 * Get a set of parking spots nearby `latLng`.
 */
function getNearbyParkingSpots(latLng, success) {
    $.getJSON("/closest", {
        latitude: latLng.lat(),
        longitude: latLng.lng(),
    }, function(parkingSpots) {
        success(_.map(parkingSpots, function(spot) {
            return new ParkingSpot(spot);
        }))
    });
}

google.maps.event.addDomListener(window, 'load', main);
