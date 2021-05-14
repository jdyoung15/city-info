
""" Returns whether any of the given lines contains any of the given string choices AND contains the given state. """
def lines_contain(lines, choices, state):
  for line in lines:
    if line_contains_state(line, choices, state):
      return True 
  return False

""" Returns whether the given line contains any of the given string choices AND contains the given state. """
def line_contains_state(line, choices, state):
  return any([choice in line for choice in choices]) and state in line

""" Returns whether the given line contains any of the given string choices. """
def line_contains(line, choices):
  return any([choice in line for choice in choices])

with open('cities.csv') as c, open('metros.csv') as m:
  c_lines = c.readlines()
  m_lines = m.readlines()

  count_m = 0
  count_t = 0
  for c_line in c_lines:
    terms = c_line.split(';')
    if len(terms) < 3:
      #print(terms)
      count_t += 1
      continue

    state = terms[1].strip()
    choices = terms[2].strip().split('-')

    # If one of the metro choices is 'Roanoke City', we should also consider 'Roanoke'
    city = [choice.split(' ')[0] for choice in choices if 'City' in choice]
    choices = choices + city

    #metro = c_line.split(';')[2].strip().split('-')[0]
    if not lines_contain(m_lines, choices, state) and not line_contains(c_line, ['Parish']) and not line_contains(c_line, ['County']) and not line_contains(c_line, ['Borough']):
    #if not lines_contain(m_lines, choices):
      print(choices)
      count_m += 1

  print('Missing metros: ' + str(count_m) + '/' + str(len(c_lines)))
  print('Incorrectly formatted: ' + str(count_t) + '/' + str(len(c_lines)))
