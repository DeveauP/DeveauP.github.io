var locations = [
        ['HitSeq 2015', 53.3498053, -5, "Oral presentation","July 2015"],
        ['HitSeq 2015', 53.3498053, -6.2, "Poster presentation","July 2015"],
		['ISMB 2015', 53.3498053, -7, "Poster presentation","July 2015"],
		['ABS4NGS', 45.764043, 4.835658999999964, "Oral presentation","December 2015"],
		['Scientific days Doctorate school of cancerology', 48.726199, -3.985324999999989, "Poster presentation","May 2016"],
		['ANR 2016', -16.9203338, 145.77085950000003, "Oral presentation","June 2016"],
		['Institut Curie', 48.8566140, 2.3522219, "Laboratory","2014 - 2017"]
		];
		var map;
		//var infowindow = new google.maps.InfoWindow();
		var marker, i;
		function initMap() {
			map = new google.maps.Map(document.getElementById('map'), {
			  center: {lat: 48.8566140, lng: 2.3522219},
              zoom: 1,
			  disableDefaultUI: true

            });

			for (i = 0; i < locations.length; i++) {
				//var contentString = '<div id="content">'+
				//					'<h3 id="heading">'+locations[i][0]+'</h3>'+
				//					'<div id="bodyContent"><p> Date:'+
				//					locations[i][4]+
				//					'</p>'+
				//					'<p>Type:'+
				//					locations[i][3]+
				//					'</p></div></div>';
				var contentString = '<h3>'+locations[i][0]+ '</h3><p>Date: '+locations[i][4]+'<p>Type: '+ locations[i][3] + '</p>'					
				var infowindow = new google.maps.InfoWindow();
				marker = new google.maps.Marker({
				position: new google.maps.LatLng(locations[i][1], locations[i][2]),
				map: map,
				title: locations[i][3]
				
				//click: return function() {
				//		infowindow.setContent(locations[i][0]);
				//		infowindow.open(map, marker);
				//		}		
				});
				
				google.maps.event.addListener(marker,'click', (function(marker,contentString,infowindow) {
					return function(){
						infowindow.setContent(contentString);
						infowindow.open(map, marker);
					};
				})(marker,contentString,infowindow));

				
			}
		}