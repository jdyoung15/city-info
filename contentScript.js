// TODO
// - stats don't appear when navigating to google maps from elsewhere
// - add weather stats
// - side by side comparison?
// - elevation, crime, price per sq ft
// - convert const to let

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

	let [city, stateAcronym] = newPlace.split(',').map(x => x.trim());

	// Get the FIPS code for the city. We need this for the demographics API call.
  let stateFips = await fetchStateFips(stateAcronym);
  let cityFips = await fetchCityFips(city, stateFips, stateAcronym);

	// Get the city-specific demographic data, including population, 
  // median property value, etc.
	const censusCodes = [...dataDetails.values()].map(details => details["censusCode"]);
	const joinedCodes = censusCodes.join(',');

  const demographicData = await fetchDemographicData(cityFips, stateFips, joinedCodes);
	const labels = [...dataDetails.keys()];

  // Create a table displaying the data. It will appear in the existing 
  // Google Maps sidebar.
  let table = $('<table>').css('margin', '10px').addClass('city-table');
	labels.forEach((label, i) => {
    let row = $('<tr>');
    let labelTd = $('<td>').text(label);
    let stat = formatWithCommas(demographicData[i]);
    let unit = dataDetails.get(label)["unit"];
    let dataTd = $('<td>').text(stat + unit);
    row.append(labelTd);
    row.append(dataTd);
    table.append(row);
  });

  $(table).insertAfter('.section-hero-header-title');
  $('<div>').addClass('section-divider section-divider-bottom-line').insertBefore('.city-table');

  const latLng = await fetchLatLngOfCity(currentPlace);
  console.log(latLng);
  const latLngBounds = calculateLatLngBounds(latLng, milesToLatDegrees(5), milesToLngDegrees(5, latLng.lat));
  console.log(latLngBounds);

  let stations = await fetchStationsInLatLngBounds(latLngBounds);
  console.log(stations);

  console.log(stations.results.map(s => 'stationid=' + s.id).join('&'));
  console.log(stations.results.map(s => s.latitude + ',' + s.longitude));

  // search for NORMAL_MLY data for all stations
  // if any station has this data, choose the station closest to the center
  // else search for GSOM data for all stations
  // if any station has this data, choose the station closest to the center
  //
  // if no stations have either of these two data, increase size of box and repeat above steps
  console.log(await fetchWeatherData(stations));

}, 1000);

// Return an object containing weather data for each month.
async function fetchWeatherData(stations) {
  let stationsString = stations.results.map(s => 'stationid=' + s.id).join('&');
  const datatypeids = ['MLY-TMIN-NORMAL', 'MLY-TMAX-NORMAL', 'MLY-PRCP-AVGNDS-GE010HI'];
  let datatypeidsString = datatypeids.map(datatypeid => 'datatypeid=' + datatypeid).join('&');

  let url = `https://www.ncdc.noaa.gov/cdo-web/api/v2/data?datasetid=NORMAL_MLY&datatypeid=MLY-TMIN-NORMAL&datatypeid=MLY-TMAX-NORMAL&datatypeid=MLY-PRCP-AVGNDS-GE010HI&${stationsString}&units=standard&startdate=2010-01-01&enddate=2010-12-01&limit=1000`;

  let response = await fetch(url, { headers: { token: config.NOAA_API_KEY } } );
  let json = await response.json();
  let results = json.results;

  // for each month
  //   create new object
  //   for each data type
  //     add property 
  const months = new Map(Object.entries({
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
  let monthsData = new Map();
  months.forEach((monthNum, month) => {
    let monthData = new Map();
    datatypeids.forEach(datatypeid => {
      let matchingResults = results.filter(r => r.date === monthAndYearToDate(monthNum, 2010) && r.datatype === datatypeid);
      monthData[datatypeid] = matchingResults[0].value;
    })
    monthsData[month] = monthData;
  })

  return monthsData;
}

function monthAndYearToDate(month, year) {
  return `${year}-${month}-01T00:00:00`;
}

async function fetchStationsInLatLngBounds(latLngBounds) {
  let southwest = latLngBounds.southwest;
  let northeast = latLngBounds.northeast;
  let latLngBoundsStr = [southwest.lat, southwest.lng, northeast.lat, northeast.lng].join(',');

  let url = `https://www.ncdc.noaa.gov/cdo-web/api/v2/stations?extent=${latLngBoundsStr}&limit=1000`;

  let response = await fetch(url, { headers: { token: config.NOAA_API_KEY } } );
  let json = await response.json();

  return json;
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
 * given longitude.
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

  console.log(endpoint);

	//const endpoint = `https://api.census.gov/data/2018/acs/acs5/profile?get=${joinedCensusCodes}&for=place:${cityFips}&in=state:${stateFips}`;

	let response = await fetch(endpoint);
	let json = await response.json();

  // Skip first element in json, which consists of unneeded headers.
  return json.results[0].locations[0].latLng;
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

  let regex = new RegExp(stateAcronym + '\\|' + stateFips + '\\|(.+?)\\|' + city + '.*');

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

// We use Map instead of object in order to enforce insertion order
const dataDetails = new Map();
dataDetails.set("Population", { "censusCode": "DP05_0001E", "unit": "" }),
dataDetails.set("Median property value", { "censusCode": "DP04_0089E", "unit": "" });
dataDetails.set("Median household income", { "censusCode": "DP03_0062E", "unit": "" });
dataDetails.set("Unemployment rate", { "censusCode": "DP03_0005PE", "unit": "%" });
dataDetails.set("Bachelor's degree or higher", { "censusCode": "DP02_0067PE", "unit": "%" });
dataDetails.set("Below 18", { "censusCode": "DP05_0019PE", "unit": "%" });
dataDetails.set("Over 65", { "censusCode": "DP05_0024PE", "unit": "%" });
dataDetails.set("White (not Hispanic)", { "censusCode": "DP05_0077PE", "unit": "%" });
dataDetails.set("Black", { "censusCode": "DP05_0038PE", "unit": "%" });
dataDetails.set("Asian", { "censusCode": "DP05_0044PE", "unit": "%" });
dataDetails.set("Native", { "censusCode": "DP05_0039PE", "unit": "%" });
dataDetails.set("Hispanic", { "censusCode": "DP05_0071PE", "unit": "%" });
