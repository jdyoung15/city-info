const elevationTableCreator = (function() {
  const FEET_PER_METER =  3.281;
  
  /** Displays elevation data in the sidebar of Google Maps. */
  async function createElevationTable(cityInfo) {
    const elevation = await fetchElevationForLatLng(cityInfo.latLng);
  
    table = $('<table>').css('margin', '10px').addClass('elevation-table');
  
    const row = $('<tr>');
    const labelTd = $('<td>').text('Elevation').css('width', cityInfoConstants.LABEL_DEFAULT_WIDTH);
    const td = $('<td>').text(`${Math.round(elevation * FEET_PER_METER)} ft`);
    row.append(labelTd);
    row.append(td);
    table.append(row);
  
    return table;
  };
  
  /** 
   * Returns the elevation (in meters) of the given latLng.
   */
  async function fetchElevationForLatLng(latLng) {
    const apiKey = config.MAP_QUEST_API_KEY;
    const latLngString = latLng.lat + ',' + latLng.lng;
    const endpoint = `https://open.mapquestapi.com/elevation/v1/profile?key=${apiKey}&shapeFormat=raw&latLngCollection=${latLngString}`;
  
  	const response = await fetch(endpoint);
  	const json = await response.json();
  
    const statusCode = json.info.statuscode;
  
    if (statusCode == 601) {
      console.log('elevation fetch failed');
      return null;
    }
  
    const elevations = json.elevationProfile;
  
    // Global variable in contentScript. Will be used in weatherTableCreator.
    currentElevation = elevations[0].height;
    return currentElevation;
  };

  return {
    createElevationTable: createElevationTable,
  };
})();
