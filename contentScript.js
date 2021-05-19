// TODO
// - ordering in which tables appear
// - support US metro
// - refactor states data to separate file
// - refactor demographics and weather fetching to separate components/files
// - replace let with const
// - crime, price per sq ft
// - add walkscore for specific addresses
// - side by side comparison?

// We use Map instead of object in order to enforce insertion order
const DEMOGRAPHIC_METADATA = new Map();
DEMOGRAPHIC_METADATA.set("Population", { "censusCode": "DP05_0001E", "unit": "" }),
DEMOGRAPHIC_METADATA.set("Median property value", { "censusCode": "DP04_0089E", "unit": "" });
DEMOGRAPHIC_METADATA.set("Median household income", { "censusCode": "DP03_0062E", "unit": "" });
DEMOGRAPHIC_METADATA.set("Unemployment rate", { "censusCode": "DP03_0005PE", "unit": "%" });
DEMOGRAPHIC_METADATA.set("Bachelor's degree or higher", { "censusCode": "DP02_0068PE", "unit": "%" });
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

const METRO_TABLE_METADATA = [
  { 'label': 'Sale Price (SFR)', 'indicator': 'SSSM' },
  { 'label': 'Rent (all homes)', 'indicator': 'RSNA' },
  { 'label': 'List Price (SFR)', 'indicator': 'LSSM' },
];

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

  console.clear();

  //console.log('current place ' + currentPlace);

	let [city, stateAcronym] = currentPlace.split(',').map(x => x.trim());
  const latLng = await fetchLatLngOfCity(city, stateAcronym);
  const cityInfo = {
    'name': city,
    'state': stateAcronym,
    'latLng': latLng,
    'cityAndState': currentPlace,
  };

  displayHousingData(cityInfo);
  displayDemographicData(cityInfo);
  displayWeatherData(cityInfo);
}, 1000);

function sleep(milliseconds) {
  let currentTime = new Date().getTime();
  while (currentTime + milliseconds >= new Date().getTime()) { }
}

/** Displays housing data in the sidebar of Google Maps. */
async function displayHousingData(cityInfo) {
  const cityRegionInfo = await findCityRegionInfo(cityInfo);

  if (!cityRegionInfo) {
    return;
  }

  const tableData = [];
  tableData.push({
    'label': 'ZHVI (SFR)', 
    'value': await fetchQuandlData('ZSFH', cityRegionInfo.regionId),
  });

  const metroRegionInfo = await findMetroRegionInfo(cityInfo, cityRegionInfo.metro);
  if (metroRegionInfo) {
    const metroRegionId = metroRegionInfo.regionId;

    for (let metadatum of METRO_TABLE_METADATA) {
      const value = await fetchQuandlData(metadatum.indicator, metroRegionId);
      if (!value) {
        console.log('Metro does not support specified data');
        break;
      }

      tableData.push({
        'label': metadatum.label, 
        'value': value,
      });
    }

    tableData.push({
      'label': 'City metro: ' + cityRegionInfo.metro,
      'value': '',
    });

    tableData.push({
      'label': 'Metro: ' + metroRegionInfo.name + ', ' + metroRegionInfo.state,
      'value': '',
    });
  }

  // Create a table displaying the housing data. It will appear in the existing 
  // Google Maps sidebar.
  let table = $('<table>').css('margin', '10px').addClass('housing-table');

  for (let datum of tableData) {
    let row = $('<tr>');
    let labelTd = $('<td>').text(datum.label).css('width', LABEL_DEFAULT_WIDTH);
    let stat = typeof(datum.value) === 'number' ? formatWithCommas(datum.value) : datum.value;
    let unit = stat ? '$' : '';
    let dataTd = $('<td>').text(unit + stat);
    row.append(labelTd);
    row.append(dataTd);
    table.append(row);
  }

  let tableInsertionLogic = () => {
    $(table).insertBefore('.between-tables');
    //console.log('inserting housing table');
    $('<div>').addClass(DIVIDER_CLASS_NAME).insertBefore('.' + table.attr('class'));
  };

  let start = new Date();
  checkTable(table, start, tableInsertionLogic, cityInfo.cityAndState);
}

/** Returns the most recent Quandl data for the given housing indicator and region id. */
async function fetchQuandlData(indicator, regionId) {
  const apiKey = config.QUANDL_API_KEY;
	let endpoint = `https://www.quandl.com/api/v3/datatables/ZILLOW/DATA?indicator_id=${indicator}&region_id=${regionId}&api_key=${apiKey}`;

  const json = await makeBackgroundRequest(endpoint);

  const data = json.datatable.data;
  if (data.length === 0) {
    return null;
  }

  return data[0][3];
}

/** Issues a background request to the given endpoint and returns the response as json. Useful for bypassing 'blocked by CORS policy' issue. */
async function makeBackgroundRequest(endpoint) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage( // goes to background.js
      endpoint,
      response => resolve(JSON.parse(response))
    );
  });
}

