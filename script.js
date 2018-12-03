function initMap() {
    var map;
    var routes = [];
    var stops = [];
    var buses = {};
    var busIds = [];
    var routeIds = [];
    var stopIds = [];
    var visibleBuses = [];
    var activeRouteStopIds_loc_eta_walkTime = [];

    var pos = undefined;

    var activeRoutes = new Set();

    var refreshBuses = true;

    var jumpThreshold = 300;
    var currentRoute = undefined;

    // var loc = {lat: 39.1031, lng: -84.5120};
    var loc = {lat: 39.144356, lng: -84.523241};

    var directionsService = new google.maps.DirectionsService();
    var directionsDisplay = new google.maps.DirectionsRenderer({
        preserveViewport: true,
        suppressMarkers: true
    });
    var chicago = new google.maps.LatLng(41.850033, -87.6500523);
    // var mapOptions = {
    // zoom:7,
    //  center: chicago
    // }


    // create map
    map = new google.maps.Map(document.getElementById('map'), {
        center: loc,
        zoom: 14,
        mapTypeId: 'roadmap'
        //disableDefaultUI: true,
        //gestureHandling: 'cooperative'
    });

    directionsDisplay.setMap(map);

    var distMatrixService = new google.maps.DistanceMatrixService();


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

            pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            console.log("inside");
            console.log(pos);

            // var request = {
            //     origin: loc,
            //     destination: pos,
            //     travelMode: 'WALKING'
            // };
            //
            // directionsService.route(request, function(result, status) {
            //     if (status == 'OK') {
            //         //console.log(result.routes[0].legs[0]);
            //        directionsDisplay.setDirections(result);
            //     }
            // });


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
    var plotRoute = function (pos1, pos2) {
        var request = {
            origin: pos1,
            destination: pos2,
            travelMode: 'WALKING'
        };

        directionsService.route(request, function(result, status) {
            if (status == 'OK') {
                //console.log(result.routes[0].legs[0]);
                directionsDisplay.setDirections(result);
            }
        });
    };

    var populateActiveRoutesFromBuses = function () {
        activeRoutes.clear();
        $.each(buses, function (i, bus) {
            activeRoutes.add(bus.route);
            //console.log(bus.route);
        });

        //console.log(activeRoutes);
    };

    var getDistanceFromStop = function (stop) {
        var pos2 = {
            lat: stop.lat,
            lng: stop.lon
        };

        var request = {
            origin: pos,
            destination: pos2,
            travelMode: 'WALKING'
        };

        directionsService.route(request, function(result, status) {
            if (status == 'OK') {
                console.log(result.routes[0].legs[0]);
                //directionsDisplay.setDirections(result);
            }
        });
    };

    var getActiveRoutesClosestStop = function (routes_set) {
        activeRouteStopIds_loc_eta_walkTime.length = 0;
        var activeStopLatLng = [];

        var count = 0;
        var count_max = 0;

        console.log("getActiveRouteStops");
        var dist = 0;
        var minDist = 100000000;
        // iterate over all active routes
        for (let r of routes_set) {
            console.log("route in set: " + r);

            count_max = count_max + parseInt(routes[parseInt(r)].stops.length);

            $.each(routes[parseInt(r)].stops, function (i, stop) {
                // each STOP
                // for each route, iterate over all stops
                //console.log(stop);
                //console.log("in each");
                //console.log(stops[stop]);
                console.log("eta response:");
                $.getJSON("https://uc.doublemap.com/map/v2/eta?stop=" +
                    + stop, function (output) {
                    count++;
                    //console.log("i: " + count);

                    if (output.etas[stop].etas.length > 0) {
                        //console.log("Ok");
                        //console.log(output.etas[stop].etas);
                        activeRouteStopIds_loc_eta_walkTime.push({
                            routeId: r,
                            stopId: stop,
                            eta: output.etas[stop].etas[0].avg
                        });

                        activeStopLatLng.push({lat: stops[stop].lat, lng: stops[stop].lon});
                    }

                    // if all calls finished
                    if (count == count_max) {
                        // console.log("here..." + count);
                        // console.log(activeRouteStopIds_loc_eta_walkTime);
                        //console.log("length: " + activeStopLatLng.length);
                        // console.log(activeStopLatLng);

                        distMatrixService.getDistanceMatrix({
                            origins: [loc],
                            destinations: activeStopLatLng,
                            travelMode: 'WALKING',
                        }, callback_getClosestStopFromDistMatrixResp);
                    }
                });
            });
        }
    };



    var display_info = function (routeId, stopId, eta, walkTime) {
        $('div#trackInfo').empty();

        var routeName = routes[routeId].name;
        var stopName = stops[stopId].name;

        var timeMin = Math.trunc(parseInt(walkTime)/60.0);

        if (typeof eta != 'undefined') {
            $('div#trackInfo').append('<p id="arriveTime">Shuttle arrives in<span>'
                + eta + ' min</span></p>');
        } else {
            $('div#trackInfo').append('<p id="arriveTime" class="noEta"><span>No ETA available</span></p>');
        }

        $('div#trackInfo').append('<p id="walkTime">Time to walk<span>'
            + timeMin + ' min</span></p>');

        $('div#trackInfo').append('<p id="stopName">Stop<span>'
            + stopName + '</span></p>');

        $('div#trackInfo').append('<p id="routeName">Route<span>'
            + routeName + '</span></p>');


    };

    var callback_getClosestStopFromDistMatrixResp = function (response, status) {
        console.log("status: " + status);
        console.log(response);
        // TODO change to MAX
        var min_time = 1000000000;
        var min_i = undefined;
        $.each(response.rows[0].elements, function (i, el) {
            activeRouteStopIds_loc_eta_walkTime[i].walkTime = el.duration.value;
            console.log(el);
            if (min_time > el.duration.value) {
                min_time = el.duration.value;
                min_i =  i;
            }
        });

        console.log("====>");
        console.log(activeRouteStopIds_loc_eta_walkTime);

        //console.log("activeRouteStopIds: " + activeRouteStopIds[min_i].routeId);
        if (typeof min_i !== 'undefined') {
            console.log("min_time: " + min_time);
            console.log(stops[activeRouteStopIds_loc_eta_walkTime[min_i].stopId]);
            console.log(routes[activeRouteStopIds_loc_eta_walkTime[min_i].routeId]);

            var pos = {
                lat: stops[activeRouteStopIds_loc_eta_walkTime[min_i].stopId].lat,
                lng: stops[activeRouteStopIds_loc_eta_walkTime[min_i].stopId].lon
            };

            plotRoute(loc, pos);
            //    console.log($("select#route").val());
            var child_opts = $("select#route").children().each(function () {
                console.log($(this).val());
            });

            $("select#route").val('R' + activeRouteStopIds_loc_eta_walkTime[min_i].routeId).change();
            $("select#stop").val('S' + activeRouteStopIds_loc_eta_walkTime[min_i].stopId).change();


            display_info(
                activeRouteStopIds_loc_eta_walkTime[min_i].routeId,
                activeRouteStopIds_loc_eta_walkTime[min_i].stopId,
                activeRouteStopIds_loc_eta_walkTime[min_i].eta,
                activeRouteStopIds_loc_eta_walkTime[min_i].walkTime
            );
            // $('option:selected', 'select#route').removeAttr('selected');
            //Using the value
            // $('select#route').find('option[value="R45"]').attr("selected", true);
        }
    };

    var routeLine = [];
    $.getJSON("https://uc.doublemap.com/map/v2/routes", function (data) {
    //$.getJSON("routes_data.json", function (data) {

        var points, r;//, routeLine;


        for (var i = 0, len = data.length; i < len; i++) {
            // reset
            points = [];
            r = data[i];
            routes[r.id] = r;
            routes[r.id].visible = false;
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
        $.getJSON("https://uc.doublemap.com/map/v2/stops", function(dat) {
        //$.getJSON("stops.json", function (dat) {
            var s;
            var i = dat.length;

            while (i--) {
                s = dat[i];
                stops[s.id] = s;
                stops[s.id].visible = false;
                stopIds.push(s.id);
            }
//            console.log(dat);

            updateMapWithStops();

            currentRoute = routeIds[0];
            addRouteStopsBuses(currentRoute);

            //    console.log(routes);
        });
    };


    var fetchBuses = function(autoNext) {
        $.getJSON("https://uc.doublemap.com/map/v2/buses", function(dat) {
        //$.getJSON("buses.json", function(dat) {
//            console.log(dat);

            // B; NEW
            // e: OLD
            var b, e;
            //console.log("buses.length");
            //console.log(dat.length);
            for (var i = 0, len = dat.length; i < len; i++) {
                b = dat[i];
                //console.log(b);
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
                    buses[b.id].visible = false;
                    busIds.push(b.id);

                    b.icon = createBusIcon(b);
                    //buses[b.id].icon.setMap(map);
                }
            }

            //console.log("buses:");
            //console.log(buses);

            //console.log(buses);

            // iterate over all buses, remove old buses ???
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

            setTimeout(fetchBuses, 3000);
        });
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

            //while (si--) {
            for (var i1 = 0; i1 < si; i1++) {
                stop = stops[s[i1]];
                if (stop === undefined)
                    continue;

                mark = new google.maps.Data.Feature({
                    geometry: {
                        lat: stop.lat,
                        lng: stop.lon
                    },
                    properties: {
                        stopId: stop.id,
                        title: stop.name,
                        routeId: r.id,
                        icon: {
                            url: "stop_icon.png",
                            scaledSize: new google.maps.Size(12,12),
                            anchor: new google.maps.Point(6,6)
                        },
                        zIndex: 10
                    }
                });

                r.stopIcons.push(mark);
            }
            //console.log("mark:");
            //console.log(mark);
        }
    };

    var fetchETA_updateBanner = function (stopId) {
        $.getJSON('https://uc.doublemap.com/map/v2/eta?stop=' + stopId, function(data) {
            var minTime = Number.MAX_SAFE_INTEGER;
            if (data.etas[stopId]) {
                var arr = data.etas[stopId].etas;

                if (arr.length == 0) {
                    $('div#trackInfo').html('<p>No ETA available.</p>');
                } else {
                    $.each(arr, function (i, e) {
                        if (parseInt(e.avg) < minTime)
                            minTime = parseInt(e.avg);
                    });

                    $('div#trackInfo').html('<p>ETA: .' + minTime + 'minutes</p>');
                }
            } else {
                $('div#trackInfo').html('<p>No ETA available.</p>');
            }
        });
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
            optimized: false,
            zIndex: 100
        });

        //if (routes[bus.route].visible)
        //icon.setMap(map);

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
        removeBusesForRoute(route);
        removeStopsForRoute(route);
        removeRoute(route);
    };

    var addRouteStopsBuses = function (route) {
        addRouteAndStops(route);
        addBusesForRoute(route);
    };

    var addRouteAndStops = function(route) {
        addRoute(route);
        addStopsForRoute(route);

        removeStopsDropDownList();
        addStopsDropDownList(route);
    };

    var removeBusesForRoute = function (route) {
        var visibleBusesNew = [];

        $.each(visibleBuses, function (i, bus_id) {
            if (route == buses[bus_id].route) {
                buses[bus_id].icon.setMap(null);
                buses[bus_id].visible = false;
            } else
                visibleBusesNew.push(bus_id);
        });

        visibleBuses.length = 0;
        visibleBuses = visibleBusesNew.slice();
    };

    var removeAllBuses = function () {
        $.each(visibleBuses, function (i, bus_id) {
            buses[bus_id].icon.setMap(null);
            buses[bus_id].visible = false;
        });

        visibleBuses.length = 0;
    };

    var addBusesForRoute = function(route) {
        console.log("currentRoute: "  + currentRoute);
        $.each(buses, function (i, bus) {
            //console.log(bus);

            if (bus.route == currentRoute) {
                visibleBuses.push(i);
                bus.icon.setMap(map);
                bus.visible = true;
            }
        })
    };




    var addRoute = function(r_id) {
        //console.log(typeof r_id);

        pathLayerGroup.add(routes[r_id].polyline);
        routes[r_id].visible = true;
    };

    var removeRoute = function(r_id) {

        pathLayerGroup.remove(routes[r_id].polyline);
        routes[r_id].visible = false;
    };


    var addStopsForRoute = function (route) {
        var s = routes[route].stopIcons;
        var i = s.length;

        while(i--) {
            stopIconLayerGroup.add(s[i]);
            s[i].visible = true;
        }
    };

    var addStopsDropDownList = function (route) {
        var s = routes[route].stopIcons;
        var i = s.length;

        while (i--) {
            $('select#stop').append('<option value="S'
                + s[i].getProperty("stopId") + '">'
                + s[i].getProperty("title") + '</option>');
        }
    };

    var removeStopsDropDownList = function () {
        $('select#stop').empty();
    };

    var removeStopsForRoute = function (route) {
        var s = routes[route].stopIcons;
        var i = s.length;

        while(i--) {
            stopIconLayerGroup.remove(s[i]);
            s[i].visible = false;
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


    var calc_eta_walkTime_stop_route = function (routeId, stopId) {

        var eta;

        console.log("route: " + routeId);
        console.log("stop: " + stopId);

        $.getJSON('https://uc.doublemap.com/map/v2/eta?stop=' + stopId, function(data) {

            console.log(data);
            if (data.etas[stopId].etas.length > 0) {
                eta = data.etas[stopId].etas[0].avg;
            } else {
                eta = undefined;
            }

            distMatrixService.getDistanceMatrix({
                origins: [loc],
                destinations: [{lat: stops[stopId].lat, lng: stops[stopId].lon}],
                travelMode: 'WALKING'
            }, function (resp, status) {
                console.log("status_matrixservice 2: " + status);
                console.log(resp);

                display_info(routeId, stopId, eta, resp.rows[0].elements[0].duration.value);
            });
        });
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


    $('select#route').change(function () {
        removeRouteAndStops(currentRoute);
        currentRoute = $(this).children('option:selected').val().substr(1);
        addRouteStopsBuses(currentRoute);

        $('select#stop').change();
    });

    $('select#stop').change(function () {
        console.log("STOP CHANGED..");
        currentStopId = $(this).children('option:selected').val().substr(1);


        calc_eta_walkTime_stop_route(
            $('select#route').children('option:selected').val().substr(1),
            currentStopId
        );
    });
    
    $('a#calcDist').click(function () {
        populateActiveRoutesFromBuses();
        getActiveRoutesClosestStop(activeRoutes);
    });
}

$(function(){
    console.log("announcement...");

    $(window).resize(function(){
        $('.drop_down_filter').select2();
        //$("span").text(x += 1);
    });

    $('.drop_down_filter').select2();

    // jQuery methods go here...
    $.getJSON('https://uc.doublemap.com/map/v2/announcements', function(dat) {
        $.each(dat, function (index, val) {
            //console.log(val);
            $('div#info').append('<p>' + val.message + '</p>');
        });
        //console.log(dat);
        var obj, linkedMessage;
        if (dat.length == 0) {
            console.log("");
        }

        //annB.append($("<em>").text("No new announcements"));
        else {
            ;
        }
    });
});

