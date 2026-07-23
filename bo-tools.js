// ── Bo tool definitions (extracted from bo.js) ────────────────────────────
const BO_TOOLS = [
  {
    name: 'get_todays_settlements',
    description: 'Get payments that settled today or on a specific date. Use to answer questions about late rent payments that cleared, who settled, and owner payout amounts.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today if not provided.' }
      }
    }
  },
  {
    name: 'get_unpaid_bills',
    description: 'Get all unpaid owner expense bills from Rentvine, grouped by property. Excludes Aloe fee accounts.',
    input_schema: {
      type: 'object',
      properties: {
        propertyID: { type: 'string', description: 'Optional — filter by specific property ID' }
      }
    }
  },
  {
    name: 'get_lease_charges',
    description: 'Get unpaid charges for a specific lease to check if tenant is past due.',
    input_schema: {
      type: 'object',
      properties: {
        leaseID: { type: 'string', description: 'Rentvine lease ID' }
      },
      required: ['leaseID']
    }
  },
  {
    name: 'get_owner_payout_summary',
    description: 'Calculate which owners are ready to be paid out based on late rent that has settled today. Shows owner net after management fee and unpaid bills.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today.' }
      }
    }
  },
  {
    name: 'get_bills_by_property',
    description: 'Get all unpaid bills for a specific property address or property ID.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address to search for' }
      },
      required: ['search']
    }
  },
  {
    name: 'get_tenant_ledger',
    description: 'Get the full accounting ledger for a tenant or lease.',
    input_schema: {
      type: 'object',
      properties: {
        leaseID: { type: 'string', description: 'Rentvine lease ID' }
      },
      required: ['leaseID']
    }
  }
  ,{
    name: "get_posted_payments",
    description: "Get lease payments posted in Rentvine by date range. Use this when settlement report returns no results.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" }
      }
    }
  }
  ,
  {
    name: "get_paid_bills_by_vendor",
    description: "Get historical paid bills filtered by vendor contact ID. Use for check register lookups, expense log reconciliation, or payment history for a specific vendor like Aloe Reimbursements (contactID 3229) or management income (contactIDs 1 or 3380). Includes date range filtering.",
    input_schema: {
      type: "object",
      properties: {
        contactID: { type: "string", description: "Rentvine contact/vendor ID. 3229=Aloe Reimbursements, 1=Aloe PM, 3380=Aloe PM-Vendor" },
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" }
      }
    }
  },
  {
    name: "get_check_register",
    description: "Pull the check register from Rentvine — all payments made out of the trust account for a date range. Use for bank reconciliation, owner payment verification, or auditing vendor payments.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" },
        propertyID: { type: "string", description: "Optional — filter by property" }
      }
    }
  },
  {
    name: "get_deposit_register",
    description: "Pull the deposit/receipt register from Rentvine — all money received into the trust account for a date range. Use for bank reconciliation or confirming rent deposits.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" },
        propertyID: { type: "string", description: "Optional — filter by property" }
      }
    }
  },
  {
    name: "get_owner_ledger",
    description: "Pull the owner ledger from Rentvine for a specific owner or property — shows all charges, payments, and draws. Use for owner statement prep or reconciliation.",
    input_schema: {
      type: "object",
      properties: {
        ownerID: { type: "string", description: "Rentvine owner contact ID" },
        propertyID: { type: "string", description: "Optional — filter by property" },
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" }
      }
    }
  },
  {
    name: "run_accounting_report",
    description: "Run any Rentvine accounting report by name. Report names: payables, checks, receipts, ownerLedger, tenantLedger, trialBalance, managementFees. Use when a specific report is needed that other tools do not cover.",
    input_schema: {
      type: "object",
      properties: {
        reportName: { type: "string", description: "Rentvine report route name" },
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" },
        contactID: { type: "string", description: "Optional vendor/contact filter" },
        propertyID: { type: "string", description: "Optional property filter" }
      },
      required: ["reportName"]
    }
  }
];

module.exports = { BO_TOOLS };
