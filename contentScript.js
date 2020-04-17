// TODO
// - refactor demographics and weather fetching to separate components/files
// - convert const to let
// - more accurate median property value metric
// - elevation, crime, price per sq ft
// - stats don't appear when navigating to google maps from google search
// - side by side comparison?

// We use Map instead of object in order to enforce insertion order
const DEMOGRAPHIC_METADATA = new Map();
DEMOGRAPHIC_METADATA.set("Population", { "censusCode": "DP05_0001E", "unit": "" }),
DEMOGRAPHIC_METADATA.set("Median property value", { "censusCode": "DP04_0089E", "unit": "" });
DEMOGRAPHIC_METADATA.set("Median household income", { "censusCode": "DP03_0062E", "unit": "" });
DEMOGRAPHIC_METADATA.set("Unemployment rate", { "censusCode": "DP03_0005PE", "unit": "%" });
DEMOGRAPHIC_METADATA.set("Bachelor's degree or higher", { "censusCode": "DP02_0067PE", "unit": "%" });
DEMOGRAPHIC_METADATA.set("Below 18", { "censusCode": "DP05_0019PE", "unit": "%" });
DEMOGRAPHIC_METADATA.set("Over 65", { "censusCode": "DP05_0024PE", "unit": "%" });
DEMOGRAPHIC_METADATA.set("White (not Hispanic)", { "censusCode": "DP05_0077PE", "unit": "%" });
DEMOGRAPHIC_METADATA.set("Black", { "censusCode": "DP05_0038PE", "unit": "%" });
DEMOGRAPHIC_METADATA.set("Asian", { "censusCode": "DP05_0044PE", "unit": "%" });
DEMOGRAPHIC_METADATA.set("Native", { "censusCode": "DP05_0039PE", "unit": "%" });
DEMOGRAPHIC_METADATA.set("Hispanic", { "censusCode": "DP05_0071PE", "unit": "%" });

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

let currentPlace = extractPlace(location.href);
let initialCurrentPlace = currentPlace;

setInterval(async function() {
	let newPlace = extractPlace(location.href);
  if (newPlace === currentPlace && !initialCurrentPlace) {
		return;
	}

  initialCurrentPlace = null;
  currentPlace = newPlace;

	if (currentPlace === null) {
		return;
	}

  console.log('current place ' + currentPlace);

  displayDemographicData(currentPlace);
  displayWeatherData(currentPlace);
}, 1000);

function sleep(milliseconds) {
  let currentTime = new Date().getTime();
  while (currentTime + milliseconds >= new Date().getTime()) { }
}

async function displayDemographicData(cityAndState) {
	let [city, stateAcronym] = cityAndState.split(',').map(x => x.trim());

	// Get the FIPS code for the city. We need this for the demographics API call.
  let stateFips = await fetchStateFips(stateAcronym);
  let cityFips = await fetchCityFips(city, stateFips, stateAcronym);

	// Get the city-specific demographic data, including population, 
  // median property value, etc.
	const censusCodes = [...DEMOGRAPHIC_METADATA.values()].map(details => details["censusCode"]);
	const joinedCodes = censusCodes.join(',');

  const demographicData = await fetchDemographicData(cityFips, stateFips, joinedCodes);
	const labels = [...DEMOGRAPHIC_METADATA.keys()];

  // Create a table displaying the demographic data. It will appear in the existing 
  // Google Maps sidebar.
  let table = $('<table>').css('margin', '10px').addClass('demographics-table');
	labels.forEach((label, i) => {
    let row = $('<tr>');
    let labelTd = $('<td>').text(label);
    let stat = formatWithCommas(demographicData[i]);
    let unit = DEMOGRAPHIC_METADATA.get(label)["unit"];
    let dataTd = $('<td>').text(stat + unit);
    row.append(labelTd);
    row.append(dataTd);
    table.append(row);
  });

  let tableInsertionLogic = () => {
    $(table).insertBefore('.between-tables');
    console.log('inserting demographics table');
    $('<div>').addClass('section-divider section-divider-bottom-line').insertBefore('.' + table.attr('class'));
  };

  let start = new Date();
  checkTable(table, start, tableInsertionLogic, cityAndState);
}

