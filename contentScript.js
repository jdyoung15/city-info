// TODO
// - crime, price per sq ft
// - side by side comparison?

const SIDEBAR_HDR_CLASS_NAME = '.section-hero-header-title';
const SIDEBAR_HDR_CITY_CLASS_NAME = '.section-hero-header-title-title';

let currentPlace = extractPlace(location.href);
let initialCurrentPlace = currentPlace;

// Updated in elevationTableCreator
let currentElevation = null;

let start = new Date();

setInterval(async function() {
	const newPlace = extractPlace(location.href);
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

	const[city, stateAcronym] = currentPlace.split(',').map(x => x.trim());
  const latLng = await cityInfoUtils.fetchLatLngOfCity(city, stateAcronym);
  const cityInfo = {
    'name': city,
    'state': stateAcronym,
    'latLng': latLng,
  };

  const createTableFunctions = [
    housingTableCreator.createHousingTable, 
    demographicTableCreator.createDemographicTable, 
    elevationTableCreator.createElevationTable, 
    weatherTableCreator.createWeatherTable,
  ];

  // Object mapping function name to class name for tables that have completed and are now visible.
  const completedTables = {}; 

  start = new Date();
  for (const createTableFunction of createTableFunctions) {
    console.log(createTableFunction.name + ': STARTING ' + (new Date() - start));
    createTableFunction(cityInfo).then((table) => {
      console.log(createTableFunction.name + ': RESOLVED ' + (new Date() - start));
      // Previous table must appear before current table
      const dependencyIndex = createTableFunctions.indexOf(createTableFunction) - 1;
      const dependency = dependencyIndex < 0 ? null : createTableFunctions[dependencyIndex].name;
      showTable(createTableFunction.name, table, dependency, completedTables);
    });
  }
}, 1000);

/** 
 *	Returns a string representing a "place", i.e. containing the city and 
 *  state acroynm, extracted from the given url. E.g. 'Hayward, CA' 
 */
function extractPlace(url) {
	const regex = /https:\/\/www\.google\.com\/maps\/place\/(.+?)\/.*/;

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

  city = sanitize(city);

	return city + ', ' + state;
};

/** Returns the given string with any potentially problematic characters removed. */
function sanitize(string) {
  return decodeURIComponent(string).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Shows the given table in the Google Maps sidebar. Waits for any dependency to complete first. Updates completedTables. */
function showTable(functionName, table, dependency, completedTables) {
  if ((!dependency && !sidebarHdrCityMatches()) || (dependency && !completedTables[dependency])) {
    console.log(functionName + ': RETRYING DISPLAY ' + (new Date() - start));
    setTimeout(() => showTable(functionName, table, dependency, completedTables), 1000);
  }
  else {
    const previousClassName = dependency ? completedTables[dependency] : SIDEBAR_HDR_CLASS_NAME;
    $(table).insertAfter(previousClassName);
    completedTables[functionName] = '.' + table.attr('class');;
    console.log(functionName + ': FINISHED ' + (new Date() - start));
    const tableClassName = '.' + table.attr('class');
    $('<div>').css('border-bottom', '1px solid #e8eaed').insertBefore(tableClassName);
  }
};

/** Checks that the city name in the header section of the Google Maps sidebar matches the currently processed city. */
function sidebarHdrCityMatches() {
  const sidebarHdrs = $(SIDEBAR_HDR_CITY_CLASS_NAME);
  if (sidebarHdrs.length === 0) {
    console.log('SIDEBAR HDR: nonexistent');
    return false;
  }
  
  const sidebarHdr = sidebarHdrs[0];
  const sidebarHdrCity = sanitize(sidebarHdr.textContent.trim());
  const currentCity = currentPlace.split(',')[0].trim();
  console.log('SIDEBAR HDR: ' + sidebarHdrCity + ' vs ' + currentCity);
  return sidebarHdrCity === currentCity;
};
