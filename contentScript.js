// TODO
// - crime, price per sq ft
// - side by side comparison?

const SIDEBAR_HDR_CLASS_NAME = '.section-hero-header-title';

let currentPlace = extractPlace(location.href);
let initialCurrentPlace = currentPlace;

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

  //console.clear();

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
    geographicAndWeatherTableCreator.createGeographicAndWeatherTables
  ];

  const completedTables = {}; 

  let previousClassName = SIDEBAR_HDR_CLASS_NAME;
  let resolvedIndex = 0;
  let i = 0;
  const start = new Date();
  for (const createTableFunction of createTableFunctions) {
    completedTables[createTableFunction.name] = [];

    createTableFunction(cityInfo).then((tables) => {
      console.log(createTableFunction.name + ': ' + (new Date() - start));
      const dependencyIndex = createTableFunctions.indexOf(createTableFunction) - 1;
      const dependency = dependencyIndex < 0 ? null : createTableFunctions[dependencyIndex].name;
      for (const table of tables) {
        completedTables[createTableFunction.name].push('.' + table.attr('class'));;
        showTable(table, dependency, completedTables);
      }
    });

    i++;
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

  // Remove any diacritics (e.g. Nānākuli -> Nanakuli);
  city = decodeURIComponent(city).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

	return city + ', ' + state;
};

/** Checks for the existence of the city header section in the Google Maps sidebar. Does not exit until it exists. */
function showTable(table, dependency, completedTables) {
  if ((!dependency && !sidebarHdrExists) || (dependency && completedTables[dependency].length === 0)) {
    console.log('previous table not yet finished; checking again in 1 sec');
    setTimeout(() => showTable(table, dependency, completedTables), 1000);
  }
  else {
    console.log(table.attr('class') + ': previous table ' + dependency + ' finished');
    const previousClassName = dependency 
      ? completedTables[dependency][completedTables[dependency].length - 1]
      : SIDEBAR_HDR_CLASS_NAME;

    $(table).insertAfter(previousClassName);
    const tableClassName = '.' + table.attr('class');
    $('<div>').css('border-bottom', '1px solid #e8eaed').insertBefore(tableClassName);
  }
};

/** Checks for the existence of the city header section in the Google Maps sidebar. Does not exit until it exists. */
function sidebarHdrExists() {
  return $(SIDEBAR_HDR_CLASS_NAME).length > 0
};
