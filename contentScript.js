// TODO
// - add weather stats
// - side by side comparison?

let currentPlace = extractPlace(location.href);


setInterval(async function() {
	let newPlace = extractPlace(location.href);
  if (newPlace === currentPlace) {
		return;
	}

  currentPlace = newPlace;

	if (currentPlace === null) {
		return;
	}

	console.log(currentPlace);

	let [city, stateAcronym] = newPlace.split(',').map(x => x.trim());
	let stateFull = states[stateAcronym];
	let cityAndState = city + ', ' + stateFull;

	// Get the QID of the city. We need this to find the FIPS code.
  let qid = await fetchQid(cityAndState);
  // For some larger cities, we need to specify just the city (e.g. w/o the state).
  if (!qid) {
    qid = await fetchQid(city);
  }

	// Get the FIPS code for the city. We need this for the demographics API call.
  let fips = await fetchFips(qid);
	let [stateFips, cityFips] = fips.split('-');

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

}, 1000);


/** 
 *	Returns a string containing the city and state acroynm, extracted from the given 
 *  url. E.g. 'Hayward, CA' 
 */
function extractPlace(url) {
	var regex = /https:\/\/www\.google\.com\/maps\/place\/([A-Za-z0-9+,]+)\/.*/;

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

/** Returns the endpoint to fetch the QID for a city. */
const qidEndpoint = (cityId) => `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${cityId}&format=json&origin=*`;

/** Returns the QID (e.g. 'Q62') of the given city. If unable, returns null. */
async function fetchQid(cityId) {
	let response = await fetch(qidEndpoint(cityId));
	let json = await response.json();
	let pageProps = Object.values(json.query.pages)[0].pageprops;

	if (!pageProps) {
    return null;
	}

	return pageProps.wikibase_item;
}

/** 
 * Returns the FIPS code (e.g. '06-33000', or '{state}-{city}) of the city with 
 * the given qid. 
 */
async function fetchFips(qid) {
	let endpoint = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json&origin=*`;

	let response = await fetch(endpoint);
	let json = await response.json();
	return json.entities[qid].claims.P774[0].mainsnak.datavalue.value;
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
dataDetails.set("Hispanic", { "censusCode": "DP05_0071PE", "unit": "%" });

/** Map of state acronym to full name. */
const states = {
  "AL": "Alabama",
  "AK": "Alaska",
  "AS": "American Samoa",
  "AZ": "Arizona",
  "AR": "Arkansas",
  "CA": "California",
  "CO": "Colorado",
  "CT": "Connecticut",
  "DE": "Delaware",
  "DC": "District Of Columbia",
  "FM": "Federated States Of Micronesia",
  "FL": "Florida",
  "GA": "Georgia",
  "GU": "Guam",
  "HI": "Hawaii",
  "ID": "Idaho",
  "IL": "Illinois",
  "IN": "Indiana",
  "IA": "Iowa",
  "KS": "Kansas",
  "KY": "Kentucky",
  "LA": "Louisiana",
  "ME": "Maine",
  "MH": "Marshall Islands",
  "MD": "Maryland",
  "MA": "Massachusetts",
  "MI": "Michigan",
  "MN": "Minnesota",
  "MS": "Mississippi",
  "MO": "Missouri",
  "MT": "Montana",
  "NE": "Nebraska",
  "NV": "Nevada",
  "NH": "New Hampshire",
  "NJ": "New Jersey",
  "NM": "New Mexico",
  "NY": "New York",
  "NC": "North Carolina",
  "ND": "North Dakota",
  "MP": "Northern Mariana Islands",
  "OH": "Ohio",
  "OK": "Oklahoma",
  "OR": "Oregon",
  "PW": "Palau",
  "PA": "Pennsylvania",
  "PR": "Puerto Rico",
  "RI": "Rhode Island",
  "SC": "South Carolina",
  "SD": "South Dakota",
  "TN": "Tennessee",
  "TX": "Texas",
  "UT": "Utah",
  "VT": "Vermont",
  "VI": "Virgin Islands",
  "VA": "Virginia",
  "WA": "Washington",
  "WV": "West Virginia",
  "WI": "Wisconsin",
  "WY": "Wyoming"
};
