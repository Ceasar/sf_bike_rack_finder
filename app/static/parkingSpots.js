// var SF = new google.maps.LatLng(37.785333, -122.417667);
var SF = new google.maps.LatLng(37.783133, -122.417667);

var BICYCLING = google.maps.TravelMode.BICYCLING;
var WALKING = google.maps.TravelMode.WALKING;
var iconByTravelMode = {
    BICYCLING: '/static/img/bicycle.png',
    WALKING: '/static/img/walk.png',
}
var Marker = google.maps.Marker;


var directionsService = new google.maps.DirectionsService();
var distanceMatrixService = new google.maps.DistanceMatrixService();

var map;

/*
 * Show bicycling and walking directions to the closest bike parking spots from
 * `origin`.
 */
var main = function(origin) {
    getNearbySpots(origin, function(parkingSpots) {
        // Note: Addresses contain only the street address, and are assumed to
        // be in San Francisco, CA.
        var spotsByAddress = _.indexBy(parkingSpots, function(spot) {
            return spot.address.toLowerCase() + " san francisco, ca";
        });
        var addresses = _.keys(spotsByAddress);
        var travelModes = [BICYCLING, WALKING];
        getClosestAddressByMode(origin, addresses, travelModes, function(closestAddressByMode) {
            var closestSpotByMode = {
                WALKING: spotsByAddress[closestAddressByMode[WALKING]],
                BICYCLING: spotsByAddress[closestAddressByMode[BICYCLING]],
            }
            _.each(parkingSpots, function(spot) {
                var marker = new Marker({
                    position: spotToLatLng(spot),
                    title: spot['location']
                });
                if (spot === closestSpotByMode[WALKING]) {
                    marker.setAnimation(google.maps.Animation.BOUNCE);
                } else if (spot === closestSpotByMode[BICYCLING]) {
                    marker.setAnimation(google.maps.Animation.BOUNCE);
                }
                marker.setMap(map);
            });
            _.each(travelModes, function(travelMode) {
                var options = {
                    draggable: true,
                    markerOptions: {
                        // visible: false,
                    },
                    polylineOptions: {
                        strokeColor: 'ffaa00',
                    }
                };
                displayDirections(
                    origin,
                    spotToLatLng(closestSpotByMode[travelMode]),
                    travelMode,
                    options
                );
            });
        });
    });
}

var initialize = function() {
    var mapOptions = {
        center: SF,
    }
    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    map.setTilt(0);
    main(SF);
};

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
function displayDirections(start, end, travelMode, options) {
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
 * Convert a parking spot to a LatLng.
 */
function spotToLatLng(spot) {
    return new google.maps.LatLng(
        spot.latitude,
        spot.longitude
    );
}

/*
 * Calls `success` with a map from `addresses` to their corresponding trip
 * durations, measured in seconds, starting from `origin`.
 *
 * Note: For maximum robustness, addresses should be as specific as possible,
 * otherwise they may be interpreted as being in unexpected parts of the world.
 */
function getTimeAndDistanceByAddress(origins, addresses, travelMode, success) {
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
            var durationAndDistanceByAddress = _.object(addresses, 
                _.map(_.zip(durations, distances), function(t) {
                    return {
                        duration: t[0],
                        distance: t[1],
                    }
                })
            );
            success(durationAndDistanceByAddress);
        }
    });
}

/*
 * Calls `success` with the address closest to `origin` by trip duration using
 * `travelMode`.
 */
function getClosestAddressByMode(origin, addresses, travelModes, success) {
    var closestAddressByMode = {};
    var finish = _.after(travelModes.length, function() {
        success(closestAddressByMode);
    });
    _.each(travelModes, function(travelMode) {
        getTimeAndDistanceByAddress([origin], addresses, travelMode, function(durationAndDistanceByAddress) {
            closestAddressByMode[travelMode] = _.min(addresses, function(address) {
                return durationAndDistanceByAddress[address].duration;
            });
            finish();

        });
    });
}

/*
 * Get a set of parking spots nearby `latLng`.
 */
function getNearbySpots(latLng, success) {
    $.getJSON("/closest", {
        latitude: latLng.lat(),
        longitude: latLng.lng(),
    }, success
    );
}

google.maps.event.addDomListener(window, 'load', initialize);
