var directionsService = new google.maps.DirectionsService();
var distanceMatrixService = new google.maps.DistanceMatrixService();
var Marker = google.maps.Marker;
var BICYCLING = google.maps.TravelMode.BICYCLING;
var WALKING = google.maps.TravelMode.WALKING;

// Use orange to constant with blue travel mode icons
var ROUTE_COLOR = 'ffaa00';
// Icons are taken from Google Maps
var iconByTravelMode = {
    BICYCLING: '/static/img/bicycle.png',
    WALKING: '/static/img/walk.png',
}


/*
 * Show directions to the closest bike parking spots from `origin` for a variety
 * of travel modes.
 */
var initialize = function() {
    function draw(center) {
        var mapOptions = {
            zoom: 20,
            center: center,
        };
        var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        var travelModes = [BICYCLING, WALKING];
        drawMap(map, center, travelModes);
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

function drawMap(map, origin, travelModes) {
    getNearbyParkingSpots(origin, function(parkingSpots) {
        drawParkingSpots(map, parkingSpots);
        google.maps.event.addListener(map, 'tilesloaded', _.once(function() {
            resizeBounds(map, parkingSpots);
        }));
        _.each(travelModes, function(travelMode) {
            var route = new Route(map, travelMode, parkingSpots);
            route.setOrigin(origin);
        });
    });
}


/*
 * Draw each parking spot on the map.
 *
 * Close parking spots will be emphasized.
 */
function drawParkingSpots(map, parkingSpots) {
    _.each(parkingSpots, function(spot) {
        var marker = new Marker({
            map: map,
            position: spot.latLng,
            title: spot['location'],
        });
    });
}

/*
 * Resize the bounds of `map` to include each of `targets`.
 */
function resizeBounds(map, targets) {
    var bounds = _.foldl(targets, function(bounds, spot) {
        return bounds.extend(spot.latLng);
    }, map.getBounds());
    map.fitBounds(bounds);
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
 * Display directions from `start` to `end` using `travelMode`.
 *
 * Note: Since it is expected that several routes will be shown at once, icons
 * indicating the mode of travel are shown along with the route.
 */
function Route(map, travelMode, parkingSpots) {
    var origin;
    var options = {
        draggable: true,
        polylineOptions: {
            strokeColor: ROUTE_COLOR,
        },
        preserveViewport: true,
    };
    var directionsRenderer = new google.maps.DirectionsRenderer(options);
    directionsRenderer.setMap(map);
    var markers = [];

    function draw(directions) {
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

    /*
     * Calculate a path to the closest parking spot.
     */
    var calculate = function() {
        getClosestSpot(origin, parkingSpots, travelMode, function(closestSpot) {
            var request = {
                origin: origin,
                destination: closestSpot.latLng,
                travelMode: travelMode,
            };
            directionsService.route(request, function(result, status) {
                if (status == google.maps.DirectionsStatus.OK) {
                    directionsRenderer.setDirections(result);
                }
            });
        });
    }

    this.setOrigin= function(val) {
        origin = val;
        calculate();
    }

    google.maps.event.addListener(directionsRenderer, 'directions_changed', function() {
        var directions = directionsRenderer.getDirections();
        var leg = directions.routes[0].legs[0];
        if (origin.equals(leg.start_location)) {
            draw(directions);
        } else {
            origin = leg.start_location;
            calculate();
        }
    });
    
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
            spot.latLng = new google.maps.LatLng(
                spot.latitude,
                spot.longitude
            );
            return spot;
        }))
    });
}

google.maps.event.addDomListener(window, 'load', initialize);
