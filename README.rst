SF Bicycle Parking
================================================================================

This is a small application that looks up your location and then shows you how
to get to the nearest bike rack, either by walking or bicycling.

http://findabikerack.herokuapp.com/

Features
================================================================================

- Get the closest bike rack by either walking or biking from your current
  location.

- Drag the route around and get directions to alternative racks.

- Drag your location around and see what the nearest racks are at other places.

Demo
================================================================================

Since the actual application tries to look up your location and you may not be
in SF, you can demo the application by going to ``/demo`` with an address.
Some interesting URLs:

- http://findabikerack.herokuapp.com/demo?address=400%20van%20ness%20sf (City Hall)
- http://findabikerack.herokuapp.com/demo?address=706%20Mission%20St,%20San%20Francisco,%20CA%2094103 (Uber HQ)
- http://findabikerack.herokuapp.com/demo?address=3rd%20and%20King%20st%20sf (AT&T Park)

Design rationale
================================================================================

- Since a user has a bike, they can either bike or walk to the nearest rack.
  As a biker myself, it's not obvious which is preferable-- most of the time
  I'd prefer to walk, but if a rack is out of the way I'd rather bike.
  Consequently, I decided the application should show both.

- It's unclear whether or not the user would prefer the closest bike rack in
  space or time. While for a lot of cases, these are the same, occasionally the
  one can get to a farther bike rack by riding one's bike a longer distance than
  the closest rack by biking. I decided the application should show the closest
  racks measured in time, for two reasons. First, the user clearly has the
  walking option presented, which presumably is always the closest one by
  distance (perhaps, excluding hills). Second, I generally assume the user is
  *not* actually at his destination when he uses the app, therefore he probably
  wants something in the general area, rather than specifically closest to him.
  In this case, he wants the closest thing by time rather than distance.

- It's unclear how many nearby racks to show. Up to 15 can be shown while still
  complying with Google's DistanceMatrixService (which computes the times to
  each destination). However, since I want to show each rack on the map and
  still provided detail, the fewer racks I show, the more likely the camera will
  get them all without zooming much. Furthermore, I assume the marginal value to
  the user with each additional rack decreases after we hit the number where we
  can reliably provide the closest spots.

**Disclaimer:** I'm not sure all of these spots are valid. The data is hard to
interpret. If there's any reason to believe people will actually use this, the
next step would be to reach out the maintainer of the dataset and clear up what
it means.

Example code
================================================================================

The code of interest is mostly the Javascript_. It consists of three files:
``main.js``, ``Route.js``, and ``Map.js``.

- main.js_ is responsible for finding the user's location (or the demo
  location) and initializing the system.

- Route.js_ is responsible for drawing routes.

- Map.js_ is responsible for drawing the map and the markers.

Of lesser interest is the `flask code`_, which provides an endpoint
(``/closest``) for finding the 5 closest spots to a location (using Euclidean
distance as a quick heuristic).

.. _Javascript: https://github.com/Ceasar/uber_coding_challenge/tree/master/app/static/js
.. _main.js: https://github.com/Ceasar/uber_coding_challenge/blob/master/app/static/js/main.js
.. _Route.js: https://github.com/Ceasar/uber_coding_challenge/blob/master/app/static/js/Route.js
.. _Map.js: https://github.com/Ceasar/uber_coding_challenge/blob/master/app/static/js/Map.js
.. _flask code: https://github.com/Ceasar/uber_coding_challenge/blob/master/app/views/general.py

About me
================================================================================

You can find out more about me by checking resume_ and the rest of my Github_.

.. _resume: http://ceasarbautista.com/resume
.. _Github: http://github.com/Ceasar