/** Returns the Zillow region id for the given metro that encompasses the given city. */
async function findMetroRegionInfo(cityInfo, metro) {
  console.log('City metro: ' + metro);
  
  // E.g. ['San Francisco', 'Oakland', 'Hayward']
  const metroParts = metro.split(/[-\/]+/);

  const metroPartsCopy = [...metroParts];
  let currentSubstring = metroPartsCopy[0];
  // E.g. add 'San Francisco-Oakland' and 'San Francisco-Oakland-Hayward' to the array
  for (let i = 1; i < metroPartsCopy.length; i++) {
    currentSubstring += '-' + metroPartsCopy[i];
    metroParts.push(currentSubstring);
  }

  //console.log(metroParts);

  fileName = 'metros.csv';
  url = chrome.runtime.getURL(fileName);
  response = await fetch(url);
  text = await response.text();

  const cityState = cityInfo.state;
  const stateAndNeighbors = stateNeighbors.filter(s => s.state === cityState)[0].neighbors;
  stateAndNeighbors.push(cityState);

  const regex = new RegExp('([0-9]+),metro,"(' + metroParts.join('|') + '), (' + stateAndNeighbors.join('|') + ')');

  lines = text.split("\n");
  const metroCandidates = [];
  for (let line of lines) {
    matches = line.match(regex);
    if (matches) {
      metroCandidates.push({
        'name': matches[2], 
        'regionId': parseInt(matches[1]), 
        'state': matches[3],
        'line': line,
      });
    }
  }

  if (metroCandidates.length == 0) {
    console.log('Matching metro not found');
    return null;
  }

  for (let candidate of metroCandidates) {
    const firstCity = candidate.name.split('-')[0];
    const metroLatLng = await fetchLatLngOfCity(firstCity, candidate.state);
    candidate['distance'] = distanceBetweenLatLngs(cityInfo.latLng, metroLatLng);
    console.log('Distance: ' + candidate.distance + ' (' + candidate.line + ')');
  }

  metroCandidates.sort((a, b) => a.distance - b.distance);

  // If there are multiple possible metros, we want the metro that is nearest to the given city
  const selected = metroCandidates[0];

  // However, ensure the nearest metro is actually near the given city
  if (selected.distance > 100) {
    console.log('Selected metro is >100 miles from city, returning null: ' + selected.line);
    return null;
  }

  console.log('Selected metro: ' + selected.line);
  return selected;
}

