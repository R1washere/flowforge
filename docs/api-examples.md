# API Examples

These examples assume the API is running locally on `http://localhost:4200/api`
after `pnpm dev`. Most application endpoints use the demo auth guard; pass
`x-flowforge-user-email` to review the API as a seeded user.

## Check Health

```bash
curl http://localhost:4200/api/health
```

## List Workflows

```bash
curl http://localhost:4200/api/workflows \
  -H "x-flowforge-user-email: demo@flowforge.dev"
```

## Create A Workflow

```bash
curl -X POST http://localhost:4200/api/workflows \
  -H "content-type: application/json" \
  -H "x-flowforge-user-email: demo@flowforge.dev" \
  -d '{
    "name": "Escalate overdue invoice",
    "slug": "escalate-overdue-invoice",
    "description": "Create a support task when an invoice stays unpaid.",
    "status": "active",
    "triggerType": "webhook",
    "retryLimit": 2,
    "timeoutSeconds": 30,
    "steps": [
      {
        "type": "condition",
        "name": "Invoice is overdue",
        "config": {
          "field": "invoiceStatus",
          "operator": "equals",
          "value": "overdue"
        }
      },
      {
        "type": "action",
        "name": "Create escalation task",
        "config": {
          "assignee": "ops-team",
          "priority": "high"
        }
      }
    ]
  }'
```

## Execute A Workflow Manually

```bash
curl -X POST http://localhost:4200/api/workflows/customer-onboarding/execute \
  -H "content-type: application/json" \
  -H "x-flowforge-user-email: demo@flowforge.dev" \
  -d '{
    "input": {
      "customerId": "cus_demo_123",
      "plan": "growth"
    }
  }'
```

## Trigger A Webhook Workflow

Use the seeded webhook path and secret from the local demo data.

```bash
curl -X POST http://localhost:4200/api/webhooks/customer-onboarding \
  -H "content-type: application/json" \
  -H "x-flowforge-secret: whsec_demo_customer_onboarding" \
  -d '{
    "customerId": "cus_demo_123",
    "email": "customer@example.com"
  }'
```

## Review Execution And Audit History

```bash
curl http://localhost:4200/api/executions \
  -H "x-flowforge-user-email: demo@flowforge.dev"

curl http://localhost:4200/api/audit \
  -H "x-flowforge-user-email: demo@flowforge.dev"
```
