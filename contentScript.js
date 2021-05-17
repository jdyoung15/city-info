// TODO
// - refactor demographics and weather fetching to separate components/files
// - more accurate median property value metric
// - crime, price per sq ft
// - add walkscore for specific addresses
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

const FEET_PER_METER =  3.281;

/**
 * The max number of feet a station's elevation can differ from a city's elevation 
 * to be considered representative for that city.
 */
const STATION_ELEVATION_MAX_DELTA = 150;

/** 
 * The number of years behind the current year that the most recent American Community 
 * Survey 5-Year Data is supported. 
 */
const ACS_LAG_YEARS = 2;

const DIVIDER_CLASS_NAME = 'mapsConsumerUiSubviewSectionGm2Divider__divider';

const LABEL_DEFAULT_WIDTH = '290px';

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

  //console.log('current place ' + currentPlace);

  displayHousingData(currentPlace);
  displayDemographicData(currentPlace);
  displayWeatherData(currentPlace);
}, 1000);

function sleep(milliseconds) {
  let currentTime = new Date().getTime();
  while (currentTime + milliseconds >= new Date().getTime()) { }
}

async function displayHousingData(cityAndState) {
	let [city, stateAcronym] = cityAndState.split(',').map(x => x.trim());

  const cityRegionId = await findCityRegionId(cityAndState);
  const apiKey = config.QUANDL_API_KEY;
	let endpoint = `https://www.quandl.com/api/v3/datatables/ZILLOW/DATA?indicator_id=ZSFH&region_id=${cityRegionId}&api_key=${apiKey}`;

  const metro = await findMetroRegionId(cityAndState);
  console.log(metro);

  chrome.runtime.sendMessage( // goes to background.js
    endpoint,
    response => {
      let json = JSON.parse(response);
      let monthlyZsfh = json.datatable.data;
      let latestMonthZsfh = monthlyZsfh[0][3];

      // Create a table displaying the housing data. It will appear in the existing 
      // Google Maps sidebar.
      let table = $('<table>').css('margin', '10px').addClass('housing-table');

      let row = $('<tr>');
      let labelTd = $('<td>').text('ZHVI SFH').css('width', LABEL_DEFAULT_WIDTH);
      let stat = formatWithCommas(latestMonthZsfh);
      let unit = '$';
      let dataTd = $('<td>').text(unit + stat);
      row.append(labelTd);
      row.append(dataTd);
      table.append(row);

      let tableInsertionLogic = () => {
        $(table).insertBefore('.between-tables');
        //console.log('inserting housing table');
        $('<div>').addClass(DIVIDER_CLASS_NAME).insertBefore('.' + table.attr('class'));
      };

      let start = new Date();
      checkTable(table, start, tableInsertionLogic, cityAndState);
    }); 
}

