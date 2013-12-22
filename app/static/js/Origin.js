define(function () {
    var Origin = function(center) {
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

    return {
        Origin: Origin,
    }
});