async function displayWeatherData(cityAndState) {
  const datasetid = 'NORMAL_MLY';
  const datatypeids = ['MLY-TMIN-NORMAL', 'MLY-TMAX-NORMAL', 'MLY-PRCP-AVGNDS-GE010HI'];

  let stations = await fetchStationsForCity(cityAndState, datatypeids);
  console.log(stations);

  if (stations.length === 0) {
    console.log('no stations nearby');
    return;
  }

  let weatherData = await fetchWeatherData(stations, datasetid, datatypeids, 2010);
  //console.log(weatherData);

  // Create a table displaying the weather data. It will appear in the existing 
  // Google Maps sidebar.
  table = $('<table>').css('margin', '10px').addClass('weather-table');
  let row = $('<tr>');
  let labelTd = $('<td>').text('Month');
  let loAndHiTd = $('<td>').text('High / Low');
  let daysRainTd = $('<td>').text('Rain');
  row.append(labelTd);
  row.append(loAndHiTd);
  row.append(daysRainTd);
  table.append(row);
	weatherData.forEach((data, month) => {
    let row = $('<tr>');
    let labelTd = $('<td>').text(month);
    let loAndHiTd = $('<td>').text(`${Math.round(data.get('MLY-TMAX-NORMAL'))} / ${Math.round(data.get('MLY-TMIN-NORMAL'))}`);
    let daysRainTd = $('<td>').text(`${Math.round(data.get('MLY-PRCP-AVGNDS-GE010HI'))} days`);
    row.append(labelTd);
    row.append(loAndHiTd);
    row.append(daysRainTd);
    table.append(row);
  });

  let tableInsertionLogic = () => {
    $(table).insertAfter('.between-tables');
    console.log('inserting weather table');
  };

  let start = new Date();
  checkTable(table, start, tableInsertionLogic, cityAndState);
}

function checkTable(table, start, tableInsertionLogic, cityAndState) {
  if (cityAndState !== currentPlace) {
    return;
  }

  if (!$('.' + table.attr('class')).length) {
    if (!$('.between-tables').length) {
      console.log('between-tables doesnt exist: adding');
      $('<div>').addClass('section-divider section-divider-bottom-line between-tables').insertAfter('.section-hero-header-title');
    }

    tableInsertionLogic();
  }

  let now = new Date();
  let elapsed = now - start;
  if (elapsed < 10000) {
    setTimeout(() => checkTable(table, start, tableInsertionLogic), 1000);
  }
  else {
    console.log('done checking ' + table.attr('class'));
  }
}


/**
 * Returns an array of json objects representing relevant stations near 
 * the given city.
 */
async function fetchStationsForCity(cityAndState, datatypeids) {
  let latLng = await fetchLatLngOfCity(currentPlace);

  console.log(latLng.lat + ',' + latLng.lng);

  let promises = [];

  let latOffset = milesToLatDegrees(50);
  let lngOffset = milesToLngDegrees(50, latLng.lat);
  let latLngBounds = calculateLatLngBounds(latLng, latOffset, lngOffset);
  console.log(latLngBounds);

  promises.push(fetchStationsInLatLngBounds(latLngBounds, 2010, datatypeids));
  promises.push(fetchElevationForLatLng(latLng));

  return Promise.all(promises).then(values => {
    let stations = values[0];

    console.log('number of stations within bounding box: ' + stations.length);

    if (stations.length === 0) {
      return stations;
    }

    sortStations(stations, latLng);

    let baseElevation = values[1];

    if (!baseElevation) {
      baseElevation = stations[0].elevation;
    }

    console.log('base elevation ' + baseElevation);

    stations = stations.filter(s => Math.abs(s.elevation - baseElevation) < 150);
    console.log('number of stations after elevation filtering: ' + stations.length);

    stations = stations.slice(0, 25);

    return stations;
  }, err => console.log('error occurred'));
}

/** 
 * Returns an object containing weather data, as specified by the given datasetid
 * and datatypeids, for each month in the given year.
 */
async function fetchWeatherData(stations, datasetid, datatypeids, year) {
  let stationsString = stations.map(s => 'stationid=' + s.id).join('&');
  let datatypeidsString = datatypeids.map(datatypeid => 'datatypeid=' + datatypeid).join('&');

  let url = `https://www.ncdc.noaa.gov/cdo-web/api/v2/data?datasetid=${datasetid}&${datatypeidsString}&${stationsString}&units=standard&startdate=${year}-01-01&enddate=${year}-12-31&limit=1000`;

  let response = await fetch(url, { headers: { token: config.NOAA_API_KEY } } );
  let json = await response.json();
  let results = json.results || [];

  let i = 0;
  for (let station of stations) {
    i++;
    let stationResults = results.filter(r => r.station === station.id);

    let stationDebugString = `${i}/${stations.length} ${station.id} ${station.name} ${station.distance} ${station.elevation}`;

    let expectedNumResults = MONTHS.size * datatypeids.length;
    if (stationResults.length !== expectedNumResults) {
      console.log('skipping ' + stationDebugString);
      if (stationResults.length > 0) {
        console.log(`Expected: ${expectedNumResults} Actual: ${stationResults.length}`);
      }
      continue;
    }

    console.log('using ' + stationDebugString);

    return groupMonthlyResults(stationResults);
  }

  console.log('fetched no weather data');

  return new Map();
}

