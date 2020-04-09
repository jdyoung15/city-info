// TODO
// - stats don't appear when navigating to google maps from elsewhere
// - add weather stats
// - side by side comparison?
// - elevation, crime, price per sq ft

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

  const mapQuestApiKey = config.MAP_QUEST_API_KEY;
  console.log('map quest api key' + mapQuestApiKey);

}, 1000);


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
