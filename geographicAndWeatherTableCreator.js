const geographicAndWeatherTableCreator = (function() {
  const MONTHS = new Map(Object.entries({
    'Jan': '01',
    'Feb': '02',
    'Mar': '03',
    'Apr': '04',
    'May': '05',
    'Jun': '06',
    'Jul': '07',
    'Aug': '08',
    'Sep': '09',
    'Oct': '10',
    'Nov': '11',
    'Dec': '12'
  }));
  
  const FEET_PER_METER =  3.281;
  
  /**
   * The max number of feet a station's elevation can differ from a city's elevation 
   * to be considered representative for that city.
   */
  const STATION_ELEVATION_MAX_DELTA = 150;
  
  /** Displays weather data in the sidebar of Google Maps. */
  async function createGeographicAndWeatherTables(cityInfo) {
    const datasetid = 'NORMAL_MLY';
    const datatypeids = ['MLY-TMIN-NORMAL', 'MLY-TMAX-NORMAL', 'MLY-PRCP-AVGNDS-GE010HI'];
  
    const stationsAndElevation = await fetchStationsAndElevationForCity(cityInfo.latLng, datatypeids);
    const [stations, elevation] = stationsAndElevation;
    //console.log(stations);
  
    if (stations.length === 0) {
      console.log('no stations nearby');
      return;
    }
  
    const weatherData = await fetchWeatherData(stations, datasetid, datatypeids, 2010);
    //console.log(weatherData);
  
    // Create a table displaying the weather data. It will appear in the existing 
    // Google Maps sidebar.
    elevationTable = $('<table>').css('margin', '10px').addClass('elevation-table');
  
    const elevationRow = $('<tr>');
    const elevationLabelTd = $('<td>').text('Elevation').css('width', cityInfoConstants.LABEL_DEFAULT_WIDTH);
    const elevationTd = $('<td>').text(`${Math.round(elevation * FEET_PER_METER)} ft`);
    elevationRow.append(elevationLabelTd);
    elevationRow.append(elevationTd);
    elevationTable.append(elevationRow);
  
    const weatherTableClassName = 'weather-table';
    weatherTable = $('<table>').css('margin', '10px').addClass(weatherTableClassName);
    const hdrRow = $('<tr>');
    const hdrMonthTd = $('<td>').text('Month').css('width', '145px');
    const hdrLoAndHiTd = $('<td>').text('High / Low').css('width', '145px');;
    const hdrDaysRainTd = $('<td>').text('Rain');
    hdrRow.append(hdrMonthTd);
    hdrRow.append(hdrLoAndHiTd);
    hdrRow.append(hdrDaysRainTd);
    weatherTable.append(hdrRow);
  
  	weatherData.forEach((data, month) => {
      const row = $('<tr>');
      const monthTd = $('<td>').text(month);
      const loAndHiTd = $('<td>').text(`${Math.round(data.get('MLY-TMAX-NORMAL'))} / ${Math.round(data.get('MLY-TMIN-NORMAL'))}`);
      const daysRainTd = $('<td>').text(`${Math.round(data.get('MLY-PRCP-AVGNDS-GE010HI'))} days`);
      row.append(monthTd);
      row.append(loAndHiTd);
      row.append(daysRainTd);
      weatherTable.append(row);
    });
  
    return [elevationTable, weatherTable]; 
  };
  
  /**
   * Returns an array containing:
   *   - an array of json objects representing relevant stations near the given city.
   *   - the elevation (in meters) of the given city
   */
  async function fetchStationsAndElevationForCity(latLng, datatypeids) {
    const promises = [];
  
    const latOffset = milesToLatDegrees(50);
    const lngOffset = milesToLngDegrees(50, latLng.lat);
    const latLngBounds = calculateLatLngBounds(latLng, latOffset, lngOffset);
    //console.log(latLngBounds);
  
    promises.push(fetchStationsInLatLngBounds(latLngBounds, 2010, datatypeids));
    promises.push(fetchElevationForLatLng(latLng));
  
    return Promise.all(promises).then(values => {
      let stations = values[0];
  
      //console.log('number of stations within bounding box: ' + stations.length);
  
      if (stations.length === 0) {
        return stations;
      }
  
      sortStations(stations, latLng);
  
      let baseElevation = values[1];
  
      if (!baseElevation) {
        baseElevation = stations[0].elevation;
      }
  
      stations = stations.filter(s => Math.abs(s.elevation - baseElevation) < STATION_ELEVATION_MAX_DELTA);
      //console.log('number of stations after elevation filtering: ' + stations.length);
  
      stations = stations.slice(0, 25);
  
      return [stations, baseElevation];
    }, err => console.log('error occurred'));
  };
  
  /** 
   * Returns an object containing weather data, as specified by the given datasetid
   * and datatypeids, for each month in the given year.
   */
  async function fetchWeatherData(stations, datasetid, datatypeids, year) {
    const stationsString = stations.map(s => 'stationid=' + s.id).join('&');
    const datatypeidsString = datatypeids.map(datatypeid => 'datatypeid=' + datatypeid).join('&');
  
    const url = `https://www.ncdc.noaa.gov/cdo-web/api/v2/data?datasetid=${datasetid}&${datatypeidsString}&${stationsString}&units=standard&startdate=${year}-01-01&enddate=${year}-12-31&limit=1000`;
  
    const response = await fetch(url, { headers: { token: config.NOAA_API_KEY } } );
    const json = await response.json();
    const results = json.results || [];
  
    let i = 0;
    for (let station of stations) {
      i++;
      const stationResults = results.filter(r => r.station === station.id);
  
      const stationDebugString = `${i}/${stations.length} ${station.id} ${station.name} ${station.distance} ${station.elevation}`;
  
      const expectedNumResults = MONTHS.size * datatypeids.length;
      if (stationResults.length !== expectedNumResults) {
        //console.log('skipping ' + stationDebugString);
        if (stationResults.length > 0) {
          //console.log(`Expected: ${expectedNumResults} Actual: ${stationResults.length}`);
        }
        continue;
      }
  
      //console.log('using ' + stationDebugString);
  
      return groupMonthlyResults(stationResults);
    }
  
    console.log('fetched no weather data');
  
    return new Map();
  };
  
  /**
   * Given an array of objects where each contains a specific data value for a month,
   * and multiple may exist for that month, returns an array of 12 per-month objects 
   * each containing all data values for that month.
   */
  function groupMonthlyResults(monthlyResults) {
    const monthsData = new Map();
  
    MONTHS.forEach((monthNum, month) => {
      const monthData = new Map();
  
      const zeroIndexedMonthNum = monthNum - 1;
      const monthResults = monthlyResults.filter(r => new Date(r.date).getMonth() === zeroIndexedMonthNum);
      monthResults.forEach(result => {
        if (monthData.has(result.datatype)) {
          console.log(result.datatype + ' already set for ' + month);
        }
        else {
          monthData.set(result.datatype, result.value);
        }
      });
  
      monthsData.set(month, monthData);
    })
  
    return monthsData;
  };
  
  /**
   * Returns an array of objects, each containing info for a station that (a) is 
   * within the given latLngBounds and (b) has weather data for the given year. 
   */
  async function fetchStationsInLatLngBounds(latLngBounds, year, datatypeids) {
    const southwest = latLngBounds.southwest;
    const northeast = latLngBounds.northeast;
    const latLngBoundsStr = [southwest.lat, southwest.lng, northeast.lat, northeast.lng].join(',');
  
    const minDate = `${year}-01-01`;
    const maxDate = `${year}-12-31`;
    const datatypeidsString = datatypeids.map(datatypeid => 'datatypeid=' + datatypeid).join('&');
    const url = `https://www.ncdc.noaa.gov/cdo-web/api/v2/stations?extent=${latLngBoundsStr}&startdate=${minDate}&enddate=${maxDate}&${datatypeidsString}&limit=1000`;
  
    const response = await fetch(url, { headers: { token: config.NOAA_API_KEY } } );
    const json = await response.json();
    const stations = json.results || [];
  
    stations.forEach(station => {
      station.distance = distanceToLatLng(station, latLngBounds.center);
    });
  
    return stations;
  };
  
  /** Sorts in place the given stations by increasing distance from the given latLng. */
  function sortStations(stations, latLng) {
    stations.sort((a, b) => a.distance - b.distance);
  };
  
  function distanceToLatLng(station, latLng) {
    const stationLatLng = {
      lat: station.latitude,
      lng: station.longitude
    };
    
    return cityInfoUtils.distanceBetweenLatLngs(latLng, stationLatLng);
  };
  
  
  /**
   * Returns an object containing two latLng coordinates representing
   * the southwest and northeast corners of a box encompassing the given
   * center latLng. The box's height is latOffset * 2 and the box's length
   * is lngOffset * 2.
   */
  function calculateLatLngBounds(center, latOffset, lngOffset) {
    const southwest = new Map();
    southwest.lat = center.lat - latOffset;
    southwest.lng = center.lng - lngOffset;
  
    const northeast = new Map();
    northeast.lat = center.lat + latOffset;
    northeast.lng = center.lng + lngOffset;
  
    const latLngBounds = new Map();
    latLngBounds.southwest = southwest;
    latLngBounds.northeast = northeast;
  
    latLngBounds.center = center;
  
    return latLngBounds;
  };
  
  /** 
   * Coverts the given number of miles to the equivalent number of degrees 
   * in latitude. Not extremely accurate but sufficient for general use. 
   * Works for any location, irrespective of longitude.
   */
  function milesToLatDegrees(miles) {
    const milesPerDegreeLat = 69.0;
    return miles / milesPerDegreeLat;
  };
  
  /** 
   * Coverts the given number of miles to the equivalent number of degrees 
   * in longitude for a location at the given latitude. 
   */
  function milesToLngDegrees(miles, lat) {
    return miles / cityInfoUtils.calculateMilesPerDegreeLng(lat);
  };
  
  /** 
   * Returns the elevation (in meters) of the given latLng.
   */
  async function fetchElevationForLatLng(latLng) {
    const apiKey = config.MAP_QUEST_API_KEY;
    const latLngString = latLng.lat + ',' + latLng.lng;
    const endpoint = `https://open.mapquestapi.com/elevation/v1/profile?key=${apiKey}&shapeFormat=raw&latLngCollection=${latLngString}`;
  
  	const response = await fetch(endpoint);
  	const json = await response.json();
  
    const statusCode = json.info.statuscode;
  
    if (statusCode == 601) {
      console.log('elevation fetch failed');
      return null;
    }
  
    const elevations = json.elevationProfile;
  
    return elevations[0].height;
  };

  return {
    createGeographicAndWeatherTables: createGeographicAndWeatherTables,
  };
})();
