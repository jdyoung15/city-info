"""
30772,city,Carson City; NV
18203,city,Fresno; CA; Fresno County
6792,city,Roanoke; VA; Roanoke City
31714,city,Gaylord; MI; Otsego County
18518,city,Hayward; CA; San Francisco-Oakland-Hayward; Alameda County
28964,city,Musella; GA; Macon-Bibb County; Crawford County
55006,city,Wake Forest; NC; Raleigh; Wake County
48449,city,Westchester; FL; Miami-Fort Lauderdale-West Palm Beach; Miami-Dade County
125641,city,Palm Shores; FL; Palm Bay-Melbourne-Titusville; Brevard County
5130,city,Herald; CA; Sacramento--Roseville--Arden-Arcade; Sacramento County
29711,city,Henryville; IN; Louisville/Jefferson County; Clark County
53811,city,Parker; KS; Kansas City; Linn County
27470,city,Trimble; MO; Kansas City; Clinton County
22444,city,Mercer; PA; Youngstown-Warren-Boardman; Mercer County
12959,city,New Richmond; WI; Minneapolis-St. Paul-Bloomington; Saint Croix County
"""

import re

states = [
  {
    "code": "AK",
    "Neighborcodes": [ ]
  },
  {
    "code": "AL",
    "Neighborcodes": [ "FL", "GA", "MS", "TN" ]
  },
  {
    "code": "AR",
    "Neighborcodes": [ "LA", "MO", "MS", "OK", "TN", "TX" ]
  },
  {
    "code": "AZ",
    "Neighborcodes": [ "CA", "CO", "NM", "NV", "UT" ]
  },
  {
    "code": "CA",
    "Neighborcodes": [ "AZ", "NV", "OR" ]
  },
  {
    "code": "CO",
    "Neighborcodes": [ "AZ", "KS", "NE", "NM", "OK", "UT", "WY" ]
  },
  {
    "code": "CT",
    "Neighborcodes": [ "MA", "NY", "RI" ]
  },
  {
    "code": "DC",
    "Neighborcodes": [ "MD", "VA" ]
  },
  {
    "code": "DE",
    "Neighborcodes": [ "MD", "NJ", "PA" ]
  },
  {
    "code": "FL",
    "Neighborcodes": [ "AL", "GA" ]
  },
  {
    "code": "GA",
    "Neighborcodes": [ "AL", "FL", "NC", "SC", "TN" ]
  },
  {
    "code": "HI",
    "Neighborcodes": [ ]
  },
  {
    "code": "IA",
    "Neighborcodes": [ "IL", "MN", "MO", "NE", "SD", "WI" ]
  },
  {
    "code": "ID",
    "Neighborcodes": [ "MT", "NV", "OR", "UT", "WA", "WY" ]
  },
  {
    "code": "IL",
    "Neighborcodes": [ "IA", "IN", "KY", "MO", "WI" ]
  },
  {
    "code": "IN",
    "Neighborcodes": [ "IL", "KY", "MO", "OH", "WI" ]
  },
  {
    "code": "KS",
    "Neighborcodes": [ "CO", "MO", "NE", "OK" ]
  },
  {
    "code": "KY",
    "Neighborcodes": [ "IL", "IN", "MO", "OH", "TN", "VA", "WV" ]
  },
  {
    "code": "LA",
    "Neighborcodes": [ "AR", "MS", "TX" ]
  },
  {
    "code": "MA",
    "Neighborcodes": [ "CT", "NH", "NY", "RI", "VT" ]
  },
  {
    "code": "MD",
    "Neighborcodes": [ "DC", "DE", "PA", "VA", "WV" ]
  },
  {
    "code": "ME",
    "Neighborcodes": [ "NH" ]
  },
  {
    "code": "MI",
    "Neighborcodes": [ "IN", "OH", "WI" ]
  },
  {
    "code": "MN",
    "Neighborcodes": [ "IA", "ND", "SD", "WI" ]
  },
  {
    "code": "MO",
    "Neighborcodes": [ "AR", "IA", "IL", "KS", "KY", "NE", "OK", "TN" ]
  },
  {
    "code": "MS",
    "Neighborcodes": [ "AL", "AR", "LA", "TN" ]
  },
  {
    "code": "MT",
    "Neighborcodes": [ "ID", "ND", "SD", "WY" ]
  },
  {
    "code": "NC",
    "Neighborcodes": [ "GA", "SC", "TN", "VA" ]
  },
  {
    "code": "ND",
    "Neighborcodes": [ "MN", "MT", "SD" ]
  },
  {
    "code": "NE",
    "Neighborcodes": [ "CO", "IA", "KS", "MO", "SD", "WY" ]
  },
  {
    "code": "NH",
    "Neighborcodes": [ "MA", "ME", "VT" ]
  },
  {
    "code": "NJ",
    "Neighborcodes": [ "DE", "NY", "PA" ]
  },
  {
    "code": "NM",
    "Neighborcodes": [ "AZ", "CO", "OK", "TX", "UT" ]
  },
  {
    "code": "NV",
    "Neighborcodes": [ "AZ", "CA", "ID", "OR", "UT" ]
  },
  {
    "code": "NY",
    "Neighborcodes": [ "CT", "MA", "NJ", "PA", "VT" ]
  },
  {
    "code": "OH",
    "Neighborcodes": [ "IN", "KY", "MI", "PA", "WV" ]
  },
  {
    "code": "OK",
    "Neighborcodes": [ "AR", "CO", "KS", "MO", "NM", "TX" ]
  },
  {
    "code": "OR",
    "Neighborcodes": [ "CA", "ID", "NV", "WA" ]
  },
  {
    "code": "PA",
    "Neighborcodes": [ "DE", "MD", "NJ", "NY", "OH", "WV" ]
  },
  {
    "code": "RI",
    "Neighborcodes": [ "CT", "MA" ]
  },
  {
    "code": "SC",
    "Neighborcodes": [ "GA", "NC" ]
  },
  {
    "code": "SD",
    "Neighborcodes": [ "IA", "MN", "MT", "ND", "NE", "WY" ]
  },
  {
    "code": "TN",
    "Neighborcodes": [ "AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA" ]
  },
  {
    "code": "TX",
    "Neighborcodes": [ "AR", "LA", "NM", "OK" ]
  },
  {
    "code": "UT",
    "Neighborcodes": [ "AZ", "CO", "ID", "NM", "NV", "WY" ]
  },
  {
    "code": "VA",
    "Neighborcodes": [ "DC", "KY", "MD", "NC", "TN", "WV" ]
  },
  {
    "code": "VT",
    "Neighborcodes": [ "MA", "NH", "NY" ]
  },
  {
    "code": "WA",
    "Neighborcodes": [ "ID", "OR" ]
  },
  {
    "code": "WI",
    "Neighborcodes": [ "IA", "IL", "MI", "MN" ]
  },
  {
    "code": "WV",
    "Neighborcodes": [ "KY", "MD", "OH", "PA", "VA" ]
  },
  {
    "code": "WY",
    "Neighborcodes": [ "CO", "ID", "MT", "NE", "SD", "UT" ]
  }
]

