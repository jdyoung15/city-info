// TODO
// - use elevation from weather station if needed
// - St vs Saint
// - crime, price per sq ft
// - side by side comparison?

/** The text that an element's next next sibling should contain if that element is the sidebar header. */ 
const SIDEBAR_HDR_NEXT_NEXT_SIBLING_TEXT = 'Directions';

// These values will be computed and set later
let sidebarHdrClassName = null;
let sidebarHdrCityClassName = null;

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

	const [city, state] = extractCityAndState(currentPlace);
  const latLng = await LatLngUtils.fetchLatLngOfCity(city, state);
  const cityInfo = {
    'name': city,
    'state': state,
    'latLng': latLng,
  };

  const createTableFunctions = [
    HousingTableCreator.createHousingTable, 
    DemographicTableCreator.createDemographicTable, 
    ElevationTableCreator.createElevationTable, 
    WeatherTableCreator.createWeatherTable,
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
      showTable(createTableFunction.name, table, dependency, completedTables, city);
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

/** Returns an array of [city, state] from the given place. */
function extractCityAndState(place) {
	return place.split(',').map(x => x.trim());
};

/** Returns the given string with any potentially problematic characters removed. */
function sanitize(string) {
  return decodeURIComponent(string).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/** Shows the given table in the Google Maps sidebar. Waits for any dependency to complete first. Updates completedTables. */
function showTable(functionName, table, dependency, completedTables, city) {
  // Class names not yet computed
  if (!sidebarHdrClassName) {
    const matches = findExactMatchElements(city);
    if (matches.length === 0) {
      console.log(functionName + ': CURRENT CITY NOT IN SIDEBAR');
    }
    else {
      console.log(functionName + ': COMPUTING CLASSNAMES');
      const match = matches[0];
      let parentElement = match.parentElement;
      sidebarHdrCityClassName = generateClassName(parentElement);
      let nextNextSibling = parentElement.nextSibling.nextSibling;
      while (!nextNextSibling || !nextNextSibling.innerText.includes(SIDEBAR_HDR_NEXT_NEXT_SIBLING_TEXT)) {
        parentElement = parentElement.parentElement;
        nextNextSibling = parentElement.nextSibling.nextSibling;
      }
      sidebarHdrClassName = generateClassName(parentElement);
    }
    setTimeout(() => showTable(functionName, table, dependency, completedTables, city), 100);
  }
  // Table is not ready to show
  else if ((!dependency && !sidebarHdrCityMatches(city)) || (dependency && !completedTables[dependency])) {
    const elapsed = new Date() - start;
    if (elapsed > 10000) {
      console.log(functionName + ': TIMED OUT');
      return;
    }

    const currentCity = extractCityAndState(currentPlace)[0];
    if (city !== currentCity) {
      console.log(functionName + ': MISMATCHED CITIES ' + city + ' vs ' + currentCity);
      return;
    }
    console.log(functionName + ': RETRYING DISPLAY ' + elapsed);
    setTimeout(() => showTable(functionName, table, dependency, completedTables, city), 100);
  }
  // Table is ready to show
  else {
    const previousClassName = dependency ? completedTables[dependency] : sidebarHdrClassName;
    $(table).insertAfter(previousClassName);
    completedTables[functionName] = '.' + table.attr('class');;
    console.log(functionName + ': FINISHED ' + (new Date() - start));
    const tableClassName = '.' + table.attr('class');
    $('<div>').css('border-bottom', '1px solid #e8eaed').insertBefore(tableClassName);
  }
};

/** Returns a list of elements whose innerText exactly matches the given string. */
function findExactMatchElements(string) {
  return [...document.querySelectorAll('*')].filter(e => e.textContent === string);
};

/** Given an element, returns a classname string that can be used to query that element. */
function generateClassName(element) {
  return element.className.split(' ').map(s => '.' + s).join('')
};

/** Checks that the city name in the header section of the Google Maps sidebar matches the given city. */
function sidebarHdrCityMatches(city) {
  const sidebarHdrs = $(sidebarHdrCityClassName);
  if (sidebarHdrs.length === 0) {
    console.log('SIDEBAR HDR: nonexistent');
    return false;
  }
  
  const sidebarHdr = sidebarHdrs[0];
  const sidebarHdrCity = sanitize(sidebarHdr.textContent.trim());
  console.log('SIDEBAR HDR: ' + sidebarHdrCity + ' vs ' + city);
  return sidebarHdrCity === city;
};
