import json

from flask import render_template
import requests

from app import app


SF_BIKE_PARKING_API_ENDPOINT = "http://data.sfgov.org/resource/w969-5mn4.json"


def get_rows():
    with open("app/data/parking_spots.json") as f:
        return json.loads(f.read())

@app.route('/')
def index():
    rows = get_rows()
    return render_template("index.html", rows=rows)
