SF Bicycle Parking
================================================================================

This is a small application that looks up your location and then shows you how
to get to the nearest bike rack, either by walking or bicycling.

Features
================================================================================

- Get the closest bike rack by either walking or biking from your current
  location.

- Drag the route around and get directions to alternative racks.

- Drag your location around and see what the nearest racks are at other places.

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

Demo
================================================================================

Since the actual application tries to look up your location and you may not be
in SF, you can demo the application by going to ``/demo`` with an address.
Some interesting URLs:

- ``/demo?address=400%20van%20ness%20sf`` (City Hall)
- ``/demo?address=706%20Mission%20St,%20San%20Francisco,%20CA%2094103`` (Uber HQ)
- ``/demo?address=3rd%20and%20King%20st%20sf`` (AT&T Park)
