define(function () {

    var makeMap = function() {
        var mapOptions = {
            zoom: 16,
        };
        var gmap = new google.maps.Map(
            document.getElementById("map-canvas"),
            mapOptions
        );
        return new Map(gmap);
    }

    var Map = function(map) {
        this.map = map;
        this.parkingSpots = [];
        this.routes = [];
        this.startLocation = null;
    }

    Map.prototype.addRoute = function(route) {
        route.setMap(this.map);
        route.subscribe(this);
        this.routes.push(route);
    }

    Map.prototype.getCenter = function() {
        return this.map.getCenter();
    }

    Map.prototype.setCenter = function(center) {
        this.map.setCenter(center);
    }

    Map.prototype.getStartLocation = function(center) {
        return this.startLocation;
    }

    Map.prototype.setStartLocation = function(center) {
        var that = this;
        if (!center.equals(this.getStartLocation())) {
            this.startLocation = center;
            this.erase();
            getNearbyParkingSpots(this.startLocation, function(spots) {
                that.parkingSpots = spots;
                _.each(that.routes, function(route) {
                    route.calculateDirections(that.startLocation, that.parkingSpots, function() {});
                });
                that.draw();
            });
        }
    }

    /*
     * Erase each of the parking spots from the map.
     */
    Map.prototype.erase = function() {
        _.each(this.parkingSpots, function(spot) {
            spot.erase();
        });
    }

    /*
     * Draw parking spots on the map.
     */
    Map.prototype.draw = function() {
        var that = this;
        _.each(this.parkingSpots, function(spot) {
            spot.draw(that.map);
        });
        this.map.panTo(this.startLocation);
        fixBounds(this.map, this.parkingSpots);
    }

    Map.prototype.notify = function(event_name, data) {
        if (event_name == 'start_location_changed' ) {
            this.setStartLocation(data.start_location);
        }
    }

    /*
     * Get a set of parking spots near `latLng`.
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
        this.spot = spot;
        this.latLng = new google.maps.LatLng(
            spot.latitude,
            spot.longitude
        );
        this.marker = null;
    }

    ParkingSpot.prototype.draw = function(map) {
        this.marker = new google.maps.Marker({
            map: map,
            position: this.latLng,
            title: this.spot['location'],
        });
    }

    ParkingSpot.prototype.erase = function() {
        this.marker.setMap(null);
        this.marker = null;
    }

    /*
     * Resize the bounds of `map` to include each of `targets`.
     */
    var getBounds = function(targets) {
        var bounds = _.foldl(targets, function(bounds, spot) {
            return bounds.extend(spot.latLng);
        }, new google.maps.LatLngBounds());
        return bounds;
    }

    var fixBounds = function(map, targets) {
        var bounds = getBounds(targets);
        map.panToBounds(bounds);
        if (_.some(targets, function(spot) {
            var mapBounds = map.getBounds();
            if (typeof mapBounds !== "undefined") {
                return !mapBounds.contains(spot.latLng);
            }
            return false;
        })) {
            map.fitBounds(bounds);
        }
    }

    return {
        makeMap: makeMap,
    };
});
