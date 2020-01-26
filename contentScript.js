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

	//
	// Get the QID of the city. We need this to find the FIPS code.
	//

	let [city, stateAcronym] = newPlace.split(',').map(x => x.trim());
	

	let stateFull = states[stateAcronym];
	let cityAndState = city + ', ' + stateFull;

	let qidEndpoint = 'https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=' + cityAndState +  '&format=json&origin=*';
	let qidResponse = await fetch(qidEndpoint);
	let qidJson = await qidResponse.json();
	let qid = Object.values(qidJson.query.pages)[0].pageprops.wikibase_item;

	if (!qid) {
		console.log('null qid');
		return;
	}

	// 
	// Get the FIPS code for the city. We need this for the US Census Bureau API call.
	//

	let fipsEndpoint = 'https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + qid + '&props=claims&format=json&origin=*';

	let fipsResponse = await fetch(fipsEndpoint);
	let fipsJson = await fipsResponse.json();
	let fips = fipsJson.entities[qid].claims.P774[0].mainsnak.datavalue.value;

	if (!fips) {
		console.log('null fips');
		return;
	}

	//
	// Get the city-specific data, including population, median property value,
	// demographics, etc.
	//

	let [fipsState, fipsCity] = fips.split('-');

	const codes = [...dataDetails.values()].map(details => details["censusCode"]);
	const joined = codes.join(',');
	const dataEndpoint = 'https://api.census.gov/data/2018/acs/acs5/profile?get=' + joined + '&for=place:' + fipsCity + '&in=state:' + fipsState;

	let dataResponse = await fetch(dataEndpoint);
	let dataJson = await dataResponse.json();

	const labels = [...dataDetails.keys()];
	const data = dataJson[1];
	labels.forEach((label, i) => console.log(label + ': ' + data[i]));

  let table = $('<table>').css('margin', '10px').addClass('city-table');
	labels.forEach((label, i) => {
    let row = $('<tr>');
    let labelTd = $('<td>').text(label);
    let stat = formatWithCommas(data[i]);
    let unit = dataDetails.get(label)["unit"];
    let dataTd = $('<td>').text(stat + unit);
    row.append(labelTd);
    row.append(dataTd);
    table.append(row);
  });

  $(table).insertAfter('.section-hero-header-title');
  $('<div>').addClass('section-divider section-divider-bottom-line').insertBefore('.city-table');

}, 1000);

/* 
	Returns a string containing the city and state acroynm, extracted from the given url.
  E.g. 'Hayward, CA' 
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

	// Sometimes the place name is in the form 'Milpitas, CA 95035'. Discard zip code. 
	let [city, state] = place.split(',').map(x => x.trim());
	if (state.split(' ').length === 2) {
		state = state.split(' ')[0];
	}

	return city + ', ' + state;
}

/* 
  Returns the string form of the given number, properly formatted with commas.
  E.g. 9999 -> '9,999'
*/
function formatWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
