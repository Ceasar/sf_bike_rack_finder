var SF = new google.maps.LatLng(37.783333, -122.416667);

var directionsService = new google.maps.DirectionsService();
var distanceMatrixService = new google.maps.DistanceMatrixService();

var directionsDisplay;
var map;
var markers = {};

var initialize = function() {
    directionsDisplay = new google.maps.DirectionsRenderer();
    var mapOptions = {
        center: SF,
        zoom: 13
    };
    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    directionsDisplay.setMap(map);
    var target = SF;
    getNearbySpots(target, function(parkingSpots) {
        parkingSpots.forEach(function(spot) {
            showSpot(spot);
        });
        getClosestSpot(parkingSpots, function(spot) {
            showDirections(target, spot);
            // todo: this doesn't work, probably because async
            // markers[spot].setAnimation(google.maps.Animation.BOUNCE);
        });
    });
};

function showDirections(start, end) {
    var request = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.BICYCLING
    };
    directionsService.route(request, function(result, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsDisplay.setDirections(result);
        }
    });
}

function showSpot(spot) {
    var position = new google.maps.LatLng(
        spot.latitude,
        spot.longitude
    );
    var marker = new google.maps.Marker({
        position: position,
        map: map,
        title: spot['location'],
    });
    markers[spot] = marker;
}

function getClosestSpot(parkingSpots, success) {
    var closestSpot = new google.maps.LatLng(
        parkingSpots[0].latitude,
        parkingSpots[0].longitude
    );
    success(closestSpot);
}

function getNearbySpots(latLng, success) {
    $.getJSON("/closest", {
        latitude: latLng.lat(),
        longitude: latLng.lng(),
    }, success
    );
}

google.maps.event.addDomListener(window, 'load', initialize);
