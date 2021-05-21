const HousingTableCreator = (function() {
  const METRO_TABLE_METADATA = [
    { 'label': 'Sale Price (SFR)', 'indicator': 'SSSM' },
    { 'label': 'Rent (all homes)', 'indicator': 'RSNA' },
    { 'label': 'List Price (SFR)', 'indicator': 'LSSM' },
  ];
  
  /** Returns a table containing housing data. */
  async function createHousingTable(cityInfo) {
    const cityRegionInfo = await findCityRegionInfo(cityInfo);
    
    if (!cityRegionInfo) {
      return;
    }
    
    const tableData = [];
    tableData.push({
      'label': 'Home Value (SFR)', 
      'value': await fetchQuandlData('ZSFH', cityRegionInfo.regionId),
    });
    
    const metroRegionInfo = await findMetroRegionInfo(cityInfo, cityRegionInfo.metro);
    if (metroRegionInfo) {
      const metroRegionId = metroRegionInfo.regionId;
    
      for (let metadatum of METRO_TABLE_METADATA) {
        const value = await fetchQuandlData(metadatum.indicator, metroRegionId);
        if (!value) {
          //console.log('Metro does not support specified data');
          break;
        }
    
        tableData.push({
          'label': metadatum.label, 
          'value': value,
        });
      }
    
      tableData.push({
        'label': 'City metro: ' + cityRegionInfo.metro,
        'value': '',
      });
    
      tableData.push({
        'label': 'Metro: ' + metroRegionInfo.name + ', ' + metroRegionInfo.state,
        'value': '',
      });
    }
    
    // Create a table displaying the housing data. It will appear in the existing 
    // Google Maps sidebar.
    const table = $('<table>').css('margin', '10px').addClass('housing-table');
    
    for (let datum of tableData) {
      const row = $('<tr>');
      const labelTd = $('<td>').text(datum.label).css('width', DisplayUtils.LABEL_DEFAULT_WIDTH);
      const stat = typeof(datum.value) === 'number' ? DisplayUtils.formatWithCommas(datum.value) : datum.value;
      const unit = stat ? '$' : '';
      const dataTd = $('<td>').text(unit + stat);
      row.append(labelTd);
      row.append(dataTd);
      table.append(row);
    }
    
    return table;
  };
  
  /** Returns an object containing info for the given city like its Zillow region id and encompassing metro. */
  async function findCityRegionInfo(cityInfo) {
  	const city = cityInfo.name;
    const state = cityInfo.state;
  
    const fileName = 'cities.csv';
    const url = chrome.runtime.getURL(fileName);
    const response = await fetch(url);
    const text = await response.text();
  
    const regexes = [
      new RegExp('([0-9]+),city,' + city + '; ' + state+ '; ([^;]+);'),
      new RegExp('([0-9]+),city,(' + city + '); ' + state),
    ]
  
    for (let line of text.split("\n")) {
      for (let regex of regexes) {
        const matches = line.match(regex);
        if (matches) {
          return {
            'regionId': parseInt(matches[1], 10),
            'metro': matches[2].replace(/[.']/g, ""),
          }
        }
      }
    }
  
    console.log('Error: city not found');
    return null;
  };
  
  /** Returns the most recent Quandl data for the given housing indicator and region id. */
  async function fetchQuandlData(indicator, regionId) {
    const apiKey = config.QUANDL_API_KEY;
  	const endpoint = `https://www.quandl.com/api/v3/datatables/ZILLOW/DATA?indicator_id=${indicator}&region_id=${regionId}&api_key=${apiKey}`;
  
    const json = await makeBackgroundRequest(endpoint);
  
    const data = json.datatable.data;
    if (data.length === 0) {
      return null;
    }
  
    return data[0][3];
  };
  
  /** Issues a background request to the given endpoint and returns the response as json. Useful for bypassing 'blocked by CORS policy' issue. */
  async function makeBackgroundRequest(endpoint) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage( // goes to background.js
        endpoint,
        response => resolve(JSON.parse(response))
      );
    });
  };
  
  /** Returns the Zillow region id for the given metro that encompasses the given city. */
  async function findMetroRegionInfo(cityInfo, metro) {
    //console.log('City metro: ' + metro);
    
    // E.g. ['San Francisco', 'Oakland', 'Hayward']
    const metroParts = metro.split(/[-\/]+/);
  
    const metroPartsCopy = [...metroParts];
    let currentSubstring = metroPartsCopy[0];
    // E.g. add 'San Francisco-Oakland' and 'San Francisco-Oakland-Hayward' to the array
    for (let i = 1; i < metroPartsCopy.length; i++) {
      currentSubstring += '-' + metroPartsCopy[i];
      metroParts.push(currentSubstring);
    }
  
    //console.log(metroParts);
  
    fileName = 'metros.csv';
    url = chrome.runtime.getURL(fileName);
    response = await fetch(url);
    text = await response.text();
  
    const cityState = cityInfo.state;
    const stateAndNeighbors = STATE_NEIGHBORS.filter(s => s.state === cityState)[0].neighbors;
    stateAndNeighbors.push(cityState);
  
    const regex = new RegExp('([0-9]+),metro,"(' + metroParts.join('|') + '), (' + stateAndNeighbors.join('|') + ')');
  
    lines = text.split("\n");
    const metroCandidates = [];
    for (let line of lines) {
      matches = line.match(regex);
      if (matches) {
        metroCandidates.push({
          'name': matches[2], 
          'regionId': parseInt(matches[1]), 
          'state': matches[3],
          'line': line,
        });
      }
    }
  
    if (metroCandidates.length == 0) {
      console.log('Matching metro not found');
      return null;
    }
  
    for (let candidate of metroCandidates) {
      const firstCity = candidate.name.split('-')[0];
      const metroLatLng = await LatLngUtils.fetchLatLngOfCity(firstCity, candidate.state);
      candidate['distance'] = LatLngUtils.distanceBetweenLatLngs(cityInfo.latLng, metroLatLng);
      //console.log('Distance: ' + candidate.distance + ' (' + candidate.line + ')');
    }
  
    metroCandidates.sort((a, b) => a.distance - b.distance);
  
    // If there are multiple possible metros, we want the metro that is nearest to the given city
    const selected = metroCandidates[0];
  
    // However, ensure the nearest metro is actually near the given city
    if (selected.distance > 100) {
      console.log('Selected metro is >100 miles from city, returning null: ' + selected.line);
      return null;
    }
  
    //console.log('Selected metro: ' + selected.line);
    return selected;
  };

  return {
    createHousingTable: createHousingTable,
  };
})();

