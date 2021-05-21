const LatLngUtils = (function() {
  const MILES_IN_ONE_DEGREE_LAT_AT_EQUATOR = 69.172;

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
  
    latLngBounds.center = center;
  
    return latLngBounds;
  };
  
  /** 
   * Coverts the given number of miles to the equivalent number of degrees 
   * in latitude. Not extremely accurate but sufficient for general use. 
   * Works for any location, irrespective of longitude.
   */
  function milesToLatDegrees(miles) {
    const MILES_IN_ONE_DEGREE_LAT_AT_EQUATOR = 69.0;
    return miles / MILES_IN_ONE_DEGREE_LAT_AT_EQUATOR;
  };
  
  /** 
   * Coverts the given number of miles to the equivalent number of degrees 
   * in longitude for a location at the given latitude. 
   */
  function milesToLngDegrees(miles, lat) {
    return miles / calculateMilesPerDegreeLng(lat);
  };
  
  return {
    fetchLatLngOfCity: fetchLatLngOfCity,
    distanceBetweenLatLngs: distanceBetweenLatLngs, 
    calculateMilesPerDegreeLng: calculateMilesPerDegreeLng,
    degreesToRadians: degreesToRadians,
    calculateLatLngBounds: calculateLatLngBounds,
    milesToLatDegrees: milesToLatDegrees,
    milesToLngDegrees: milesToLngDegrees,
  };
})();
