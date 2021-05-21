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

  checkSidebarHdr();

  let previousClassName = SIDEBAR_HDR_CLASS_NAME;
  for (let createTableFunction of createTableFunctions) {
    const tables = await createTableFunction(cityInfo);
    for (let table of tables) {
      $(table).insertAfter(previousClassName);
      const tableClassName = '.' + table.attr('class');
      $('<div>').css('border-bottom', '1px solid #e8eaed').insertBefore(tableClassName);
      previousClassName = tableClassName;
    }
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
function checkSidebarHdr() {                                                                                                   
  const sidebarHdrExists = $(SIDEBAR_HDR_CLASS_NAME).length > 0
  if (!sidebarHdrExists) {
    console.log('Sidebar not yet created; checking again in 1 sec');
    setTimeout(() => checkSidebarHdr(), 1000);
  }
  else {
    console.log('Sidebar exists; done checking');
  }
};
