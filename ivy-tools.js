// ── Ivy tool definitions (extracted from ivy.js) ────────────────────────────
const IVY_TOOLS = [
  {
    name: 'search_vacant_units',
    description: 'Search for vacant/available rental units. Filter by max rent, city, beds, or amenities like pool. Returns address, rent, beds, baths, sqft, available date, and pet policy.',
    input_schema: {
      type: 'object',
      properties: {
        maxRent: { type: 'number', description: 'Maximum monthly rent' },
        minRent: { type: 'number', description: 'Minimum monthly rent' },
        city: { type: 'string', description: 'City name to filter by (e.g. Gilbert, Chandler, Scottsdale)' },
        beds: { type: 'number', description: 'Number of bedrooms' },
        search: { type: 'string', description: 'General search term for address or property name' }
      }
    }
  },
  {
    name: 'get_property_details',
    description: 'Get full details for a specific property including availability date, occupancy status (vacant/tenant/owner-occupied), lease end date, rent, beds/baths, and amenities.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address to search for' }
      },
      required: ['search']
    }
  },
  {
    name: 'get_available_properties',
    description: 'Get all currently vacant and available properties with their details. Use when someone asks what homes are available or coming available soon.',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Optional city filter' },
        maxRent: { type: 'number', description: 'Optional maximum rent filter' }
      }
    }
  },
  {
    name: 'get_aptly_listing',
    description: 'Get the full Aptly listing for a property including marketing description, appliances, utilities included, pool, HOA info, parking, pet policy, lockbox info, virtual tour, and application URL. Use this when someone asks about appliances, what is included, utilities, amenities, or any property-specific details.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address to search for' }
      },
      required: ['search']
    }
  },
  {
    name: 'get_showing_history',
    description: 'Get showing history for a property — all prospects who toured or scheduled a tour, with timestamps, outcomes (attended/no-show/cancelled/rescheduled), and current stage. Use when asked about showings, tours, or who has visited a property.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address to search for showing history' }
      },
      required: ['search']
    }
  },
  {
    name: 'get_leads_by_property',
    description: 'Get all active leads (prospects) for a property from the Aptly Renter Leads board. Shows prospect name, current stage, last action, and contact info. Use to see who is interested in a property or to identify who to follow up with.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address to find leads for' },
        stage: { type: 'string', description: 'Optional stage filter: Nurturing, Engaged, Scheduled Tour, Tour Completed, Applied' }
      },
      required: ['search']
    }
  },
  {
    name: 'send_followup_sms',
    description: 'Send a follow-up SMS to a prospect via Quo. Use after showings, to re-engage cold leads, or when staff asks Ivy to reach out. Always confirm the message content before sending.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone number to send to' },
        message: { type: 'string', description: 'SMS message content' }
      },
      required: ['to', 'message']
    }
  }
];

module.exports = { IVY_TOOLS };