/** Returns an object containing info for the given city like its Zillow region id and encompassing metro. */
async function findCityRegionInfo(cityInfo) {
	const city = cityInfo.name;
  const state = cityInfo.state;

  let fileName = 'cities.csv';
  let url = chrome.runtime.getURL(fileName);
  let response = await fetch(url);
  let text = await response.text();

  const regexes = [
    new RegExp('([0-9]+),city,' + city + '; ' + state+ '; ([^;]+);'),
    new RegExp('([0-9]+),city,(' + city + '); ' + state),
  ]

  for (let line of text.split("\n")) {
    for (let regex of regexes) {
      const matches = line.match(regex);
      if (matches) {
        return {
          'regionId': parseInt(matches[1], 10),
          'metro': matches[2].replace(/[.']/g, ""),
        }
      }
    }
  }

  console.log('Error: city not found');
  return null;
}

/** Displays demographic data in the sidebar of Google Maps. */
async function displayDemographicData(cityInfo) {
  const city = cityInfo.name;
  const state = cityInfo.state;

	// Get the FIPS code for the city. We need this for the demographics API call.
  let stateFips = await fetchStateFips(state);
  let cityFips = await fetchCityFips(city, stateFips, state);

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
  checkTable(table, start, tableInsertionLogic, cityInfo.cityAndState);
}

/** Displays weather data in the sidebar of Google Maps. */
async function displayWeatherData(cityInfo) {
  let datasetid = 'NORMAL_MLY';
  let datatypeids = ['MLY-TMIN-NORMAL', 'MLY-TMAX-NORMAL', 'MLY-PRCP-AVGNDS-GE010HI'];

  let stationsAndElevation = await fetchStationsAndElevationForCity(cityInfo.latLng, datatypeids);
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
  checkTable(table, start, tableInsertionLogic, cityInfo.cityAndState);
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
async function fetchStationsAndElevationForCity(latLng, datatypeids) {
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
async function fetchLatLngOfCity(city, state) {
  let apiKey = config.MAP_QUEST_API_KEY;
  let endpoint = `https://www.mapquestapi.com/geocoding/v1/address?key=${apiKey}&inFormat=kvp&outFormat=json&location=${city}, ${state}&thumbMaps=false`;

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

/** 
 * List of objects containing each state and its respective neighbors. 
 * Not strictly accurate - includes special cases like treating WV and DC
 * as neighbors, given their proximity.
 */
stateNeighbors = [
  {
    "state": "AK",
    "neighbors": [ ]
  },
  {
    "state": "AL",
    "neighbors": [ "FL", "GA", "MS", "TN" ]
  },
  {
    "state": "AR",
    "neighbors": [ "LA", "MO", "MS", "OK", "TN", "TX" ]
  },
  {
    "state": "AZ",
    "neighbors": [ "CA", "CO", "NM", "NV", "UT" ]
  },
  {
    "state": "CA",
    "neighbors": [ "AZ", "NV", "OR" ]
  },
  {
    "state": "CO",
    "neighbors": [ "AZ", "KS", "NE", "NM", "OK", "UT", "WY" ]
  },
  {
    "state": "CT",
    "neighbors": [ "MA", "NY", "RI" ]
  },
  {
    "state": "DC",
    "neighbors": [ "MD", "VA", "WV" ]
  },
  {
    "state": "DE",
    "neighbors": [ "MD", "NJ", "PA" ]
  },
  {
    "state": "FL",
    "neighbors": [ "AL", "GA" ]
  },
  {
    "state": "GA",
    "neighbors": [ "AL", "FL", "NC", "SC", "TN" ]
  },
  {
    "state": "HI",
    "neighbors": [ ]
  },
  {
    "state": "IA",
    "neighbors": [ "IL", "MN", "MO", "NE", "SD", "WI" ]
  },
  {
    "state": "ID",
    "neighbors": [ "MT", "NV", "OR", "UT", "WA", "WY" ]
  },
  {
    "state": "IL",
    "neighbors": [ "IA", "IN", "KY", "MO", "WI" ]
  },
  {
    "state": "IN",
    "neighbors": [ "IL", "KY", "MO", "OH", "WI" ]
  },
  {
    "state": "KS",
    "neighbors": [ "CO", "MO", "NE", "OK" ]
  },
  {
    "state": "KY",
    "neighbors": [ "IL", "IN", "MO", "OH", "TN", "VA", "WV" ]
  },
  {
    "state": "LA",
    "neighbors": [ "AR", "MS", "TX" ]
  },
  {
    "state": "MA",
    "neighbors": [ "CT", "NH", "NY", "RI", "VT" ]
  },
  {
    "state": "MD",
    "neighbors": [ "DC", "DE", "PA", "VA", "WV" ]
  },
  {
    "state": "ME",
    "neighbors": [ "NH" ]
  },
  {
    "state": "MI",
    "neighbors": [ "IN", "OH", "WI" ]
  },
  {
    "state": "MN",
    "neighbors": [ "IA", "ND", "SD", "WI" ]
  },
  {
    "state": "MO",
    "neighbors": [ "AR", "IA", "IL", "KS", "KY", "NE", "OK", "TN" ]
  },
  {
    "state": "MS",
    "neighbors": [ "AL", "AR", "LA", "TN" ]
  },
  {
    "state": "MT",
    "neighbors": [ "ID", "ND", "SD", "WY" ]
  },
  {
    "state": "NC",
    "neighbors": [ "GA", "SC", "TN", "VA" ]
  },
  {
    "state": "ND",
    "neighbors": [ "MN", "MT", "SD" ]
  },
  {
    "state": "NE",
    "neighbors": [ "CO", "IA", "KS", "MO", "SD", "WY" ]
  },
  {
    "state": "NH",
    "neighbors": [ "MA", "ME", "VT" ]
  },
  {
    "state": "NJ",
    "neighbors": [ "DE", "NY", "PA" ]
  },
  {
    "state": "NM",
    "neighbors": [ "AZ", "CO", "OK", "TX", "UT" ]
  },
  {
    "state": "NV",
    "neighbors": [ "AZ", "CA", "ID", "OR", "UT" ]
  },
  {
    "state": "NY",
    "neighbors": [ "CT", "MA", "NJ", "PA", "VT" ]
  },
  {
    "state": "OH",
    "neighbors": [ "IN", "KY", "MI", "PA", "WV" ]
  },
  {
    "state": "OK",
    "neighbors": [ "AR", "CO", "KS", "MO", "NM", "TX" ]
  },
  {
    "state": "OR",
    "neighbors": [ "CA", "ID", "NV", "WA" ]
  },
  {
    "state": "PA",
    "neighbors": [ "DE", "MD", "NJ", "NY", "OH", "WV" ]
  },
  {
    "state": "RI",
    "neighbors": [ "CT", "MA" ]
  },
  {
    "state": "SC",
    "neighbors": [ "GA", "NC" ]
  },
  {
    "state": "SD",
    "neighbors": [ "IA", "MN", "MT", "ND", "NE", "WY" ]
  },
  {
    "state": "TN",
    "neighbors": [ "AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA" ]
  },
  {
    "state": "TX",
    "neighbors": [ "AR", "LA", "NM", "OK" ]
  },
  {
    "state": "UT",
    "neighbors": [ "AZ", "CO", "ID", "NM", "NV", "WY" ]
  },
  {
    "state": "VA",
    "neighbors": [ "DC", "KY", "MD", "NC", "TN", "WV" ]
  },
  {
    "state": "VT",
    "neighbors": [ "MA", "NH", "NY" ]
  },
  {
    "state": "WA",
    "neighbors": [ "ID", "OR" ]
  },
  {
    "state": "WI",
    "neighbors": [ "IA", "IL", "MI", "MN" ]
  },
  {
    "state": "WV",
    "neighbors": [ "DC", "KY", "MD", "OH", "PA", "VA" ]
  },
  {
    "state": "WY",
    "neighbors": [ "CO", "ID", "MT", "NE", "SD", "UT" ]
  }
];