async function findMetroRegionId(cityAndState) {
	let [city, stateAcronym] = cityAndState.split(',').map(x => x.trim());

  let fileName = 'cities.csv';
  let url = chrome.runtime.getURL(fileName);
  let response = await fetch(url);
  let text = await response.text();

  const regexes = [
    new RegExp('[0-9]+,city,' + city + '; ' + stateAcronym + '; ([^;]+);'),
    new RegExp('[0-9]+,city,(' + city + '); ' + stateAcronym),
  ]

  let lines = text.split("\n");
  // E.g. 'San Francisco-Oakland-Hayward'
  let metro;
  for (let line of lines) {
    for (let regex of regexes) {
      let matches = line.match(regex);
      if (matches) {
        metro = matches[1];
        break;
      }
    }
    if (metro) {
      break;
    }
  }

  if (!metro) {
    console.log('Error: city metro not found');
    return null;
  }

  metro = metro.replace(/[.']/g, "");
  console.log('City metro: ' + metro);
  const choices = metro.split(/[-\/]+/);

  const choicesCopy = [...choices];
  let currentSubstring = choicesCopy[0];
  for (let i = 1; i < choicesCopy.length; i++) {
    choices.push(currentSubstring + '-' + choicesCopy[i]);
  }

  //console.log(choices);


  fileName = 'metros.csv';
  url = chrome.runtime.getURL(fileName);
  response = await fetch(url);
  text = await response.text();

  const stateAndNeighbors = states.filter(state => state.code === stateAcronym)[0].Neighborcodes;
  stateAndNeighbors.push(stateAcronym);

  const regex = new RegExp('([0-9]+),metro,"(' + choices.join('|') + '), (' + stateAndNeighbors.join('|') + ')');

  lines = text.split("\n");
  const metroCandidates = []
  for (let line of lines) {
    matches = line.match(regex);
    if (matches) {
      metroCandidates.push({
        'name': matches[2], 
        'id': parseInt(matches[1]), 
        'state': matches[3],
        'line': line,
      });
    }
  }

  // same state metros startsWith
  // other same state metros
  // neighboring state metros startsWith
  // other neighboring state metros

  if (metroCandidates.length == 1) {
    const selected = metroCandidates[0];
    if (selected.state === stateAcronym) {
      console.log('Found single matching metro in same state: ' + selected.line);
    }
    else {
      console.log('Found single matching metro in neighboring state: ' + selected.line);
    }
    return selected.id;
  }
  else if (metroCandidates.length > 1) {
    const startsWithMatches = metroCandidates.filter(candidate => metro.startsWith(candidate.name));
    const startsWithMatchesInState = startsWithMatches.filter(candidate => candidate.state === stateAcronym);
    if (startsWithMatchesInState.length === 1) {
      console.log('Found single matching startsWith metro in same state: ' + startsWithMatchesInState[0].line);
      return startsWithMatchesInState[0].id;
    }
    else if (startsWithMatchesInState.length > 1) {
      for (let candidate of startsWithMatchingInState) {
        console.log('Found multiple matching startsWith metros in same state: ' + candidate.line);
      }
      return null;
    }
    else {
      // startsWithMatches are all in neighboring states
      if (startsWithMatches.length === 1) {
        console.log('Found single matching startsWith metro in neighboring state: ' + startsWithMatches[0].line);
        return startsWithMatches[0].id;
      }
      else {
        for (let candidate of startsWithMatches) {
          console.log('Found multiple matching startsWith metros in neighboring states: ' + candidate.line);
        }
        return null;
      }
    }
  }
  else {
    console.log('Matching metro not found');
    return null;
  }
}

async function findCityRegionId(cityAndState) {
	let [city, stateAcronym] = cityAndState.split(',').map(x => x.trim());

  let fileName = 'cities.csv';
  let url = chrome.runtime.getURL(fileName);
  let response = await fetch(url);
  let text = await response.text();

  let regex = new RegExp('([0-9]+?),city,' + city + '; ' + stateAcronym);

  let lines = text.split("\n");
  for (let line of lines) {
    let matches = line.match(regex);
    if (matches) {
      return parseInt(matches[1], 10);
    }
  }

  console.log('Error: city not found');
  return null;
}

async function displayDemographicData(cityAndState) {
	let [city, stateAcronym] = cityAndState.split(',').map(x => x.trim());

	// Get the FIPS code for the city. We need this for the demographics API call.
  let stateFips = await fetchStateFips(stateAcronym);
  let cityFips = await fetchCityFips(city, stateFips, stateAcronym);

	// Get the city-specific demographic data, including population, 
  // median property value, etc.
	let censusCodes = [...DEMOGRAPHIC_METADATA.values()].map(details => details["censusCode"]);
	let joinedCodes = censusCodes.join(',');

  let demographicData = await fetchDemographicData(cityFips, stateFips, joinedCodes);
	let labels = [...DEMOGRAPHIC_METADATA.keys()];

  // Create a table displaying the demographic data. It will appear in the existing 
  // Google Maps sidebar.
  let table = $('<table>').css('margin', '10px').addClass('demographics-table');
	labels.forEach((label, i) => {
    let row = $('<tr>');
    let labelTd = $('<td>').text(label).css('width', LABEL_DEFAULT_WIDTH);
    let stat = formatWithCommas(demographicData[i]);
    let unit = DEMOGRAPHIC_METADATA.get(label)["unit"];
    let dataTd = $('<td>').text(stat + unit);
    row.append(labelTd);
    row.append(dataTd);
    table.append(row);
  });

  let tableInsertionLogic = () => {
    $(table).insertBefore('.between-tables');
    //console.log('inserting demographics table');
    $('<div>').addClass(DIVIDER_CLASS_NAME).insertBefore('.' + table.attr('class'));
  };

  let start = new Date();
  checkTable(table, start, tableInsertionLogic, cityAndState);
}

async function displayWeatherData(cityAndState) {
  let datasetid = 'NORMAL_MLY';
  let datatypeids = ['MLY-TMIN-NORMAL', 'MLY-TMAX-NORMAL', 'MLY-PRCP-AVGNDS-GE010HI'];

  let stationsAndElevation = await fetchStationsAndElevationForCity(cityAndState, datatypeids);
  let [stations, elevation] = stationsAndElevation;
  //console.log(stations);

  if (stations.length === 0) {
    console.log('no stations nearby');
    return;
  }

  let weatherData = await fetchWeatherData(stations, datasetid, datatypeids, 2010);
  //console.log(weatherData);

  // Create a table displaying the weather data. It will appear in the existing 
  // Google Maps sidebar.
  elevationTable = $('<table>').css('margin', '10px').addClass('elevation-table');

  let elevationRow = $('<tr>');
  let elevationLabelTd = $('<td>').text('Elevation').css('width', LABEL_DEFAULT_WIDTH);
  let elevationTd = $('<td>').text(`${Math.round(elevation * FEET_PER_METER)} ft`);
  elevationRow.append(elevationLabelTd);
  elevationRow.append(elevationTd);
  elevationTable.append(elevationRow);

  const weatherTableClassName = 'weather-table';
  table = $('<table>').css('margin', '10px').addClass(weatherTableClassName);
  let row = $('<tr>');
  let labelTd = $('<td>').text('Month').css('width', '145px');
  let loAndHiTd = $('<td>').text('High / Low').css('width', '145px');;
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
    $(elevationTable).insertBefore(`.${weatherTableClassName}`);
    $('<div>').addClass(DIVIDER_CLASS_NAME + ' between-tables').insertBefore(`.${weatherTableClassName}`);
    //console.log('inserting weather and elevation tables');
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
      //console.log('between-tables doesnt exist: adding');
      $('<div>').addClass(DIVIDER_CLASS_NAME + ' between-tables').insertAfter('.section-hero-header-title');
    }

    tableInsertionLogic();
  }

  let now = new Date();
  let elapsed = now - start;
  if (elapsed < 10000) {
    setTimeout(() => checkTable(table, start, tableInsertionLogic, cityAndState), 1000);
  }
  else {
    //console.log('done checking ' + table.attr('class'));
  }
}


