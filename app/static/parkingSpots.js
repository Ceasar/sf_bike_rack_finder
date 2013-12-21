var SF = new google.maps.LatLng(37.785333, -122.417667);

var BICYCLING = google.maps.TravelMode.BICYCLING;
var WALKING = google.maps.TravelMode.WALKING;


var directionsService = new google.maps.DirectionsService();
var distanceMatrixService = new google.maps.DistanceMatrixService();

var directionsDisplays = [];
var map;

/*
 * Show directions to the closest (by time) bike parking spot from `origin`.
 */
var main = function(origin) {
    getNearbySpots(origin, function(parkingSpots) {
        // Note: Addresses contain only the street address, and are assumed to
        // be in San Francisco, CA.
        var spotsByAddress = _.indexBy(parkingSpots, function(spot) {
            return spot.address.toLowerCase() + " san francisco, ca";
        });
        var addresses = _.keys(spotsByAddress);
        var modes = [BICYCLING, WALKING];
        getClosestAddressByMode(origin, addresses, modes, function(closestAddressByMode) {
            _.each(modes, function(mode) {
                var closetSpot = spotsByAddress[closestAddressByMode[mode]];
                // todo: add a legend
                var color = (mode == BICYCLING) ? '00ff00' : '0000ff';
                displayDirections(origin, getPosition(closetSpot), mode, color);
            });
            parkingSpots.forEach(function(spot) {
                var marker = getMarker(spot);
            });
        });
    });
}

var initialize = function() {
    var mapOptions = {
        center: SF,
    }
    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    main(SF);
};

function displayDirections(start, end, travelMode, color) {
    var directionsRendererOptions = {
        draggable: true,
    };
    if (typeof color !== "undefined") {
        console.log(color);
        directionsRendererOptions.polylineOptions = {
            strokeColor: color,
        }
    }
    var directionsRenderer = new google.maps.DirectionsRenderer(directionsRendererOptions);
    var request = {
        origin: start,
        destination: end,
        travelMode: travelMode,
    };
    directionsService.route(request, function(result, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
            directionsRenderer.setMap(map);
        }
    });
}

function getPosition(spot) {
    return new google.maps.LatLng(
        spot.latitude,
        spot.longitude
    );
}

function getMarker(spot) {
    var marker = new google.maps.Marker({
        position: getPosition(spot),
        map: map,
        title: spot['location'],
    });
    return marker;
}

/*
 * Calls `success` with a map from `addresses` to their corresponding trip
 * durations, measured in seconds, starting from `origin`.
 *
 * Note: For maximum robustness, addresses should be as specific as possible,
 * otherwise they may be interpreted as being in unexpected parts of the world.
 */
function getTimesToLocations(origins, addresses, travelMode, success) {
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
            success(_.object(addresses, durations));
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
        getTimesToLocations([origin], addresses, travelMode, function(durations) {
            closestAddressByMode[travelMode] = _.min(addresses, function(address) {
                return durations[address];
            });
            finish();

        });
    });
}

function getNearbySpots(latLng, success) {
    $.getJSON("/closest", {
        latitude: latLng.lat(),
        longitude: latLng.lng(),
    }, success
    );
}

google.maps.event.addDomListener(window, 'load', initialize);