""" Returns whether any of the given lines contains any of the given string choices AND contains the given state. """
def lines_contain(lines, choices):
  matches = []
  for line in lines:
    if line_contains(line, choices):
      matches.append(line)

  if len(matches) > 1:
    print(matches)

  print('\n')
  return len(matches) > 0 

""" Returns whether the given line contains any of the given string choices AND contains the given state. """
#def line_contains_state(line, choices, state):
#  return any([choice in line for choice in choices]) and state in line

""" Returns whether the given line contains any of the given string choices. """
def line_contains(line, choices):
  return any([choice in line for choice in choices])

def get_neighbors(state):
  return [x['Neighborcodes'] for x in states if x['code'] == state][0]


# for each line in metros.csv
#   extract metro and state
#   for each line in cities.csv
#     extract city's metro and state
#     if city's metro and state match up with current metro and state
#     

# find all city lines with the given city's metro
# create a set of all states associated with the given metro
# search for metro in metros.csv
# 

with open('cities.csv') as c, open('metros.csv') as m:
  c_lines = c.readlines()
  m_lines = m.readlines()

  count_m = 0
  count_t = 0
  for c_line in c_lines:
    city = c_line.split(';')[0].split(',')[2]
    terms = c_line.split(';')
    state = terms[1].strip()

    if len(terms) < 4:
      city_metro = terms[0].split(',')[2]
      # check city and state
      continue;
    else:
      city_metro = terms[2].strip()    

    city_metro = city_metro.replace('.', '')

    matches = []

    if 'Washington-Arlington-Alexandria' in city_metro:
      continue

    #if '-' in city_metro or '--' in city_metro or '/' in city_metro:
    #  continue

    city_metro_items = set(re.split('\/|--|-', city_metro))

    found = False 
    matches = []
    non_matches = []
    for m_line in m_lines:
      if 'United States' in m_line:
        continue

      metro = m_line.split(',')[2].replace('"', '').replace('.', '')
      metro_state = m_line.split('"')[1].split(', ')[1]

      if ';' in metro_state:
        metro_state = metro_state.split(';')[0]

      metro_items = set(re.split('\/|--|-', metro))

      common = city_metro_items.intersection(metro_items)
      if len(common) > 0 and state == metro_state:
        found = True
        break

      if len(common) > 0 and metro_state in get_neighbors(state):
        matches.append([metro, metro_state])
        continue

      if metro == city_metro:
        non_matches.append([metro, metro_state])


    first_item_matches = [match for match in matches if list(city_metro_items)[0] in match[0]]
    if len(first_item_matches) > 0:
      matches = first_item_matches

    if not found and len(matches) == 0:
      print(city + ',' + state + ' (' + city_metro + '):' + str(matches) + ' ' + str(non_matches))


