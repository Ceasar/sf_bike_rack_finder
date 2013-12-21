import math
import json

from flask import render_template, request

from app import app


SF_BIKE_PARKING_API_ENDPOINT = "http://data.sfgov.org/resource/w969-5mn4.json"


class ParkingSpot(object):
    def __init__(self, address, coordinates, location, status):
        self.address = address
        self.coordinates = coordinates
        self.location = location
        self.status = status

    def distance(self, coordinates):
        return self.coordinates.distance(coordinates)

    def dict(self):
        return {
            "address": self.address,
            "latitude": self.coordinates.latitude,
            "longitude": self.coordinates.longitude,
            "location": self.location,
            "status": self.status,
        }

    def json(self):
        return json.dumps(self.dict())

class Coordinates(object):
    def __init__(self, latitude, longitude):
        self.latitude = latitude
        self.longitude = longitude

    def distance(self, other):
        # Using Euclidean distance for simplification, though this may be
        # inaccurate
        return math.sqrt((self.latitude - other.latitude) ** 2
                         + (self.longitude - other.longitude) ** 2)

def get_parking_spots():
    with open("app/data/parking_spots.json") as f:
        parking_spots = json.loads(f.read())
        for parking_spot in parking_spots:
            coordinates = Coordinates(
                float(parking_spot['coordinates']['latitude']),
                float(parking_spot['coordinates']['longitude'])
            )
            yield ParkingSpot(
                # NOTE: This is nonsensical
                address=parking_spot['yr_inst'],
                coordinates=coordinates,
                location=parking_spot['location_name'],
                status=parking_spot['status'],
            )

@app.route('/')
def index():
    parking_spots = get_parking_spots()
    return render_template("index.html", parking_spots=parking_spots)

@app.route('/closest')
def closest():
    """Get the closest parking spot."""
    coordinates = Coordinates(float(request.args['latitude']),
                              float(request.args['longitude']))
    parking_spots = sorted(get_parking_spots(), 
                           key=lambda ps: ps.distance(coordinates))
    return json.dumps([ps.dict() for ps in parking_spots[:10]])
