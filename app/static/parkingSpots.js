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
    var map = new google.maps.Map(document.getElementById("map-canvas"));
    var travelModes = [BICYCLING, WALKING];
    var data = $('#json').text();
    if (data) {
        var json = JSON.parse(data);
        drawMap(map,
                new google.maps.LatLng(json['latitude'],
                                       json['longitude']),
                travelModes);
    } else {
        navigator.geolocation.getCurrentPosition(function(position) {
            drawMap(map,
                    new google.maps.LatLng(position.coords.latitude,
                                           position.coords.longitude),
                    travelModes);
        })
    }
};

function drawMap(map, origin, travelModes) {
    getNearbyParkingSpots(origin, function(parkingSpots) {
        getClosestSpotByMode(origin, parkingSpots, travelModes, function(closestSpotByMode) {
            var closestSpots = _.values(closestSpotByMode);
            drawParkingSpots(map, parkingSpots, closestSpots);
            _.each(travelModes, function(travelMode) {
                drawRoute(map, origin, closestSpotByMode[travelMode].latLng, travelMode);
            });
            google.maps.event.addListener(map, 'tilesloaded', _.once(function() {
                resizeBounds(map, closestSpots);
            }));
        });
    });
}


/*
 * Draw each parking spot on the map.
 *
 * Close parking spots will be emphasized.
 */
function drawParkingSpots(map, parkingSpots, closestSpots) {
    _.each(parkingSpots, function(spot) {
        var marker = new Marker({
            position: spot.latLng,
            title: spot['location']
        });
        if (_.contains(closestSpots, spot)) {
            marker.setAnimation(google.maps.Animation.BOUNCE);
        }
        marker.setMap(map);
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
    var spotByLatLng = _.indexBy(parkingSpots, function(spot) {
        return spot.latLng;
    });
    var addresses = _.keys(spotByLatLng);
    getClosestLatLngByMode(origin, addresses, travelModes, function(closestLatLngByMode) {
        var closestSpotByMode = _.foldl(travelModes, function(memo, travelMode) {
            memo[travelMode] = spotByLatLng[closestLatLngByMode[travelMode]];
            return memo;
        }, {});
        success(closestSpotByMode);
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
function drawRoute(map, start, end, travelMode) {
    var options = {
        draggable: true,
        polylineOptions: {
            strokeColor: ROUTE_COLOR,
        }
    };
    var directionsRenderer = new google.maps.DirectionsRenderer(options);
    var request = {
        origin: start,
        destination: end,
        travelMode: travelMode,
    };
    directionsService.route(request, function(result, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
            directionsRenderer.setMap(map);
            var leg = result.routes[0].legs[0];
            _.each(leg.steps, function(step) {
                var marker = new Marker({
                    position: getMidpoint(step.start_location, step.end_location),
                    icon: iconByTravelMode[travelMode],
                    zIndex: 1,
                });
                marker.setMap(map);
            });
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
function getClosestLatLngByMode(origin, addresses, travelModes, success) {
    var closestLatLngByMode = {};
    var finish = _.after(travelModes.length, function() {
        success(closestLatLngByMode);
    });
    _.each(travelModes, function(travelMode) {
        getTimeAndDistanceByLatLng([origin], addresses, travelMode, function(durationAndDistanceByLatLng) {
            closestLatLngByMode[travelMode] = _.min(addresses, function(address) {
                return durationAndDistanceByLatLng[address].duration;
            });
            finish();

        });
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
