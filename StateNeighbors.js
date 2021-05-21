/** 
 * List of objects containing each state and its respective neighbors. 
 * Not strictly accurate - includes special cases like treating WV and DC
 * as neighbors, given their proximity.
 */
const STATE_NEIGHBORS = [
  {
    "state": "AK",
    "neighbors": [ ]
  },
  {
    "state": "AL",
    "neighbors": [ "FL", "GA", "MS", "TN" ]
  },
  {
    "state": "AR",
    "neighbors": [ "LA", "MO", "MS", "OK", "TN", "TX" ]
  },
  {
    "state": "AZ",
    "neighbors": [ "CA", "CO", "NM", "NV", "UT" ]
  },
  {
    "state": "CA",
    "neighbors": [ "AZ", "NV", "OR" ]
  },
  {
    "state": "CO",
    "neighbors": [ "AZ", "KS", "NE", "NM", "OK", "UT", "WY" ]
  },
  {
    "state": "CT",
    "neighbors": [ "MA", "NY", "RI" ]
  },
  {
    "state": "DC",
    "neighbors": [ "MD", "VA", "WV" ]
  },
  {
    "state": "DE",
    "neighbors": [ "MD", "NJ", "PA" ]
  },
  {
    "state": "FL",
    "neighbors": [ "AL", "GA" ]
  },
  {
    "state": "GA",
    "neighbors": [ "AL", "FL", "NC", "SC", "TN" ]
  },
  {
    "state": "HI",
    "neighbors": [ ]
  },
  {
    "state": "IA",
    "neighbors": [ "IL", "MN", "MO", "NE", "SD", "WI" ]
  },
  {
    "state": "ID",
    "neighbors": [ "MT", "NV", "OR", "UT", "WA", "WY" ]
  },
  {
    "state": "IL",
    "neighbors": [ "IA", "IN", "KY", "MO", "WI" ]
  },
  {
    "state": "IN",
    "neighbors": [ "IL", "KY", "MO", "OH", "WI" ]
  },
  {
    "state": "KS",
    "neighbors": [ "CO", "MO", "NE", "OK" ]
  },
  {
    "state": "KY",
    "neighbors": [ "IL", "IN", "MO", "OH", "TN", "VA", "WV" ]
  },
  {
    "state": "LA",
    "neighbors": [ "AR", "MS", "TX" ]
  },
  {
    "state": "MA",
    "neighbors": [ "CT", "NH", "NY", "RI", "VT" ]
  },
  {
    "state": "MD",
    "neighbors": [ "DC", "DE", "PA", "VA", "WV" ]
  },
  {
    "state": "ME",
    "neighbors": [ "NH" ]
  },
  {
    "state": "MI",
    "neighbors": [ "IN", "OH", "WI" ]
  },
  {
    "state": "MN",
    "neighbors": [ "IA", "ND", "SD", "WI" ]
  },
  {
    "state": "MO",
    "neighbors": [ "AR", "IA", "IL", "KS", "KY", "NE", "OK", "TN" ]
  },
  {
    "state": "MS",
    "neighbors": [ "AL", "AR", "LA", "TN" ]
  },
  {
    "state": "MT",
    "neighbors": [ "ID", "ND", "SD", "WY" ]
  },
  {
    "state": "NC",
    "neighbors": [ "GA", "SC", "TN", "VA" ]
  },
  {
    "state": "ND",
    "neighbors": [ "MN", "MT", "SD" ]
  },
  {
    "state": "NE",
    "neighbors": [ "CO", "IA", "KS", "MO", "SD", "WY" ]
  },
  {
    "state": "NH",
    "neighbors": [ "MA", "ME", "VT" ]
  },
  {
    "state": "NJ",
    "neighbors": [ "DE", "NY", "PA" ]
  },
  {
    "state": "NM",
    "neighbors": [ "AZ", "CO", "OK", "TX", "UT" ]
  },
  {
    "state": "NV",
    "neighbors": [ "AZ", "CA", "ID", "OR", "UT" ]
  },
  {
    "state": "NY",
    "neighbors": [ "CT", "MA", "NJ", "PA", "VT" ]
  },
  {
    "state": "OH",
    "neighbors": [ "IN", "KY", "MI", "PA", "WV" ]
  },
  {
    "state": "OK",
    "neighbors": [ "AR", "CO", "KS", "MO", "NM", "TX" ]
  },
  {
    "state": "OR",
    "neighbors": [ "CA", "ID", "NV", "WA" ]
  },
  {
    "state": "PA",
    "neighbors": [ "DE", "MD", "NJ", "NY", "OH", "WV" ]
  },
  {
    "state": "RI",
    "neighbors": [ "CT", "MA" ]
  },
  {
    "state": "SC",
    "neighbors": [ "GA", "NC" ]
  },
  {
    "state": "SD",
    "neighbors": [ "IA", "MN", "MT", "ND", "NE", "WY" ]
  },
  {
    "state": "TN",
    "neighbors": [ "AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA" ]
  },
  {
    "state": "TX",
    "neighbors": [ "AR", "LA", "NM", "OK" ]
  },
  {
    "state": "UT",
    "neighbors": [ "AZ", "CO", "ID", "NM", "NV", "WY" ]
  },
  {
    "state": "VA",
    "neighbors": [ "DC", "KY", "MD", "NC", "TN", "WV" ]
  },
  {
    "state": "VT",
    "neighbors": [ "MA", "NH", "NY" ]
  },
  {
    "state": "WA",
    "neighbors": [ "ID", "OR" ]
  },
  {
    "state": "WI",
    "neighbors": [ "IA", "IL", "MI", "MN" ]
  },
  {
    "state": "WV",
    "neighbors": [ "DC", "KY", "MD", "OH", "PA", "VA" ]
  },
  {
    "state": "WY",
    "neighbors": [ "CO", "ID", "MT", "NE", "SD", "UT" ]
  }
];
