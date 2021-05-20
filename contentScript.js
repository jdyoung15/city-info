// TODO
// - crime, price per sq ft
// - side by side comparison?


let currentPlace = cityInfoUtils.extractPlace(location.href);
let initialCurrentPlace = currentPlace;

setInterval(async function() {
	const newPlace = cityInfoUtils.extractPlace(location.href);
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

  let previousClassName = '.section-hero-header-title';
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
