import requests

r = requests.get('https://www.quandl.com/api/v3/datatables/ZILLOW/INDICATORS?api_key=CbzUgzV_u5niLcZ6DDGP')
json = r.json()
indicators = json['datatable']['data']

regions = {
  'US': 102001,
  'state': 9,
  'county': 207,
  'metro': 394913,
  'city': 17759,
  'neigh': 272734,
  'zip': 97771
}

for indicator in indicators:
  indicator_id = indicator[0]
  indicator_desc = indicator[1]
  valid_region_types = []
  for region_type, region_id in regions.items():
    r = requests.get('https://www.quandl.com/api/v3/datatables/ZILLOW/DATA?indicator_id=' + indicator_id + '&api_key=CbzUgzV_u5niLcZ6DDGP&region_id=' + str(region_id))
    json = r.json()
    data = json['datatable']['data']
    if (len(data) > 0):
      valid_region_types.append(region_type)

  print indicator_id + ' - ' + indicator_desc + ': ' + str(valid_region_types)