/**
 * Returns an array containing:
 *   - an array of json objects representing relevant stations near the given city.
 *   - the elevation (in meters) of the given city
 */
async function fetchStationsAndElevationForCity(cityAndState, datatypeids) {
  let latLng = await fetchLatLngOfCity(cityAndState);

  //console.log(latLng.lat + ',' + latLng.lng);

  let promises = [];

  let latOffset = milesToLatDegrees(50);
  let lngOffset = milesToLngDegrees(50, latLng.lat);
  let latLngBounds = calculateLatLngBounds(latLng, latOffset, lngOffset);
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
  let southwest = new Map();
  southwest.lat = center.lat - latOffset;
  southwest.lng = center.lng - lngOffset;

  let northeast = new Map();
  northeast.lat = center.lat + latOffset;
  northeast.lng = center.lng + lngOffset;

  let latLngBounds = new Map();
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
  let milesPerDegreeLat = 69.0;
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
  let latRadians = degreesToRadians(lat);
  let milesPerDegreeLatAtEquator = 69.172;
  return Math.cos(latRadians) * milesPerDegreeLatAtEquator;
}

/** 
 * Returns an object containing a latitude and longitude (in degrees) 
 * representing the given city. The latitude and longitude will 
 * generally be at a relevant central location within the city (e.g. downtown).
 */
