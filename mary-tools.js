// ── Mary tool definitions (extracted from mary.js) ──────────────────────────
const MARY_TOOLS = [
  {
    name: 'get_move_in_lease',
    description: 'Look up a lease and tenant details for a move-in by property address or tenant name. Returns lease ID, tenant names, move-in date, rent, deposit, charges, and lease status.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address or tenant name to search for' }
      },
      required: ['search']
    }
  },
  {
    name: 'get_lease_charges',
    description: 'Get all charges and balance for a specific lease. Shows what has been paid and what is outstanding.',
    input_schema: {
      type: 'object',
      properties: {
        leaseID: { type: 'string', description: 'Rentvine lease ID' }
      },
      required: ['leaseID']
    }
  },
  {
    name: 'get_aptly_movein_card',
    description: 'Get the Move-Ins board card for a tenant or property. Returns card fields including lease verification status, deposit paid checkbox, utilities, insurance, and move-in date.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Tenant name or property address to search for on the Move-Ins board' }
      },
      required: ['search']
    }
  },
  {
    name: 'get_pending_move_ins',
    description: 'Get all upcoming move-ins from the Aptly Move-Ins board. Shows tenants, properties, move-in dates, and status of each step.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days ahead to look. Default 30.' }
      }
    }
  },
  {
    name: 'get_property_fee_setting',
    description: 'Get the management fee setting for a property including the placement/leasing fee amount, monthly management fee, and renewal fee. Use this on move-in day to determine the correct placement fee to bill. Pass the Rentvine property ID.',
    input_schema: {
      type: 'object',
      properties: {
        propertyID: { type: 'string', description: 'Rentvine property ID' },
        search: { type: 'string', description: 'Property address to search for if propertyID is unknown' }
      }
    }
  },
  {
    name: 'check_existing_placement_bill',
    description: 'Check if a placement/leasing fee bill has already been posted to a property in Rentvine. Searches bills for GL account 6112 (Commissions/Placement Fees) for the property. Use before posting a new placement fee bill to avoid duplicates.',
    input_schema: {
      type: 'object',
      properties: {
        propertyID: { type: 'string', description: 'Rentvine property ID' },
        search: { type: 'string', description: 'Property address if propertyID unknown' }
      }
    }
  },
  {
    name: 'get_lease_payments',
    description: 'Get all payments and charges for a lease. Shows move-in funds paid, when they were paid, outstanding balance, and payment history. Use to verify move-in funds received before releasing keys.',
    input_schema: {
      type: 'object',
      properties: {
        leaseID: { type: 'string', description: 'Rentvine lease ID' },
        search: { type: 'string', description: 'Property address or tenant name if leaseID unknown' }
      }
    }
  },
  {
    name: 'post_placement_fee_bill',
    description: 'Post a placement/leasing fee bill to a property in Rentvine. Payee is always Aloe Property Management (contactID 1), GL account 6112. ALWAYS check check_existing_placement_bill first to avoid duplicates. ALWAYS confirm the amount with staff before posting.',
    input_schema: {
      type: 'object',
      properties: {
        propertyID: { type: 'string', description: 'Rentvine property ID' },
        portfolioID: { type: 'string', description: 'Rentvine portfolio ID (ledger owner)' },
        amount: { type: 'number', description: 'Placement fee amount to bill' },
        memo: { type: 'string', description: 'Note explaining the fee (e.g. standard fee, owner-sourced reduction)' },
        date: { type: 'string', description: 'Bill date in YYYY-MM-DD format. Defaults to today.' }
      },
      required: ['propertyID', 'portfolioID', 'amount']
    }
  }
];

module.exports = { MARY_TOOLS };
