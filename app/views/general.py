import json

from flask import render_template
import requests

from app import app


SF_BIKE_PARKING_API_ENDPOINT = "http://data.sfgov.org/resource/w969-5mn4.json"


class ParkingSpot(object):
    def __init__(self, address, location, status):
        self.address = address
        self.location = location
        self.status = status


def get_parking_spots():
    with open("app/data/parking_spots.json") as f:
        parking_spots = json.loads(f.read())
        for parking_spot in parking_spots:
            yield ParkingSpot(
                # NOTE: This is nonsensical
                address=parking_spot['yr_inst'],
                location=parking_spot['location_name'],
                status=parking_spot['status'],
            )

@app.route('/')
def index():
    parking_spots = get_parking_spots()
    return render_template("index.html", parking_spots=parking_spots)
