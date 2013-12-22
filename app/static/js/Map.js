define(function () {
    var Map = function(map) {
        var parkingSpots = [];
        var routes =  [];

        /*
         * Resize the bounds of `map` to include each of `targets`.
         */
        var getBounds = function(targets) {
            var bounds = _.foldl(targets, function(bounds, spot) {
                return bounds.extend(spot.latLng);
            }, new google.maps.LatLngBounds());
            return bounds;
        }

        this.addRoute = function(route) {
            route.setMap(map);
            routes.push(route);
        }

        this.notify = function(center) {
            _.each(parkingSpots, function(spot) {
                spot.clear();
            });
            getNearbyParkingSpots(center, function(spots) {
                parkingSpots = spots;
                _.each(parkingSpots, function(spot) {
                    spot.draw(map);
                });
                _.each(routes, function(route) {
                    route.calculateDirections(center, parkingSpots, function() {});
                });
            });
        }
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

    var ParkingSpot = function(spot) {
        this.latLng = new google.maps.LatLng(
            spot.latitude,
            spot.longitude
        );
        var marker;

        this.draw = function(map) {
            if (typeof marker === "undefined") {
                marker = new google.maps.Marker({
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

        this.clear = function() {
            marker.setMap(null);
        }
    }

    return {
        Map: Map,
    };
});
