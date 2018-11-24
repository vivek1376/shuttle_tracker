function initMap() {
    var map;
    var routes = [];
    var currentRoute = undefined;

    var loc = {lat: 39.1031, lng: -84.5120};

    // var coord_path = [
    //     {lat: 39.1, lng: -84.5},
    //     {lat: 39.3, lng: -84.4},
    //     {lat: 39.0, lng: -84.7},
    //     {lat: 39.5, lng: -84.0}
    // ];
    //
    // var Path = new google.maps.Polyline({
    //     path: coord_path,
    //     geodesic: true,
    //     strokeColor: '#FF0000',
    //     strokeOpacity: 1.0,
    //     strokeWeight: 2
    // });

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

    // var pathLayerGroup = new google.maps.Data({
    //     map: map,
    //     style: {
    //         strokeColor: '#753E24',
    //         strokeOpacity: 0.9,
    //         strokeWeight: 4
    //     }
    // });

//        var r;

    var routeLine = [];
    $.getJSON("routes_data.json", function (data) {

        var points, r;//, routeLine;


        for (var i = 0, len = data.length; i < len; i++) {
            // reset
            points = [];
            r = data[i];
            routes[r.id] = r;

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

        //for (i=0; i < 0; i++)
          //  pathLayerGroup.remove(routeLine[i]);  //to remove



        //console.log("r.id : " + r.id);


        //
        // r.polyline = new google.maps.Data.Feature({
        //     id: r.id,
        //     geometry: new google.maps.Data.LineString(points),
        //     properties: {
        //         routeId: r.id,
        //         strokeColor: "#" + r.color,
        //         strokeOpacity: 0.6,
        //         strokeWeight: 10
        //     }
        // });
        // //
        // pathLayerGroup.add(r.polyline);
        //
        // var polylineBounds = new google.maps.LatLngBounds();
        // r.polyline.getGeometry().forEachLatLng(function(ll) {
        //     polylineBounds.extend(ll);
        // });

        currentRoute = data[0].id;
        pathLayerGroup.add(routes[currentRoute].polyline);

    });

    $.getJSON("stops.json", function (dat) {
        console.log(dat);
        var s;
        var i = dat.length;

        while (i--) {
            s = dat[i];
            //console.log([s.lat, s.lon]);
            //
            // var opt = new google.maps.Data.add({
            //     geometry: {lat: s.lat, lng: s.lon},
            //     properties: {
            //         //routeId: i,
            //         //title: s.name,
            //         //icon: google.maps.SymbolPath.CIRCLE,
            //         style: {
            //             icon: {
            //                 path: google.maps.SymbolPath.CIRCLE,
            //                 scale: 4
            //             }
            //         }
            //         // strokeColor: "#cccccc",
            //         // strokeOpacity: 0.6,
            //         // strokeWeight: 10
            //     }
            // });
            //
            // map.data.add(opt);

            var opt = new google.maps.Data.Feature({
                geometry: {lat: s.lat, lng: s.lon},
                properties: {
                    icon: {
                        url: "stop_icon.png",
                        scaledSize: new google.maps.Size(12, 12),
                        anchor: new google.maps.Point(6, 6)
                    }
                }
                });

            stopIconLayerGroup.add(opt);
            //map.data.add(opt);
        }
    });

    $('select#route').change(function () {
        removeRoute(currentRoute);
        currentRoute = $(this).children('option:selected').val().substr(1);
        addRoute(currentRoute);
    });
    // pathLayerGroup.setStyle({
    //     visible: true,
    //     icon: {
    //         path: google.maps.SymbolPath.CIRCLE,
    //         scale: 4
    //     }
    // });

    var addRoute = function(r_id) {

        pathLayerGroup.add(routes[parseInt(r_id)].polyline);
    };

    var removeRoute = function(r_id) {

        pathLayerGroup.remove(routes[parseInt(r_id)].polyline);
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

    // map.data.setStyle({
    //     visible: true,
    //     icon: {
    //         path: google.maps.SymbolPath.CIRCLE,
    //         scale: 4
    //     }
    // });

    // var removeRoute = function(routeId) {
    //     var r = routes[routeId];
    //     showRoute(routeId, false);
    //     routeIds.splice(routeIds.indexOf(routeId), 1);
    //     delete routes[routeId];
    //     DM.removeRoute(r);
    // };

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
            // if (r.stopIcons !== undefined)
            //     for (var i = 0; i < r.stopIcons.length; i++)
            //         stopIconLayerGroup.overrideStyle(r.stopIcons[i], {
            //             zIndex: 1
            //         });
        } else {
            pathLayerGroup.revertStyle(p);
            // if (r.stopIcons !== undefined)
            //     for (var i = 0; i < r.stopIcons.length; i++)
            //         stopIconLayerGroup.revertStyle(r.stopIcons[i]);
        }
    };

    // listeners
    pathLayerGroup.addListener('mouseover', function(event) {
        //console.log(event);
        return highlightRoute(event.feature.getProperty('routeId'), true);
    });

    pathLayerGroup.addListener('mouseout', function(event) {
        return highlightRoute(event.feature.getProperty('routeId'), false);
    });

    function handleLocationError(browserHasGeolocation, infoWindow, pos) {
        infoWindow.setPosition(pos);
        infoWindow.setContent(browserHasGeolocation ?
            'Error: The Geolocation service failed.' :
            'Error: Your browser doesn\'t support geolocation.');
        infoWindow.open(map);
    }
}


