function initMap() {
    var map;
    var routes = [];
    var stops = [];
    var routeIds = [];
    var stopIds = [];
    var currentRoute = undefined;

    var loc = {lat: 39.1031, lng: -84.5120};

    // create map
    map = new google.maps.Map(document.getElementById('map'), {
        center: loc,
        zoom: 14,
        mapTypeId: 'roadmap',
        //disableDefaultUI: true,
        //gestureHandling: 'cooperative'
    });


    var pathLayerGroup = new google.maps.Data({
        map: map,
        style: function (feature) {
            return {
                strokeColor: feature.getProperty('strokeColor'),
                strokeOpacity: feature.getProperty('strokeOpacity'),
                strokeWeight: feature.getProperty('strokeWeight')
            };
        }
    });

    var stopIconLayerGroup = new google.maps.Data({
        map: map,
        style: function (feature) {
            return {
                icon: feature.getProperty('icon'),
                title: feature.getProperty('title'),
                zIndex: feature.getProperty('zIndex')
            };
        }
    });

    //Path.setMap(map);

    //map.setTilt(45);
    infoWindow = new google.maps.InfoWindow;

    var marker = new google.maps.Marker({position: loc, map: map});

    // auto fetch location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            infoWindow.setPosition(pos);
            infoWindow.setContent('Location found.');
            infoWindow.open(map);

            marker.setPosition(pos);

            // infoWindow.setPosition(pos);
            // infoWindow.setContent('Location found.');
            //infoWindow.open(map);
            map.setCenter(pos);
        }, function () {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
        handleLocationError(false, infoWindow, map.getCenter());
    }

    var routeLine = [];
    //$.getJSON("https://uc.doublemap.com/map/v2/routes", function (data) {
    $.getJSON("routes_data.json", function (data) {

        var points, r;//, routeLine;


        for (var i = 0, len = data.length; i < len; i++) {
            // reset
            points = [];
            r = data[i];
            routes[r.id] = r;
            routeIds.push(r.id);

            $('select#route').append('<option value="R'
                + r.id + '">' + r.name + '</option>');

            for (var p = 0, pl = r.path.length; p < pl; p += 2)
                points.push({
                    lat: r.path[p],
                    lng: r.path[p + 1]
                });

            r.polyline = new google.maps.Data.Feature({
                id: r.id,
                geometry: new google.maps.Data.LineString(points),
                properties: {
                    routeId: r.id,
                    strokeColor: "#" + r.color,
                    strokeOpacity: 0.6,
                    strokeWeight: 4
                }
            });

            //map.data.add(routeLine);
            //pathLayerGroup.add(r.polyline);
            //pathLayerGroup.remove(routeLine);
        }

        fetchStops();

    });


    // fetch all stops' info
    var fetchStops = function () {
        $.getJSON("stops.json", function (dat) {
            var s;
            var i = dat.length;

            while (i--) {
                s = dat[i];
                stops[s.id] = s;
                stopIds.push(s.id);
            }
//            console.log(dat);

            updateMapWithStops();

            currentRoute = routeIds[0];
            addRouteAndStops(currentRoute);

  //          console.log(routes);
        });
    }


    var updateMapWithStops = function() {
        var i = routeIds.length;
        var r, s, si;
        var stop, mark;

        while(i--) {
            r = routes[routeIds[i]];
            s = r.stops;
            si = s.length;
            r.stopIcons = [];

            while (si--) {
                stop = stops[s[si]];
                if (stop === undefined)
                    continue;

                mark = new google.maps.Data.Feature({
                    geometry: {
                        lat: stop.lat,
                        lng: stop.lon
                    },
                    properties: {
                        routeId: r.id,
                        title: stop.name,
                        icon: {
                            url: "stop_icon.png",
                            scaledSize: new google.maps.Size(12,12),
                            anchor: new google.maps.Point(6,6)
                        }
                    }
                });

                r.stopIcons.push(mark);
            }
        }
    };

    var removeRouteAndStops = function (route) {
        removeStopsForRoute(route);
        removeRoute(route);
    };

    var addRouteAndStops = function(route) {
        addRoute(route);
        addStopForRoute(route);
        removeStopDropDownList();
        addStopsDropDownList(route);
    };

    $('select#route').change(function () {
        removeRouteAndStops(currentRoute);
        currentRoute = $(this).children('option:selected').val().substr(1);
        addRouteAndStops(currentRoute);
    });

    var addRoute = function(r_id) {

        pathLayerGroup.add(routes[parseInt(r_id)].polyline);
    };

    var removeRoute = function(r_id) {

        pathLayerGroup.remove(routes[parseInt(r_id)].polyline);
    };


    var addStopForRoute = function (route) {
        var s = routes[parseInt(route)].stopIcons;
        var i = s.length;

        while(i--) {
            stopIconLayerGroup.add(s[i]);
        }
    };

    var addStopsDropDownList = function (route) {
        var s = routes[parseInt(route)].stopIcons;
        var i = s.length;

        while (i--) {
            $('select#stop').append('<option value="S'
                + s[i].getProperty("routeId") + '">'
                + s[i].getProperty("title") + '</option>');
        }
    };

    var removeStopDropDownList = function () {
        $('select#stop').empty();
    };

    var removeStopsForRoute = function (route) {
        var s = routes[parseInt(route)].stopIcons;
        var i = s.length;

        while(i--) {
            stopIconLayerGroup.remove(s[i]);
        }
    };


    var marker = new google.maps.Marker({
        position: map.getCenter(),
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4
        },
        draggable: true,
        map: map
    });


    var highlightRoute = function(routeId, state) {
        //return;
        var r = routes[routeId];
        //if (!r.visible)
          //  return;
        var p = r.polyline;
        if (state === true) {
            pathLayerGroup.overrideStyle(p, {
                strokeOpacity: 1.0,
                strokeWeight: 6,
                zIndex: 100
            });
        } else {
            pathLayerGroup.revertStyle(p);
        }
    };


    function handleLocationError(browserHasGeolocation, infoWindow, pos) {
        infoWindow.setPosition(pos);
        infoWindow.setContent(browserHasGeolocation ?
            'Error: The Geolocation service failed.' :
            'Error: Your browser doesn\'t support geolocation.');
        infoWindow.open(map);
    }


    // listeners
    pathLayerGroup.addListener('mouseover', function(event) {
        //console.log(event);
        return highlightRoute(event.feature.getProperty('routeId'), true);
    });

    pathLayerGroup.addListener('mouseout', function(event) {
        return highlightRoute(event.feature.getProperty('routeId'), false);
    });


}


