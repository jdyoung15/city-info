const cityInfoUtils = (function() {
  const MILES_IN_ONE_DEGREE_LAT_AT_EQUATOR = 69.172;

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

  /** 
   * Returns an object containing a latitude and longitude (in degrees) 
   * representing the given city. The latitude and longitude will 
   * generally be at a relevant central location within the city (e.g. downtown).
   */
  async function fetchLatLngOfCity(city, state) {
    const apiKey = config.MAP_QUEST_API_KEY;
    const endpoint = `https://www.mapquestapi.com/geocoding/v1/address?key=${apiKey}&inFormat=kvp&outFormat=json&location=${city}, ${state}&thumbMaps=false`;
  
  	const response = await fetch(endpoint);
  	const json = await response.json();
  
    // Skip first element in json, which consists of unneeded headers.
    return json.results[0].locations[0].latLng;
  };
  
  function distanceBetweenLatLngs(latLngA, latLngB) {
    const latDeltaDegrees = Math.abs(latLngA.lat - latLngB.lat);
    const lngDeltaDegrees = Math.abs(latLngA.lng - latLngB.lng);
  
    const milesPerDegreeLng = calculateMilesPerDegreeLng(latLngA.lat);
  
    const latDeltaMiles = latDeltaDegrees * MILES_IN_ONE_DEGREE_LAT_AT_EQUATOR;
    const lngDeltaMiles = lngDeltaDegrees * milesPerDegreeLng;
  
    // find hypotenuse of two sides
    return Math.hypot(latDeltaMiles, lngDeltaMiles);
  };

  /** 
   * Returns the number of miles in one degree of longitude for a location at the
   * given latitude.
   */
  function calculateMilesPerDegreeLng(lat) {
    const latRadians = degreesToRadians(lat);
    return Math.cos(latRadians) * MILES_IN_ONE_DEGREE_LAT_AT_EQUATOR;
  };

  /** Converts the given number of degrees to radians. */
  function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
  };
  
  /**
   * Returns the string form of the given number, properly formatted with commas.
   * E.g. 9999 -> '9,999'
   */
  function formatWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return {
    extractPlace: extractPlace,
    fetchLatLngOfCity: fetchLatLngOfCity,
    distanceBetweenLatLngs: distanceBetweenLatLngs, 
    calculateMilesPerDegreeLng: calculateMilesPerDegreeLng,
    degreesToRadians: degreesToRadians,
    formatWithCommas: formatWithCommas,
  };
})();
