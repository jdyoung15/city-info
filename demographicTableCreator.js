const demographicTableCreator = (function() {
  /** 
   * Used for tie-breaking when there are multiple jurisdictions with the same name.
   * In decreasing order of preference. 
   */
  const PLACE_TYPES = ['city', 'town', 'municipality', 'village', 'CDP'];
  
  // We use Map instead of object in order to enforce insertion order
  const DEMOGRAPHIC_METADATA = new Map();
  DEMOGRAPHIC_METADATA.set("Population", { "censusCode": "DP05_0001E", "unit": "" }),
  DEMOGRAPHIC_METADATA.set("Median property value", { "censusCode": "DP04_0089E", "unit": "" });
  DEMOGRAPHIC_METADATA.set("Median household income", { "censusCode": "DP03_0062E", "unit": "" });
  DEMOGRAPHIC_METADATA.set("Unemployment rate", { "censusCode": "DP03_0005PE", "unit": "%" });
  DEMOGRAPHIC_METADATA.set("Bachelor's degree or higher", { "censusCode": "DP02_0068PE", "unit": "%" });
  DEMOGRAPHIC_METADATA.set("Below 18", { "censusCode": "DP05_0019PE", "unit": "%" });
  DEMOGRAPHIC_METADATA.set("Over 65", { "censusCode": "DP05_0024PE", "unit": "%" });
  DEMOGRAPHIC_METADATA.set("White (not Hispanic)", { "censusCode": "DP05_0077PE", "unit": "%" });
  DEMOGRAPHIC_METADATA.set("Black", { "censusCode": "DP05_0038PE", "unit": "%" });
  DEMOGRAPHIC_METADATA.set("Asian", { "censusCode": "DP05_0044PE", "unit": "%" });
  DEMOGRAPHIC_METADATA.set("Native", { "censusCode": "DP05_0039PE", "unit": "%" });
  DEMOGRAPHIC_METADATA.set("Hispanic", { "censusCode": "DP05_0071PE", "unit": "%" });
  
  
  /** 
   * The number of years behind the current year that the most recent American Community 
   * Survey 5-Year Data is supported. 
   */
  const ACS_LAG_YEARS = 2;
  
  /** Displays demographic data in the sidebar of Google Maps. */
  async function createDemographicTable(cityInfo) {
    const city = cityInfo.name;
    const state = cityInfo.state;
  
  	// Get the FIPS code for the city. We need this for the demographics API call.
    const stateFips = await fetchStateFips(state);
    const cityFips = await fetchCityFips(city, stateFips, state);
  
  	// Get the city-specific demographic data, including population, 
    // median property value, etc.
  	const censusCodes = [...DEMOGRAPHIC_METADATA.values()].map(details => details["censusCode"]);
  	const joinedCodes = censusCodes.join(',');
  
    const demographicData = await fetchDemographicData(cityFips, stateFips, joinedCodes);
  	const labels = [...DEMOGRAPHIC_METADATA.keys()];
  
    // Create a table displaying the demographic data. It will appear in the existing 
    // Google Maps sidebar.
    const table = $('<table>').css('margin', '10px').addClass('demographics-table');
  	labels.forEach((label, i) => {
      const row = $('<tr>');
      const labelTd = $('<td>').text(label).css('width', cityInfoConstants.LABEL_DEFAULT_WIDTH);
      const stat = cityInfoUtils.formatWithCommas(demographicData[i]);
      const unit = DEMOGRAPHIC_METADATA.get(label)["unit"];
      const dataTd = $('<td>').text(stat + unit);
      row.append(labelTd);
      row.append(dataTd);
      table.append(row);
    });
  
    return table;
  };
  
  /** Returns the FIPS code of the given state. */
  async function fetchStateFips(stateAcronym) {
    const url = chrome.runtime.getURL('states/state.txt');
    const response = await fetch(url);
    const text = await response.text();
  
    const regex = new RegExp('(.+?)\\|' + stateAcronym + '\\|.*');
  
    const lines = text.split("\n");
    for (let line of lines) {
      const matches = line.match(regex);
      if (!matches || matches.length !== 2) {
        continue;
      }
      return matches[1];
    }
    console.log('Error: State FIPS not found');
    return null;
  };
  
  /** Returns the FIPS for the given city in the state with the given info. */
  async function fetchCityFips(city, stateFips, stateAcronym) {
    // Remove periods from city name (e.g. "St. Paul") for easier comparison
    const removePeriodsRegex = /[\.]/g;
    city = city.replace(removePeriodsRegex, '');
  
    const fileName = 'states/st' + stateFips + '_' + stateAcronym.toLowerCase() + '_places.txt';
    const url = chrome.runtime.getURL(fileName);
    const response = await fetch(url);
    const text = await response.text();
  
    const regex = new RegExp(stateAcronym + '\\|' + stateFips + '\\|([0-9]+?)\\|' + city + '.*');
  
    const lines = text.split("\n");
    const matchingLines = [];
    for (let line of lines) {
      line = line.replace(removePeriodsRegex, '');
      const matches = line.match(regex);
      if (!matches || matches.length !== 2) {
        continue;
      }
      matchingLines.push(line);
    }
  
    // If there are multiple matches, find the most preferential as ordered in PLACE_TYPES
    for (let place of PLACE_TYPES) {
      for (let line of matchingLines) {
        if (line.includes(`${city} ${place}`)) {
          return line.match(regex)[1];
        }
      }
    }
  
    // If none of the matches were in PLACE_TYPES, just return the first match
    if (matchingLines.length > 0) {
      const line = matchingLines[0];
      return line.match(regex)[1];
    }
  
    console.log('Error: City FIPS not found');
    return null;
  };
  
  
  /** Returns an array of strings representing various demographic stats. */
  async function fetchDemographicData(cityFips, stateFips, joinedCensusCodes) {
    const latestYear = new Date().getFullYear();
    const latestAcsYear = latestYear - ACS_LAG_YEARS;
  	const endpoint = `https://api.census.gov/data/${latestAcsYear}/acs/acs5/profile?get=${joinedCensusCodes}&for=place:${cityFips}&in=state:${stateFips}`;
  
  	const response = await fetch(endpoint);
  	const json = await response.json();
  
    // Skip first element in json, which consists of unneeded headers.
    return json[1];
  };

  return {
    createDemographicTable: createDemographicTable,
  };
})();
