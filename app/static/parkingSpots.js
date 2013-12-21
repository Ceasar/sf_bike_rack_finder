var SF = new google.maps.LatLng(37.783333, -122.416667);
var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var map;

var initialize = function() {
    directionsDisplay = new google.maps.DirectionsRenderer();
    var mapOptions = {
        center: SF,
        zoom: 13
    };
    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    directionsDisplay.setMap(map);
    showClosest(SF);
    // todo: use user's current position in deploy
    // navigator.geolocation.getCurrentPosition(function(position){
    //  var lat = position.coords.latitude;
    //  var lon = position.coords.longitude;
    //  var myLocation = new google.maps.LatLng(lat, lon);
    /// showClosest(myLocation);
    //});
};

function calcRoute(start, end) {
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

function showClosest(latLng) {
    $.getJSON("/closest", {
        latitude: latLng.lat(),
        longitude: latLng.lng(),
    }, function(parkingSpots) {
        var closestSpot = new google.maps.LatLng(
            parkingSpots[0].latitude,
            parkingSpots[0].longitude
            );
        var markers = [];
        parkingSpots.forEach(function(spot) {
            var position = new google.maps.LatLng(
                spot.latitude,
                spot.longitude
                );
            var marker = new google.maps.Marker({
                position: position,
                map: map,
                title: spot['location'],
            });
            markers.push(marker);
        });
        markers[0].setAnimation(google.maps.Animation.BOUNCE);
        calcRoute(latLng, closestSpot);
    }
    );
}

google.maps.event.addDomListener(window, 'load', initialize);
