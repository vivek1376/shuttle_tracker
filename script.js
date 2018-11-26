function initMap() {
    var map;
    var routes = [];
    var stops = [];
    var buses = [];
    var busIds = [];
    var routeIds = [];
    var stopIds = [];

    var jumpThreshold = 300;
    var currentRoute = undefined;

    var loc = {lat: 39.1031, lng: -84.5120};
    var loc2 = {lat: 39.1131, lng: -84.5320};

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

    //auto fetch location
    if (navigator.geolocation) {
        console.log("navigator");
        navigator.geolocation.getCurrentPosition(function (position) {

            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            console.log("inside");
            console.log(pos);

            //infoWindow.setPosition(pos);
            //infoWindow.setContent('Location found.');
            //infoWindow.open(map);

            //marker.setPosition(pos);

            marker.setPosition(pos);

            // infoWindow.setPosition(pos);
            // infoWindow.setContent('Location found.');
            //infoWindow.open(map);

            //map.setCenter(pos);
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

        fetchBuses(false);
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

            //    console.log(routes);
        });
    };


    var fetchBuses = function(autoNext) {


        $.getJSON("buses.json", function(dat) {
            console.log(dat);

            // B; NEW
            // e: OLD
            var b, e;
            for (var i = 0, len = dat.length; i < len; i++) {
                b = dat[i];

                e = buses[b.id];

                // if buses[] has old position busId ?????
                if (e) {
                    // YESS

                    // if route changed
                    if (b.route != e.route) {
                        e.icon.setMap(null);
                        delete buses[b.id];
                        rember(b.id, busIds);
                    } else {
                        // TODO ???????
//                        if (b.lastUpdate - e.lastUpdate > 60)
                        moveBus(e.id, b.lat, b.lon);

                        e.lat = b.lat;
                        e.lon = b.lon;
                        e.lastStop = b.lastStop;
                        e.lastUpdate = b.lastUpdate;
                    }

                    e.live = true;

                    // ????
                    // if (typeof routes[b.route] !== "undefined")
                    //     if (routes[b.route].visible !== true)
                    //         e.icon.setMap(null);


                }

                if (buses[b.id] === undefined && typeof routes[b.route] !== "undefined") {
                    b.ilat = b.lat;
                    b.ilon = b.lon;
                    b.live = true;

                    buses[b.id] = b;
                    busIds.push(b.id);

                    b.icon = createBusIcon(b);
                }
            }

            console.log(buses);

            // iterate over all buses
            for (var i = 0, len = busIds.length; i < len; i++) {
                b = buses[busIds[i]];
                if (!b)
                    continue;
                if (b.live !== true) {
                    buses[b.id] = undefined;
                    b.icon.setMap(null);
                    rember(b.id, busIds);
                    i--;
                } else
                    b.live = undefined;
            }
        });

        setTimeout(fetchBuses, 3000);
    };


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
            //console.log("mark:");
            //console.log(mark);
        }
    };

    var moveBus = function(busId, lat, lon) {
        var b = buses[busId];
        var route = routes[b.route];

        // TODO ???
        //if (!route || route.visible == false)
        if (!route)
            b.icon.setMap(null);

        if (route === undefined) {
            b.icon.setPosition({
                lat: lat,
                lng: lon
            });
            b.ilat = lat;
            b.ilon = lon;
        } else {
            var newloc = nearest_point_polyline(lat, lon, route.path, 80);
            b.icon.setPosition({
                lat: newloc[0],
                lng: newloc[1]
            });
            b.ilat = newloc[0];
            b.ilon = newloc[1];
        }
    };

    var createBusIcon = function(bus) {
        var annotation;
        var color;
        // if ('busAnnotation'in DM && DM.busAnnotation == 'bus_id')
        //     annotation = encodeURIComponent(bus.name);
        // else if (routes[bus.route] === undefined)
        //     annotation = "";
        // else
        //     annotation = encodeURIComponent(routes[bus.route].short_name);
        // if (routes[bus.route] === undefined)
        //     color = '333333';
        // else
        //     color = encodeURIComponent(routes[bus.route].color);

        //var iconImage = '/map/img/colorize?img=bus_icon&color=' + color + '&annotate=' + annotation;
        var icon = new google.maps.Marker({
            position: {
                lat: bus.lat,
                lng: bus.lon
            },
            title: "Bus " + bus.name,
            icon: {
                url: "MTS_Bus_icon.svg",
                //path: google.maps.SymbolPath.CIRCLE,
                //scale: 7
                scaledSize: new google.maps.Size(26,26),
                anchor: new google.maps.Point(13,13)
             },
            clickable: false,
            optimized: false
        });

        //if (routes[bus.route].visible)
        icon.setMap(map);

        return icon;
    };

    function haversine(lat1, lon1, lat2, lon2) {
        var R = 6371000;
        var dLat = toRad(lat2 - lat1);
        var dLon = toRad(lon2 - lon1);
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        return d;
    }

    function nearest_point_polyline(px, py, polyline, limit) {
        var nearest_point = [px, py];
        var nearest_dist = limit;
        if (polyline.length < 4)
            return nearest_point;
        for (var i = 0; i < polyline.length - 3; i += 2) {
            var nearest = nearest_point_segment(px, py, polyline[i + 0], polyline[i + 1], polyline[i + 2], polyline[i + 3]);
            var dist = haversine(px, py, nearest[0], nearest[1]);
            if (dist < nearest_dist) {
                nearest_point = nearest;
                nearest_dist = dist;
            }
        }
        return nearest_point;
    }

    function nearest_point_segment(px, py, vx, vy, wx, wy) {
        if (vx == wx && vy == wy)
            return [vx, vy];
        var l2 = (vx - wx) * (vx - wx) + (vy - wy) * (vy - wy);
        var t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
        if (t < 0)
            return [vx, vy];
        else if (t > 1.0)
            return [wx, wy];
        var projx = vx + t * (wx - vx);
        var projy = vy + t * (wy - vy);
        return [projx, projy];
    }

    function toRad(degree) {
        return degree * Math.PI / 180;
    }

    function rember(val, arr) {
        for (var i = 0, len = arr.length; i < len; i++)
            if (arr[i] === val) {
                arr.splice(i, 1);
                break;
            }
        return arr;
    }

    // TODO ??????
    function rember(val, arr) {
        for (var i = 0, len = arr.length; i < len; i++)
            if (arr[i] === val) {
                arr.splice(i, 1);
                break;
            }
        return arr;
    }

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
        //console.log(typeof r_id);

        pathLayerGroup.add(routes[r_id].polyline);
    };

    var removeRoute = function(r_id) {

        pathLayerGroup.remove(routes[r_id].polyline);
    };


    var addStopForRoute = function (route) {
        var s = routes[route].stopIcons;
        var i = s.length;

        while(i--) {
            stopIconLayerGroup.add(s[i]);
        }
    };

    var addStopsDropDownList = function (route) {
        var s = routes[route].stopIcons;
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
        var s = routes[route].stopIcons;
        var i = s.length;

        while(i--) {
            stopIconLayerGroup.remove(s[i]);
        }
    };


    var marker2 = new google.maps.Marker({
        position: map.getCenter(),
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8
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