#with open('cities.csv') as c, open('metros.csv') as m:
#  c_lines = c.readlines()
#  m_lines = m.readlines()
#
#  count_m = 0
#  count_t = 0
#  for c_line in c_lines:
#    city = c_line.split(';')[0].split(',')[2]
#    terms = c_line.split(';')
#    if len(terms) < 3:
#      #print(city + ':' + terms[1])
#      count_t += 1
#      continue
#
#    state = terms[1].strip()
#
#    if len(terms) == 3:
#      city_metro = terms[0].split(',')[2]
#      # check city and state
#    else:
#      city_metro = terms[2].strip()
#    
#
#    choices = re.split('\/|--|-', city_metro)
#
#    matches = []
#
#    if 'Washington-Arlington-Alexandria' in city_metro:
#      matches.append('Washington DC')
#      continue
#
#
#    for m_line in m_lines:
#      if 'United States' in m_line:
#        continue
#
#      metro = m_line.split(',')[2].replace('"', '')
#      metro_state = m_line.split('"')[1].split(', ')[1]
#
#      if ';' in metro_state:
#        metro_state = metro_state.split(';')[0]
#
#      metro_terms = metro.split('-')
#
#      if any([choice in metro_terms for choice in choices]) and (metro_state == state or metro_state in get_neighbors(state)):
#        matches.append([metro, metro_state])
#
#    if len(matches) > 1:
#      in_state = [match for match in matches if match[1] == state]
#      if len(in_state) == 1:
#        matches = in_state
#        #print(city + ',' + state + ' (' + city_metro + '): ' + str(matches))
#        continue
#
#      starts_with = [match for match in matches if match[0].startswith(choices[0])]
#      if len(starts_with) == 1:
#        matches = starts_with
#        #print(city + ',' + state + ' (' + city_metro + '): ' + str(matches))
#        continue
#
#      print(city + ',' + state + ' (' + city_metro + '): ' + str(matches))
#
#    #print(city + ',' + state + ' (' + city_metro + '): ' + str(matches))
#
#  #print('Missing metros: ' + str(count_m) + '/' + str(len(c_lines)))
#  #print('Incorrectly formatted: ' + str(count_t) + '/' + str(len(c_lines)))