/**
 * Given an array of objects where each contains a specific data value for a month,
 * and multiple may exist for that month, returns an array of 12 per-month objects 
 * each containing all data values for that month.
 */
function groupMonthlyResults(monthlyResults) {
  let monthsData = new Map();

  MONTHS.forEach((monthNum, month) => {
    let monthData = new Map();

    let zeroIndexedMonthNum = monthNum - 1;
    let monthResults = monthlyResults.filter(r => new Date(r.date).getMonth() === zeroIndexedMonthNum);
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
}

/**
 * Returns an array of objects, each containing info for a station that (a) is 
 * within the given latLngBounds and (b) has weather data for the given year. 
 */
async function fetchStationsInLatLngBounds(latLngBounds, year, datatypeids) {
  let southwest = latLngBounds.southwest;
  let northeast = latLngBounds.northeast;
  let latLngBoundsStr = [southwest.lat, southwest.lng, northeast.lat, northeast.lng].join(',');

  let minDate = `${year}-01-01`;
  let maxDate = `${year}-12-31`;
  let datatypeidsString = datatypeids.map(datatypeid => 'datatypeid=' + datatypeid).join('&');
  let url = `https://www.ncdc.noaa.gov/cdo-web/api/v2/stations?extent=${latLngBoundsStr}&startdate=${minDate}&enddate=${maxDate}&${datatypeidsString}&limit=1000`;

  let response = await fetch(url, { headers: { token: config.NOAA_API_KEY } } );
  let json = await response.json();
  let stations = json.results || [];

  stations.forEach(station => {
    station.distance = distanceToLatLng(station, latLngBounds.center);
  });

  return stations;
}

/** Sorts in place the given stations by increasing distance from the given latLng. */
function sortStations(stations, latLng) {
  stations.sort((a, b) => a.distance - b.distance);

}

function distanceToLatLng(station, latLng) {
  let stationLatLng = {
    lat: station.latitude,
    lng: station.longitude
  };
  
  return distanceBetweenLatLngs(latLng, stationLatLng);
}

function distanceBetweenLatLngs(latLngA, latLngB) {
  let latDeltaDegrees = Math.abs(latLngA.lat - latLngB.lat);
  let lngDeltaDegrees = Math.abs(latLngA.lng - latLngB.lng);

  let milesPerDegreeLat = 69.0;
  let milesPerDegreeLng = calculateMilesPerDegreeLng(latLngA.lat);

  let latDeltaMiles = latDeltaDegrees * milesPerDegreeLat;
  let lngDeltaMiles = lngDeltaDegrees * milesPerDegreeLng;

  // find hypotenuse of two sides
  return Math.hypot(latDeltaMiles, lngDeltaMiles);
}

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
}

/** 
 * Coverts the given number of miles to the equivalent number of degrees 
 * in latitude. Not extremely accurate but sufficient for general use. 
 * Works for any location, irrespective of longitude.
 */
function milesToLatDegrees(miles) {
  const milesPerDegreeLat = 69.0;
  return miles / milesPerDegreeLat;
}

/** 
 * Coverts the given number of miles to the equivalent number of degrees 
 * in longitude for a location at the given latitude. 
 */
function milesToLngDegrees(miles, lat) {
  return miles / calculateMilesPerDegreeLng(lat);
}

/** Converts the given number of degrees to radians. */
function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

/** 
 * Returns the number of miles in one degree of longitude for a location at the
 * given latitude.
 */
function calculateMilesPerDegreeLng(lat) {
  const latRadians = degreesToRadians(lat);
  const milesPerDegreeLatAtEquator = 69.172;
  return Math.cos(latRadians) * milesPerDegreeLatAtEquator;
}

/** 
 * Returns an object containing a latitude and longitude (in degrees) 
 * representing the given city. The latitude and longitude will 
 * generally be at a relevant central location within the city (e.g. downtown).
 */
async function fetchLatLngOfCity(cityAndState) {
  const apiKey = config.MAP_QUEST_API_KEY;
  const endpoint = `https://www.mapquestapi.com/geocoding/v1/address?key=${apiKey}&inFormat=kvp&outFormat=json&location=${cityAndState}&thumbMaps=false`;

	let response = await fetch(endpoint);
	let json = await response.json();

  // Skip first element in json, which consists of unneeded headers.
  return json.results[0].locations[0].latLng;
}

/** 
 * Returns the elevation (in meters) of the given latLng.
 */
async function fetchElevationForLatLng(latLng) {
  const apiKey = config.MAP_QUEST_API_KEY;
  let latLngString = latLng.lat + ',' + latLng.lng;
  let endpoint = `https://open.mapquestapi.com/elevation/v1/profile?key=${apiKey}&shapeFormat=raw&latLngCollection=${latLngString}`;

	let response = await fetch(endpoint);
	let json = await response.json();

  let statusCode = json.info.statuscode;

  if (statusCode == 601) {
    console.log('elevation fetch failed');
    return null;
  }

  let elevations = json.elevationProfile;

  return elevations[0].height;
}

/** 
 *	Returns a string containing the city and state acroynm, extracted from the given 
 *  url. E.g. 'Hayward, CA' 
 */
function extractPlace(url) {
	let regex = /https:\/\/www\.google\.com\/maps\/place\/(.+?)\/.*/;

	if (!regex.test(url)) {
		return null;
	}

	let place = url.match(regex)[1];	
	if (!place.includes(",") || place.split(",").length != 2) {
		return null;
	}

	place = place.replace(/\+/g, ' ');

	// Sometimes the place name is in the form 'Milpitas, CA 95035'. If so,
  // discard zip code. 
	let [city, state] = place.split(',').map(x => x.trim());
	if (state.split(' ').length === 2) {
		state = state.split(' ')[0];
	}

	return city + ', ' + state;
}

/** 
 * Used for tie-breaking when there are multiple jurisdictions with the same name.
 * In decreasing order of preference. 
 */
const PLACE_TYPES = ['city', 'town', 'municipality', 'village', 'CDP'];

/** Returns the FIPS for the given city in the state with the given info. */
async function fetchCityFips(city, stateFips, stateAcronym) {
  const fileName = 'states/st' + stateFips + '_' + stateAcronym.toLowerCase() + '_places.txt';
  const url = chrome.runtime.getURL(fileName);
  let response = await fetch(url);
  let text = await response.text();

  let regex = new RegExp(stateAcronym + '\\|' + stateFips + '\\|([0-9]+?)\\|.*?' + city + '.*');

  let lines = text.split("\n");
  let matchingLines = [];
  for (let line of lines) {
    let matches = line.match(regex);
    if (!matches || matches.length !== 2) {
      continue;
    }
    matchingLines.push(line);
  }

  // If there are multiple matches, find the most preferential as ordered in PLACE_TYPES
  for (let place of PLACE_TYPES) {
    for (let line of matchingLines) {
      if (line.includes(`${city} ${place}`)) {
        return line.match(regex)[1];
      }
    }
  }

  // If none of the matches were in PLACE_TYPES, just return the first match
  if (matchingLines.length > 0) {
    let line = matchingLines[0];
    return line.match(regex)[1];
  }

  console.log('Error: City FIPS not found');
  return null;
}

/** Returns the FIPS code of the given state. */
async function fetchStateFips(stateAcronym) {
  const url = chrome.runtime.getURL('states/state.txt');
  let response = await fetch(url);
  let text = await response.text();

  let regex = new RegExp('(.+?)\\|' + stateAcronym + '\\|.*');

  let lines = text.split("\n");
  for (let line of lines) {
    let matches = line.match(regex);
    if (!matches || matches.length !== 2) {
      continue;
    }
    return matches[1];
  }
  console.log('Error: State FIPS not found');
  return null;
}

/** Returns an array of strings representing various demographic stats. */
async function fetchDemographicData(cityFips, stateFips, joinedCensusCodes) {
	const endpoint = `https://api.census.gov/data/2018/acs/acs5/profile?get=${joinedCensusCodes}&for=place:${cityFips}&in=state:${stateFips}`;

	let response = await fetch(endpoint);
	let json = await response.json();

  // Skip first element in json, which consists of unneeded headers.
  return json[1];
}

/**
 * Returns the string form of the given number, properly formatted with commas.
 * E.g. 9999 -> '9,999'
 */
function formatWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

