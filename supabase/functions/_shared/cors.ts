export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  // x-farmer-token carries the portal session. Leaving it out of this list does
  // not produce a 401 -- the browser refuses to send the request at all after
  // the preflight, and the farmer sees "Failed to fetch" with nothing in the
  // function logs but an OPTIONS. Every header the client sets has to be named
  // here or it silently fails.
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-farmer-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