async function fetchLatLngOfCity(cityAndState) {
  let apiKey = config.MAP_QUEST_API_KEY;
  let endpoint = `https://www.mapquestapi.com/geocoding/v1/address?key=${apiKey}&inFormat=kvp&outFormat=json&location=${cityAndState}&thumbMaps=false`;

	let response = await fetch(endpoint);
	let json = await response.json();

  // Skip first element in json, which consists of unneeded headers.
  return json.results[0].locations[0].latLng;
}

/** 
 * Returns the elevation (in meters) of the given latLng.
 */
async function fetchElevationForLatLng(latLng) {
  let apiKey = config.MAP_QUEST_API_KEY;
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
 *	Returns a string representing a "place", i.e. containing the city and 
 *  state acroynm, extracted from the given url. E.g. 'Hayward, CA' 
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

  // Remove any diacritics (e.g. Nānākuli -> Nanakuli);
  city = decodeURIComponent(city).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

	return city + ', ' + state;
}

/** 
 * Used for tie-breaking when there are multiple jurisdictions with the same name.
 * In decreasing order of preference. 
 */
const PLACE_TYPES = ['city', 'town', 'municipality', 'village', 'CDP'];

/** Returns the FIPS for the given city in the state with the given info. */
async function fetchCityFips(city, stateFips, stateAcronym) {
  // Remove periods from city name (e.g. "St. Paul") for easier comparison
  let removePeriodsRegex = /[\.]/g;
  city = city.replace(removePeriodsRegex, '');

  let fileName = 'states/st' + stateFips + '_' + stateAcronym.toLowerCase() + '_places.txt';
  let url = chrome.runtime.getURL(fileName);
  let response = await fetch(url);
  let text = await response.text();

  let regex = new RegExp(stateAcronym + '\\|' + stateFips + '\\|([0-9]+?)\\|' + city + '.*');

  let lines = text.split("\n");
  let matchingLines = [];
  for (let line of lines) {
    line = line.replace(removePeriodsRegex, '');
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
  let url = chrome.runtime.getURL('states/state.txt');
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
  const latestYear = new Date().getFullYear();
  const latestAcsYear = latestYear - ACS_LAG_YEARS;
	let endpoint = `https://api.census.gov/data/${latestAcsYear}/acs/acs5/profile?get=${joinedCensusCodes}&for=place:${cityFips}&in=state:${stateFips}`;

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

states = [
  {
    "code": "AK",
    "Neighborcodes": [ ]
  },
  {
    "code": "AL",
    "Neighborcodes": [ "FL", "GA", "MS", "TN" ]
  },
  {
    "code": "AR",
    "Neighborcodes": [ "LA", "MO", "MS", "OK", "TN", "TX" ]
  },
  {
    "code": "AZ",
    "Neighborcodes": [ "CA", "CO", "NM", "NV", "UT" ]
  },
  {
    "code": "CA",
    "Neighborcodes": [ "AZ", "NV", "OR" ]
  },
  {
    "code": "CO",
    "Neighborcodes": [ "AZ", "KS", "NE", "NM", "OK", "UT", "WY" ]
  },
  {
    "code": "CT",
    "Neighborcodes": [ "MA", "NY", "RI" ]
  },
  {
    "code": "DC",
    "Neighborcodes": [ "MD", "VA" ]
  },
  {
    "code": "DE",
    "Neighborcodes": [ "MD", "NJ", "PA" ]
  },
  {
    "code": "FL",
    "Neighborcodes": [ "AL", "GA" ]
  },
  {
    "code": "GA",
    "Neighborcodes": [ "AL", "FL", "NC", "SC", "TN" ]
  },
  {
    "code": "HI",
    "Neighborcodes": [ ]
  },
  {
    "code": "IA",
    "Neighborcodes": [ "IL", "MN", "MO", "NE", "SD", "WI" ]
  },
  {
    "code": "ID",
    "Neighborcodes": [ "MT", "NV", "OR", "UT", "WA", "WY" ]
  },
  {
    "code": "IL",
    "Neighborcodes": [ "IA", "IN", "KY", "MO", "WI" ]
  },
  {
    "code": "IN",
    "Neighborcodes": [ "IL", "KY", "MO", "OH", "WI" ]
  },
  {
    "code": "KS",
    "Neighborcodes": [ "CO", "MO", "NE", "OK" ]
  },
  {
    "code": "KY",
    "Neighborcodes": [ "IL", "IN", "MO", "OH", "TN", "VA", "WV" ]
  },
  {
    "code": "LA",
    "Neighborcodes": [ "AR", "MS", "TX" ]
  },
  {
    "code": "MA",
    "Neighborcodes": [ "CT", "NH", "NY", "RI", "VT" ]
  },
  {
    "code": "MD",
    "Neighborcodes": [ "DC", "DE", "PA", "VA", "WV" ]
  },
  {
    "code": "ME",
    "Neighborcodes": [ "NH" ]
  },
  {
    "code": "MI",
    "Neighborcodes": [ "IN", "OH", "WI" ]
  },
  {
    "code": "MN",
    "Neighborcodes": [ "IA", "ND", "SD", "WI" ]
  },
  {
    "code": "MO",
    "Neighborcodes": [ "AR", "IA", "IL", "KS", "KY", "NE", "OK", "TN" ]
  },
  {
    "code": "MS",
    "Neighborcodes": [ "AL", "AR", "LA", "TN" ]
  },
  {
    "code": "MT",
    "Neighborcodes": [ "ID", "ND", "SD", "WY" ]
  },
  {
    "code": "NC",
    "Neighborcodes": [ "GA", "SC", "TN", "VA" ]
  },
  {
    "code": "ND",
    "Neighborcodes": [ "MN", "MT", "SD" ]
  },
  {
    "code": "NE",
    "Neighborcodes": [ "CO", "IA", "KS", "MO", "SD", "WY" ]
  },
  {
    "code": "NH",
    "Neighborcodes": [ "MA", "ME", "VT" ]
  },
  {
    "code": "NJ",
    "Neighborcodes": [ "DE", "NY", "PA" ]
  },
  {
    "code": "NM",
    "Neighborcodes": [ "AZ", "CO", "OK", "TX", "UT" ]
  },
  {
    "code": "NV",
    "Neighborcodes": [ "AZ", "CA", "ID", "OR", "UT" ]
  },
  {
    "code": "NY",
    "Neighborcodes": [ "CT", "MA", "NJ", "PA", "VT" ]
  },
  {
    "code": "OH",
    "Neighborcodes": [ "IN", "KY", "MI", "PA", "WV" ]
  },
  {
    "code": "OK",
    "Neighborcodes": [ "AR", "CO", "KS", "MO", "NM", "TX" ]
  },
  {
    "code": "OR",
    "Neighborcodes": [ "CA", "ID", "NV", "WA" ]
  },
  {
    "code": "PA",
    "Neighborcodes": [ "DE", "MD", "NJ", "NY", "OH", "WV" ]
  },
  {
    "code": "RI",
    "Neighborcodes": [ "CT", "MA" ]
  },
  {
    "code": "SC",
    "Neighborcodes": [ "GA", "NC" ]
  },
  {
    "code": "SD",
    "Neighborcodes": [ "IA", "MN", "MT", "ND", "NE", "WY" ]
  },
  {
    "code": "TN",
    "Neighborcodes": [ "AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA" ]
  },
  {
    "code": "TX",
    "Neighborcodes": [ "AR", "LA", "NM", "OK" ]
  },
  {
    "code": "UT",
    "Neighborcodes": [ "AZ", "CO", "ID", "NM", "NV", "WY" ]
  },
  {
    "code": "VA",
    "Neighborcodes": [ "DC", "KY", "MD", "NC", "TN", "WV" ]
  },
  {
    "code": "VT",
    "Neighborcodes": [ "MA", "NH", "NY" ]
  },
  {
    "code": "WA",
    "Neighborcodes": [ "ID", "OR" ]
  },
  {
    "code": "WI",
    "Neighborcodes": [ "IA", "IL", "MI", "MN" ]
  },
  {
    "code": "WV",
    "Neighborcodes": [ "KY", "MD", "OH", "PA", "VA" ]
  },
  {
    "code": "WY",
    "Neighborcodes": [ "CO", "ID", "MT", "NE", "SD", "UT" ]
  }
];
